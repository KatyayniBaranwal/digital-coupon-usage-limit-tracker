import { HashMap } from '../structures/HashMap.js';
import { Deque } from '../structures/Deque.js';
import { buildSampleCoupons, buildSampleHistory } from '../data/sampleData.js';
import {
  DEFAULT_HISTORY_CAPACITY,
  MIN_HISTORY_CAPACITY,
  MAX_HISTORY_CAPACITY,
} from '../data/constants.js';
import { toDateKey, round2 } from './dates.js';
import { normalizeCode, validateCoupon } from './validators.js';
import { getDefaultStorage } from './storage.js';

const STORAGE_KEY = 'coupon-tracker:v1';
const LOG_LIMIT = 16;

/** Status is derived, never stored: expired > exhausted > active. */
export function getCouponStatus(coupon, now = new Date()) {
  if (coupon.expiryDate < toDateKey(now)) return 'expired';
  if (coupon.usedCount >= coupon.maxUsage) return 'exhausted';
  return 'active';
}

const toCoupon = (v, extra = {}) => ({
  name: String(v.name).trim(),
  discountPercent: Number(v.discountPercent),
  maxUsage: Number(v.maxUsage),
  expiryDate: v.expiryDate,
  category: v.category,
  description: String(v.description).trim(),
  ...extra,
});

/**
 * CouponStore - all business logic, no React.
 *   coupons : HashMap  (coupon code -> coupon)            O(1) lookups
 *   history : Deque    (most recent successful applies)   O(1) at both ends
 * The UI subscribes to it with useSyncExternalStore (see useCouponStore.js).
 */
export class CouponStore {
  constructor(storage = getDefaultStorage()) {
    this.storage = storage;
    this.coupons = new HashMap();
    this.history = new Deque(DEFAULT_HISTORY_CAPACITY);
    this.historyCapacity = DEFAULT_HISTORY_CAPACITY;
    this.nextId = 1;
    this.lastApply = null; // { entered, evicted } - shown on the DSA page
    this.dsaLog = []; // in-memory log of data-structure operations
    this._version = 0;
    this._listeners = new Set();
    this._load();
  }

  /* ---------- subscription (React) ---------- */
  subscribe = (listener) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  getVersion = () => this._version;

  _notify() {
    this._version++;
    this._persist();
    this._listeners.forEach((fn) => fn());
  }

  /* ---------- persistence ---------- */
  _persist() {
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          coupons: this.coupons.values(),
          history: this.history.toArray(),
          capacity: this.historyCapacity,
          nextId: this.nextId,
          lastApply: this.lastApply,
        })
      );
    } catch {
      /* storage full or unavailable - app keeps working in memory */
    }
  }

  storageSize() {
    try {
      return (this.storage.getItem(STORAGE_KEY) || '').length;
    } catch {
      return 0;
    }
  }

  _load() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 1 && Array.isArray(d.coupons) && Array.isArray(d.history)) {
          this.coupons = new HashMap();
          d.coupons.forEach((c) => this.coupons.insert(c.code, c));
          const cap = Number.isInteger(d.capacity) ? d.capacity : DEFAULT_HISTORY_CAPACITY;
          this.historyCapacity = Math.min(MAX_HISTORY_CAPACITY, Math.max(MIN_HISTORY_CAPACITY, cap));
          this.history = new Deque(this.historyCapacity);
          d.history.forEach((r) => this.history.addRear(r));
          const maxId = d.history.reduce((m, r) => Math.max(m, r.id || 0), 0);
          this.nextId = Math.max(Number(d.nextId) || 1, maxId + 1);
          this.lastApply = d.lastApply || null;
          return;
        }
      }
    } catch {
      /* corrupted data - fall back to demo data */
    }
    this._seed();
    this._persist();
  }

  _seed() {
    const now = new Date();
    this.coupons = new HashMap();
    const list = buildSampleCoupons(now);
    list.forEach((c) => this.coupons.insert(c.code, c));
    this.historyCapacity = DEFAULT_HISTORY_CAPACITY;
    this.history = new Deque(this.historyCapacity);
    const records = buildSampleHistory(list, now);
    records.forEach((r) => this.history.addRear(r));
    this.nextId = records.length + 1;
    this.lastApply = null;
    this.dsaLog = [];
  }

  _log(structure, op, detail) {
    this.dsaLog.unshift({ id: `${Date.now()}-${Math.random()}`, time: new Date().toISOString(), structure, op, detail });
    if (this.dsaLog.length > LOG_LIMIT) this.dsaLog.length = LOG_LIMIT;
  }

  /* ---------- reads ---------- */
  listCoupons() {
    return this.coupons.values();
  }

  /** Latest application first. Backed by the Deque (front = oldest, rear = newest). */
  listHistory() {
    return this.history.toArray().reverse();
  }

  /** UI preview - does not touch counters or the log. */
  previewCoupon(rawCode) {
    const code = normalizeCode(rawCode);
    return code ? this.coupons.peek(code) : undefined;
  }

  /** Real HashMap search (counted + logged) - used by the DSA lab. */
  searchCoupon(rawCode) {
    const code = normalizeCode(rawCode);
    const found = this.coupons.search(code);
    this._log(
      'HashMap',
      'search',
      `search("${code}") -> bucket #${this.coupons.bucketIndex(code)}, ${found ? 'HIT' : 'MISS'}`
    );
    this._notify();
    return found;
  }

  computeStats() {
    let active = 0;
    let expired = 0;
    let exhausted = 0;
    let applications = 0;
    let remaining = 0;
    const list = this.coupons.values();
    list.forEach((c) => {
      const s = getCouponStatus(c);
      if (s === 'active') {
        active++;
        remaining += c.maxUsage - c.usedCount;
      } else if (s === 'expired') expired++;
      else exhausted++;
      applications += c.usedCount;
    });
    return { total: list.length, active, expired, exhausted, applications, remaining };
  }

  /* ---------- coupon CRUD ---------- */
  addCoupon(values) {
    const errors = validateCoupon(values, { codeExists: (c) => this.coupons.has(c) });
    if (Object.keys(errors).length) return { ok: false, errors };
    const code = normalizeCode(values.code);
    const coupon = toCoupon(values, { code, usedCount: 0, createdAt: new Date().toISOString() });
    if (!this.coupons.insert(code, coupon)) {
      return { ok: false, errors: { code: 'This coupon code already exists.' } };
    }
    this._log('HashMap', 'insert', `insert("${code}") -> bucket #${this.coupons.bucketIndex(code)}`);
    this._notify();
    return { ok: true, coupon };
  }

  updateCoupon(rawCode, values) {
    const code = normalizeCode(rawCode);
    const existing = this.coupons.search(code);
    if (!existing) return { ok: false, errors: {}, message: `Coupon ${code} no longer exists.` };
    const errors = validateCoupon(values, { isEdit: true, usedCount: existing.usedCount });
    if (Object.keys(errors).length) return { ok: false, errors };
    const coupon = toCoupon(values, {
      code,
      usedCount: existing.usedCount,
      createdAt: existing.createdAt,
    });
    this.coupons.update(code, coupon);
    this._log('HashMap', 'update', `update("${code}") -> bucket #${this.coupons.bucketIndex(code)}`);
    this._notify();
    return { ok: true, coupon };
  }

  deleteCoupon(rawCode) {
    const code = normalizeCode(rawCode);
    const removed = this.coupons.delete(code);
    if (removed) {
      this._log('HashMap', 'delete', `delete("${code}") -> removed from bucket #${this.coupons.bucketIndex(code)}`);
      this._notify();
    }
    return removed;
  }

  /* ---------- applying a coupon ---------- */
  /**
   * Validate a code against the HashMap and, if valid, consume one use and push
   * a record onto the rear of the history Deque. Failed attempts change nothing.
   */
  applyCoupon(rawCode, rawAmount) {
    const code = normalizeCode(rawCode);
    const amount = Number(rawAmount);

    if (!code) return { ok: false, reason: 'empty_code', message: 'Please enter a coupon code.', steps: [] };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: 'bad_amount', message: 'Enter a purchase amount greater than 0.', steps: [] };
    }

    // Step 1: existence - O(1) HashMap lookup (never an array scan)
    const coupon = this.coupons.search(code);
    const steps = [
      { key: 'exists', label: 'Coupon exists in the HashMap', status: 'pending' },
      { key: 'expiry', label: 'Coupon has not expired', status: 'pending' },
      { key: 'limit', label: 'Usage limit not reached', status: 'pending' },
      { key: 'valid', label: 'Coupon is valid - apply it', status: 'pending' },
    ];
    const fail = (index, reason, message) => {
      steps[index].status = 'fail';
      for (let i = index + 1; i < steps.length; i++) steps[i].status = 'skipped';
      this._log('HashMap', 'search', `search("${code}") -> ${coupon ? 'HIT' : 'MISS'}; apply rejected (${reason})`);
      this._notify();
      return { ok: false, reason, message, steps, coupon };
    };

    if (!coupon) return fail(0, 'not_found', `Coupon "${code}" does not exist.`);
    steps[0].status = 'pass';

    // Step 2: expiry
    const status = getCouponStatus(coupon);
    if (coupon.expiryDate < toDateKey(new Date())) {
      return fail(1, 'expired', `Coupon ${code} has expired and can no longer be used.`);
    }
    steps[1].status = 'pass';

    // Step 3: usage limit
    if (coupon.usedCount >= coupon.maxUsage || status === 'exhausted') {
      return fail(2, 'exhausted', `Coupon ${code} has reached its maximum usage limit (${coupon.maxUsage}/${coupon.maxUsage}).`);
    }
    steps[2].status = 'pass';
    steps[3].status = 'pass';

    // Success: consume one use (HashMap update) and record it (Deque addRear)
    const updated = { ...coupon, usedCount: coupon.usedCount + 1 };
    this.coupons.update(code, updated);

    const discountAmount = round2((amount * updated.discountPercent) / 100);
    const record = {
      id: this.nextId++,
      code,
      name: updated.name,
      discountPercent: updated.discountPercent,
      category: updated.category,
      appliedAt: new Date().toISOString(),
      usageNumber: updated.usedCount,
      status: 'Applied',
      purchaseAmount: amount,
      discountAmount,
      finalAmount: round2(amount - discountAmount),
    };
    const evicted = this.history.addRear(record);

    this.lastApply = { entered: record, evicted };
    this._log('HashMap', 'update', `search("${code}") HIT -> usedCount ${coupon.usedCount} -> ${updated.usedCount}`);
    this._log('Deque', 'addRear', `addRear(${code} #${record.usageNumber}) -> size ${this.history.size()}/${this.history.capacity()}`);
    if (evicted) {
      this._log('Deque', 'removeFront', `history full -> removeFront() evicted ${evicted.code} #${evicted.usageNumber}`);
    }
    this._notify();

    return {
      ok: true,
      message: `Coupon ${code} applied successfully!`,
      steps,
      coupon: updated,
      record,
      discountAmount,
      finalAmount: record.finalAmount,
      remaining: updated.maxUsage - updated.usedCount,
      evicted,
    };
  }

  /* ---------- settings / destructive actions ---------- */
  clearHistory() {
    this.history.clear();
    this.lastApply = null;
    this._log('Deque', 'clear', 'clear() -> history emptied');
    this._notify();
  }

  setHistoryCapacity(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < MIN_HISTORY_CAPACITY || n > MAX_HISTORY_CAPACITY) {
      return { ok: false, message: `Capacity must be a whole number from ${MIN_HISTORY_CAPACITY} to ${MAX_HISTORY_CAPACITY}.` };
    }
    const dropped = this.history.resize(n);
    this.historyCapacity = n;
    this._log('Deque', 'resize', `resize(${n}) -> ${dropped.length} oldest record(s) dropped from the front`);
    this._notify();
    return { ok: true, dropped: dropped.length };
  }

  resetDemoData() {
    this._seed();
    this._log('HashMap', 'reset', `demo data restored -> ${this.coupons.size} coupons`);
    this._notify();
  }
}

// Run with: npm test   (plain Node, no dependencies)
import assert from 'node:assert/strict';
import { HashMap } from '../src/structures/HashMap.js';
import { Deque } from '../src/structures/Deque.js';
import { CouponStore, getCouponStatus } from '../src/utils/couponStore.js';
import { createMemoryStorage } from '../src/utils/storage.js';
import { validateCoupon } from '../src/utils/validators.js';
import { dateKeyPlus } from '../src/utils/dates.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}\n      ${e.message}`);
    process.exitCode = 1;
  }
};

console.log('HashMap');
test('insert / search / has / update / delete', () => {
  const m = new HashMap();
  assert.equal(m.insert('A', { n: 1 }), true);
  assert.equal(m.insert('A', { n: 2 }), false, 'duplicate keys rejected');
  assert.deepEqual(m.search('A'), { n: 1 });
  assert.equal(m.search('Z'), undefined);
  assert.equal(m.has('A'), true);
  assert.equal(m.update('A', { n: 3 }), true);
  assert.equal(m.update('Z', {}), false);
  assert.deepEqual(m.search('A'), { n: 3 });
  assert.equal(m.delete('A'), true);
  assert.equal(m.delete('A'), false);
  assert.equal(m.size, 0);
});
test('bucket illustration is deterministic and covers every key', () => {
  const m = new HashMap(8);
  ['SAVE10', 'TECH30', 'SHOP20', 'X'].forEach((k) => m.insert(k, 1));
  assert.equal(m.bucketIndex('SAVE10'), m.bucketIndex('SAVE10'));
  assert.equal(m.buckets().flat().length, 4);
});

console.log('Deque');
test('all eight operations', () => {
  const d = new Deque(4);
  assert.equal(d.isEmpty(), true);
  d.addRear(2);
  d.addRear(3);
  d.addFront(1);
  assert.deepEqual(d.toArray(), [1, 2, 3]);
  assert.equal(d.peekFront(), 1);
  assert.equal(d.peekRear(), 3);
  assert.equal(d.size(), 3);
  assert.equal(d.removeFront(), 1);
  assert.equal(d.removeRear(), 3);
  assert.deepEqual(d.toArray(), [2]);
  assert.equal(d.removeFront(), 2);
  assert.equal(d.removeFront(), undefined);
  assert.equal(d.removeRear(), undefined);
  assert.equal(d.peekFront(), undefined);
});
test('addRear on a full deque evicts the front (oldest) item', () => {
  const d = new Deque(3);
  [1, 2, 3].forEach((x) => d.addRear(x));
  assert.equal(d.addRear(4), 1);
  assert.equal(d.addRear(5), 2);
  assert.deepEqual(d.toArray(), [3, 4, 5]);
});
test('addFront on a full deque evicts the rear item', () => {
  const d = new Deque(3);
  [1, 2, 3].forEach((x) => d.addRear(x));
  assert.equal(d.addFront(0), 3);
  assert.deepEqual(d.toArray(), [0, 1, 2]);
});
test('circular wrap-around stays correct over many operations', () => {
  const d = new Deque(5);
  const model = [];
  for (let i = 0; i < 200; i++) {
    const r = i % 7;
    if (r < 3) {
      const ev = d.addRear(i);
      model.push(i);
      if (model.length > 5) assert.equal(ev, model.shift());
    } else if (r < 5) {
      const ev = d.addFront(i);
      model.unshift(i);
      if (model.length > 5) assert.equal(ev, model.pop());
    } else if (r === 5) assert.equal(d.removeFront(), model.shift());
    else assert.equal(d.removeRear(), model.pop());
    assert.deepEqual(d.toArray(), model);
  }
});
test('resize drops the oldest items and clear empties', () => {
  const d = new Deque(5);
  [1, 2, 3, 4, 5].forEach((x) => d.addRear(x));
  assert.deepEqual(d.resize(3), [1, 2]);
  assert.deepEqual(d.toArray(), [3, 4, 5]);
  assert.equal(d.capacity(), 3);
  d.clear();
  assert.equal(d.isEmpty(), true);
  assert.throws(() => new Deque(0));
});

console.log('CouponStore');
const fresh = () => new CouponStore(createMemoryStorage());

test('seed data has active, expired and exhausted coupons (HashMap-backed)', () => {
  const s = fresh();
  const st = s.computeStats();
  assert.ok(st.total >= 8);
  assert.ok(st.active > 0 && st.expired > 0 && st.exhausted > 0);
  assert.equal(s.coupons.size, st.total);
  assert.ok(s.coupons.has('SAVE10') && s.coupons.has('SUMMER50') && s.coupons.has('TECH30'));
});
test('valid coupon: usage +1, discount math, Deque rear gets the record', () => {
  const s = fresh();
  const before = s.coupons.peek('SAVE10').usedCount;
  const r = s.applyCoupon('  save10 ', 2000);
  assert.equal(r.ok, true);
  assert.equal(r.discountAmount, 200);
  assert.equal(r.finalAmount, 1800);
  assert.equal(s.coupons.peek('SAVE10').usedCount, before + 1);
  assert.equal(r.remaining, 100 - (before + 1));
  assert.equal(s.history.peekRear().code, 'SAVE10');
  assert.equal(s.listHistory()[0].code, 'SAVE10', 'latest first');
});
test('failed applications change nothing', () => {
  const s = fresh();
  const hist = s.history.size();
  const used = s.computeStats().applications;
  for (const [code, reason] of [['NOPE', 'not_found'], ['SUMMER50', 'expired'], ['TECH30', 'exhausted']]) {
    const r = s.applyCoupon(code, 1000);
    assert.equal(r.ok, false);
    assert.equal(r.reason, reason);
  }
  assert.equal(s.applyCoupon('SAVE10', 0).reason, 'bad_amount');
  assert.equal(s.applyCoupon('', 100).reason, 'empty_code');
  assert.equal(s.history.size(), hist);
  assert.equal(s.computeStats().applications, used);
});
test('usage limit is never exceeded (SHOP20 has 1 use left)', () => {
  const s = fresh();
  const results = Array.from({ length: 5 }, () => s.applyCoupon('SHOP20', 500));
  assert.equal(results.filter((r) => r.ok).length, 1);
  const c = s.coupons.peek('SHOP20');
  assert.equal(c.usedCount, c.maxUsage);
  assert.equal(getCouponStatus(c), 'exhausted');
});
test('history never exceeds capacity; oldest is evicted from the front', () => {
  const s = fresh();
  s.setHistoryCapacity(5);
  const firstBefore = s.history.peekFront();
  s.applyCoupon('NEWUSER10', 100);
  assert.equal(s.history.size(), 5);
  assert.notDeepEqual(s.history.peekFront(), firstBefore);
  assert.equal(s.lastApply.evicted.id, firstBefore.id);
});
test('add / edit / delete coupon with validation', () => {
  const s = fresh();
  const good = {
    code: 'test99', name: 'Test', discountPercent: '15', maxUsage: '3',
    expiryDate: dateKeyPlus(10), category: 'Travel', description: 'A test coupon',
  };
  assert.equal(s.addCoupon(good).ok, true);
  assert.equal(s.coupons.has('TEST99'), true);
  assert.equal(s.addCoupon(good).ok, false, 'duplicate code rejected');
  assert.equal(s.addCoupon({ ...good, code: 'x y', discountPercent: '0' }).ok, false);
  s.applyCoupon('TEST99', 100);
  s.applyCoupon('TEST99', 100);
  assert.equal(s.updateCoupon('TEST99', { ...good, maxUsage: '1' }).ok, false, 'max below usage rejected');
  assert.equal(s.updateCoupon('TEST99', { ...good, name: 'Renamed', maxUsage: '5' }).ok, true);
  assert.equal(s.coupons.peek('TEST99').name, 'Renamed');
  assert.equal(s.coupons.peek('TEST99').usedCount, 2, 'edit keeps usage count');
  assert.equal(s.deleteCoupon('TEST99'), true);
  assert.equal(s.coupons.has('TEST99'), false);
  assert.equal(s.deleteCoupon('TEST99'), false);
});
test('data persists across a "refresh" (new store, same storage)', () => {
  const storage = createMemoryStorage();
  const a = new CouponStore(storage);
  a.applyCoupon('FASHION40', 1000);
  a.setHistoryCapacity(7);
  const b = new CouponStore(storage);
  assert.equal(b.coupons.peek('FASHION40').usedCount, a.coupons.peek('FASHION40').usedCount);
  assert.equal(b.history.size(), a.history.size());
  assert.equal(b.history.capacity(), 7);
  assert.equal(b.history.peekRear().code, 'FASHION40');
});
test('clear history and reset demo data', () => {
  const s = fresh();
  s.clearHistory();
  assert.equal(s.history.isEmpty(), true);
  s.deleteCoupon('SAVE10');
  s.resetDemoData();
  assert.equal(s.coupons.has('SAVE10'), true);
  assert.ok(s.history.size() > 0);
});
test('capacity validation', () => {
  const s = fresh();
  assert.equal(s.setHistoryCapacity(2).ok, false);
  assert.equal(s.setHistoryCapacity('abc').ok, false);
  assert.equal(s.setHistoryCapacity(50).ok, true);
});
test('validateCoupon flags every bad field', () => {
  const errs = validateCoupon({ code: '', name: '', discountPercent: '', maxUsage: '', expiryDate: '', category: '', description: '' });
  assert.deepEqual(Object.keys(errs).sort(), ['category', 'code', 'description', 'discountPercent', 'expiryDate', 'maxUsage', 'name']);
});

console.log(`\n${passed} tests passed${process.exitCode ? ' (with failures above)' : ''}`);

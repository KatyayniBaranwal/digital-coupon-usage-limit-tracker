/**
 * HashMap - coupon storage
 * ------------------------------------------------------------------
 * Every coupon in the application lives inside this structure, keyed by its
 * unique coupon code (e.g. "SAVE10").
 *
 * Under the hood this class wraps the JavaScript `Map`, which is a hash table:
 *   1. the key is run through a hash function,
 *   2. the hash picks a slot (bucket),
 *   3. the value is read from / written to that slot.
 * That is why insert, search, update, delete and has() are all O(1) on average,
 * no matter how many coupons exist (an array .find() would be O(n)).
 *
 * The class adds two things on top of Map so the DSA page can show real data:
 *   - operation counters (stats), and
 *   - bucketIndex()/buckets(): an illustration of where a key lands, using a
 *     djb2 hash function and `bucketCount` buckets.
 * The illustration never changes how data is stored - Map does that.
 */
export class HashMap {
  constructor(bucketCount = 8) {
    this._table = new Map(); // key (coupon code) -> value (coupon object)
    this.bucketCount = bucketCount;
    this.stats = { inserts: 0, searches: 0, hits: 0, misses: 0, updates: 0, deletes: 0 };
  }

  /** djb2 string hash: h = h * 33 + charCode. Returns an unsigned 32-bit integer. */
  static hashCode(key) {
    const str = String(key);
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  /** Bucket a key would map to: hash % bucketCount. */
  bucketIndex(key) {
    return HashMap.hashCode(key) % this.bucketCount;
  }

  /** INSERT - O(1) average. Returns false (and changes nothing) if the key already exists. */
  insert(key, value) {
    if (this._table.has(key)) return false;
    this._table.set(key, value);
    this.stats.inserts++;
    return true;
  }

  /** SEARCH by key - O(1) average. Returns the value, or undefined when not found. */
  search(key) {
    this.stats.searches++;
    const value = this._table.get(key);
    if (value === undefined) {
      this.stats.misses++;
      return undefined;
    }
    this.stats.hits++;
    return value;
  }

  /** Read without touching the counters (used by the UI to render previews). */
  peek(key) {
    return this._table.get(key);
  }

  /** UPDATE - O(1) average. Returns false if the key does not exist. */
  update(key, value) {
    if (!this._table.has(key)) return false;
    this._table.set(key, value);
    this.stats.updates++;
    return true;
  }

  /** DELETE - O(1) average. Returns true if something was removed. */
  delete(key) {
    const removed = this._table.delete(key);
    if (removed) this.stats.deletes++;
    return removed;
  }

  /** EXISTENCE check - O(1) average. */
  has(key) {
    return this._table.has(key);
  }

  get size() {
    return this._table.size;
  }

  keys() {
    return [...this._table.keys()];
  }

  values() {
    return [...this._table.values()];
  }

  entries() {
    return [...this._table.entries()];
  }

  clear() {
    this._table.clear();
  }

  /** Illustration: group current keys by bucket index -> array of bucketCount arrays. */
  buckets() {
    const out = Array.from({ length: this.bucketCount }, () => []);
    for (const key of this._table.keys()) out[this.bucketIndex(key)].push(key);
    return out;
  }

  /** size / bucketCount - how full the illustrated table is. */
  loadFactor() {
    return this._table.size / this.bucketCount;
  }
}

export default HashMap;

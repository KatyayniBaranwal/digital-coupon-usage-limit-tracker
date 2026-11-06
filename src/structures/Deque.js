/**
 * Deque (double-ended queue) - circular buffer implementation
 * ------------------------------------------------------------------
 * Used to hold the most recent successful coupon applications.
 *
 * Storage: a fixed-size array `_buf` of `_cap` slots plus two numbers:
 *   _head  - index of the FRONT element (the oldest record)
 *   _count - how many elements are stored
 * The REAR element sits at index (_head + _count - 1) % _cap.
 *
 * Because indices wrap around with the modulo operator, nothing is ever shifted
 * when we add or remove at either end. All eight operations are O(1) - unlike
 * Array.shift()/unshift(), which move every element (O(n)).
 *
 * Fixed capacity: when the deque is full, adding at one end first evicts the
 * element at the opposite end. addRear() drops the FRONT (oldest) element,
 * which is exactly the "keep only the latest N applications" behaviour needed.
 */
export class Deque {
  constructor(capacity = 20) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError('Deque capacity must be a positive integer');
    }
    this._cap = capacity;
    this._buf = new Array(capacity).fill(undefined);
    this._head = 0;
    this._count = 0;
  }

  /** Number of stored elements - O(1). */
  size() {
    return this._count;
  }

  capacity() {
    return this._cap;
  }

  isEmpty() {
    return this._count === 0;
  }

  isFull() {
    return this._count === this._cap;
  }

  /** Physical array index of the i-th logical element (0 = front). */
  _index(i) {
    return (this._head + i) % this._cap;
  }

  /**
   * addRear - O(1). New record enters at the REAR (newest end).
   * If full, the FRONT (oldest) element is evicted first and returned;
   * otherwise returns null.
   */
  addRear(item) {
    let evicted = null;
    if (this.isFull()) evicted = this.removeFront();
    this._buf[this._index(this._count)] = item; // slot just after current rear
    this._count++;
    return evicted;
  }

  /**
   * addFront - O(1). Moves head one slot backwards (wrapping) and writes there.
   * If full, the REAR element is evicted first and returned; otherwise null.
   */
  addFront(item) {
    let evicted = null;
    if (this.isFull()) evicted = this.removeRear();
    this._head = (this._head - 1 + this._cap) % this._cap;
    this._buf[this._head] = item;
    this._count++;
    return evicted;
  }

  /** removeFront - O(1). Removes and returns the oldest element (undefined if empty). */
  removeFront() {
    if (this.isEmpty()) return undefined;
    const item = this._buf[this._head];
    this._buf[this._head] = undefined;
    this._head = (this._head + 1) % this._cap;
    this._count--;
    return item;
  }

  /** removeRear - O(1). Removes and returns the newest element (undefined if empty). */
  removeRear() {
    if (this.isEmpty()) return undefined;
    const idx = this._index(this._count - 1);
    const item = this._buf[idx];
    this._buf[idx] = undefined;
    this._count--;
    return item;
  }

  /** peekFront - O(1). Oldest element without removing it. */
  peekFront() {
    return this.isEmpty() ? undefined : this._buf[this._head];
  }

  /** peekRear - O(1). Newest element without removing it. */
  peekRear() {
    return this.isEmpty() ? undefined : this._buf[this._index(this._count - 1)];
  }

  /** Elements from front (oldest) to rear (newest) - O(n). */
  toArray() {
    const out = [];
    for (let i = 0; i < this._count; i++) out.push(this._buf[this._index(i)]);
    return out;
  }

  /** Remove everything - O(capacity). */
  clear() {
    this._buf = new Array(this._cap).fill(undefined);
    this._head = 0;
    this._count = 0;
  }

  /**
   * Change the capacity. If the new capacity is smaller than the current size,
   * the OLDEST elements (front) are dropped. Returns the dropped elements.
   */
  resize(newCapacity) {
    if (!Number.isInteger(newCapacity) || newCapacity < 1) {
      throw new RangeError('Deque capacity must be a positive integer');
    }
    const items = this.toArray();
    const dropped = [];
    while (items.length > newCapacity) dropped.push(items.shift());
    this._cap = newCapacity;
    this._buf = new Array(newCapacity).fill(undefined);
    this._head = 0;
    this._count = 0;
    for (const item of items) this._buf[this._count++] = item;
    return dropped;
  }

  /** Raw view of the circular buffer, for the DSA visualisation page. */
  snapshot() {
    return {
      buffer: [...this._buf],
      head: this._head,
      count: this._count,
      capacity: this._cap,
      tail: this._count === 0 ? -1 : this._index(this._count - 1),
    };
  }
}

export default Deque;

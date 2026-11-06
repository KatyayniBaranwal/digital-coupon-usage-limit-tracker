# Digital Coupon Usage Limit Tracker

A DSA-II project: a React dashboard whose core logic is powered by a **HashMap** (coupon storage and lookup) and a **Deque** (recent usage history).

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd coupon-tracker
npm install
npm run dev
```

Open the address Vite prints (normally http://localhost:5173). No API key, backend or database is needed. All data is saved in your browser's localStorage.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the HashMap, Deque and coupon-logic tests (plain Node, no install needed) |

## Pages

| Page | What it does |
| --- | --- |
| Dashboard | 6 live statistics, usage chart, recent activity, most-used coupons, status donut, quick actions |
| Coupons | Add / edit / delete / view, search, filter by category and status, sort by expiry, discount, usage |
| Apply Coupon | Validates a code, shows discount and final amount on an example purchase |
| Usage History | Latest first, search, filter, sort, clear with confirmation (backed by the Deque) |
| Analytics | Usage over time, popular coupons, category split, remaining availability, cumulative applications |
| DSA Implementation | Live HashMap buckets, searchable lookup trace, benchmark, live Deque buffer, sandbox Deque, operation log |
| Settings | Reset demo data, clear history, set history capacity, app and DSA information |

## Project structure

```
src/
  structures/
    HashMap.js        # coupon storage (wraps JavaScript Map)
    Deque.js          # circular-buffer deque (history)
  utils/
    couponStore.js    # all business logic: apply, add, edit, delete, persistence
    validators.js     # form validation
    analytics.js      # chart data helpers
    dates.js, storage.js, storeInstance.js, useCouponStore.js
  data/               # sample coupons, constants
  components/         # Layout, Modal, forms, badges, toast ...
  pages/              # one file per page
  App.jsx, main.jsx, index.css
tests/dsa.test.mjs    # unit tests for the data structures and store
```

Business logic (`couponStore.js`) contains no React. The UI subscribes to it with `useSyncExternalStore`, so every page updates immediately after any change.

## How the HashMap works (viva notes)

- **Role:** every coupon is stored as `code -> coupon object`. The code (for example `SAVE10`) is the unique key.
- **Mechanism:** the key goes through a hash function, which chooses a bucket; the value is read from or written to that bucket. That is why `insert`, `search`, `update`, `delete` and `has` are **O(1) on average**, no matter how many coupons exist. An array `.find()` would be O(n).
- **Implementation:** `HashMap.js` wraps the JavaScript `Map` (a built-in hash table) and exposes `insert`, `search`, `update`, `delete`, `has`, `size`, `keys`, `values`.
- **Visualisation:** the DSA page also computes a djb2 hash (`h = h*33 + charCode`) modulo 8 so you can see which bucket each real coupon code falls into. This is an illustration; `Map` does the actual storing.
- **Where it is used:** `applyCoupon()` does one `search(code)` to check existence, and one `update(code, ...)` to increase the usage count.
- **Worst case:** if all keys collided into one bucket, operations would degrade to O(n). A good hash function makes this very unlikely.

## How the Deque works (viva notes)

- **Role:** holds the most recent successful coupon applications (default capacity 20, configurable 5 to 100 in Settings).
- **Mechanism:** a circular buffer. A fixed array of `capacity` slots, a `head` index (FRONT, the oldest record) and a `count`. The REAR is at `(head + count - 1) % capacity`. Indices wrap around with the modulo operator, so **nothing is ever shifted**: all of `addFront`, `addRear`, `removeFront`, `removeRear`, `peekFront`, `peekRear`, `isEmpty`, `size` are **O(1)**. (`Array.shift()` is O(n).)
- **Fixed capacity:** a successful application calls `addRear(record)`. If the deque is full, the FRONT (oldest) record is removed first, so it only ever keeps the latest N.
- **History page:** reads the Deque from front to rear and reverses it, so the latest application is shown first.
- **Failed attempts** (unknown, expired or exhausted coupon) never touch the Deque or the usage count.

## Applying a coupon

1. `HashMap.search(code)` - does the coupon exist?
2. Is the expiry date before today? -> expired
3. Is `usedCount >= maxUsage`? -> exhausted (the limit can never be exceeded)
4. Valid: `usedCount + 1` via `HashMap.update`, then `Deque.addRear(record)`

Coupon status is always derived (expired, then exhausted, then active), never stored, so it cannot go out of date.

## Notes

- Sample coupon expiry dates are generated relative to today, so the demo always has active, expired and exhausted coupons. Use **Settings -> Reset demo data** to restore them.
- Analytics charts of usage over time use the history Deque, so they cover the latest N applications. Totals (such as Successful Applications) use each coupon's usage count and cover everything.
- Deleting a coupon keeps its old history records; clearing history keeps coupon usage counts.
- The app uses a hash-based URL (`/#/dashboard`), so refreshing any page works without server configuration.

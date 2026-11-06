import { useMemo, useReducer, useRef, useState } from 'react';
import { Search, Play, ArrowRight, Gauge, Zap } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { getCouponStatus } from '../utils/couponStore.js';
import { normalizeCode } from '../utils/validators.js';
import { HashMap } from '../structures/HashMap.js';
import { Deque } from '../structures/Deque.js';
import { DEFAULT_PURCHASE_AMOUNT } from '../data/constants.js';
import { timeAgo } from '../utils/dates.js';

/* ---------- Deque visual: physical circular buffer + logical front->rear order ---------- */
function DequeVisual({ deque, label, sub }) {
  const snap = deque.snapshot();
  const items = deque.toArray();
  const showBuffer = snap.capacity <= 24;

  return (
    <div>
      {showBuffer && (
        <>
          <div className="deque-label">Physical circular buffer (array of {snap.capacity} slots)</div>
          <div className="slots">
            {snap.buffer.map((item, i) => {
              const filled = item !== undefined;
              const isFront = filled && i === snap.head;
              const isRear = filled && i === snap.tail;
              return (
                <div
                  key={i}
                  className={`slot ${filled ? 'filled' : 'empty'} ${isFront ? 'is-front' : ''} ${isRear ? 'is-rear' : ''}`}
                >
                  <span className="idx">[{i}]</span>
                  {isFront && <span className="tag f">FRONT</span>}
                  {isRear && !isFront && <span className="tag r">REAR</span>}
                  <span className="s-main">{filled ? label(item) : 'empty'}</span>
                  {filled && <span className="s-sub">{sub(item)}</span>}
                </div>
              );
            })}
          </div>
          <p className="kv-note" style={{ marginTop: 8 }}>
            head = <b>{snap.head}</b>, count = <b>{snap.count}</b>, rear index = <b>{snap.tail < 0 ? '-' : snap.tail}</b>. Indices wrap with
            <code> % capacity</code>, so nothing is ever shifted.
          </p>
        </>
      )}

      <div className="deque-label" style={{ marginTop: 16 }}>
        Logical order (oldest to newest)
      </div>
      <div className="logical">
        {items.length === 0 ? (
          <span className="bucket-empty">Deque is empty</span>
        ) : (
          <>
            <span className="end f">FRONT</span>
            {items.map((item, i) => (
              <span key={i} style={{ display: 'contents' }}>
                <span className="key-chip">
                  {label(item)} <small>{sub(item)}</small>
                </span>
                {i < items.length - 1 && <ArrowRight size={14} className="arrow" />}
              </span>
            ))}
            <span className="end r">REAR</span>
          </>
        )}
      </div>
    </div>
  );
}

const COMPLEXITY_HASH = [
  ['insert(code, coupon)', 'O(1)', 'Hash the code, store in its bucket'],
  ['search(code)', 'O(1)', 'Hash the code, read that bucket - no scanning'],
  ['has(code)', 'O(1)', 'Same hash lookup, returns true/false'],
  ['update(code, coupon)', 'O(1)', 'Find the bucket, replace the value'],
  ['delete(code)', 'O(1)', 'Find the bucket, remove the entry'],
];
const COMPLEXITY_DEQUE = [
  ['addRear(item)', 'O(1)', 'Write at (head + count) % capacity'],
  ['addFront(item)', 'O(1)', 'Move head back one slot (wrapping) and write'],
  ['removeFront()', 'O(1)', 'Read head, advance head by one'],
  ['removeRear()', 'O(1)', 'Read the rear slot, decrease count'],
  ['peekFront() / peekRear()', 'O(1)', 'Read a single slot'],
  ['isEmpty() / size()', 'O(1)', 'Return the stored counter'],
  ['toArray()', 'O(n)', 'Visits every stored element once'],
];

function ComplexityTable({ rows }) {
  return (
    <table className="complexity">
      <thead>
        <tr>
          <th>Operation</th>
          <th>Time</th>
          <th>Why</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([op, big, why]) => (
          <tr key={op}>
            <td>
              <code>{op}</code>
            </td>
            <td>
              <span className={`big-o ${big === 'O(1)' ? '' : 'slow'}`}>{big}</span>
            </td>
            <td>{why}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DsaImplementation() {
  const { store, version } = useCouponStore();
  const { push } = useToast();

  /* ----- HashMap lookup demo ----- */
  const [lookupCode, setLookupCode] = useState('SAVE10');
  const [lookup, setLookup] = useState(null);
  const [bench, setBench] = useState(null);
  const [running, setRunning] = useState(false);

  const buckets = useMemo(() => store.coupons.buckets(), [store, version]);
  const stats = store.coupons.stats;

  const runLookup = (e) => {
    e.preventDefault();
    const code = normalizeCode(lookupCode);
    if (!code) {
      push('Enter a coupon code to search for.', 'error');
      return;
    }
    const t0 = performance.now();
    const found = store.searchCoupon(code); // real HashMap.search()
    const micros = Math.max(0, (performance.now() - t0) * 1000);
    setLookup({
      code,
      found: Boolean(found),
      hash: HashMap.hashCode(code),
      bucket: store.coupons.bucketIndex(code),
      micros,
      size: store.coupons.size,
      bucketItems: store.coupons.buckets()[store.coupons.bucketIndex(code)].length,
    });
  };

  const runBenchmark = () => {
    setRunning(true);
    // Let the "Running..." state paint before the (short) synchronous benchmark.
    setTimeout(() => {
      const rows = [];
      for (const size of [1000, 10000, 50000]) {
        const map = new HashMap();
        const arr = [];
        for (let i = 0; i < size; i++) {
          const key = `CODE${i}`;
          map.insert(key, { i });
          arr.push({ code: key, i });
        }
        const targets = Array.from({ length: 1000 }, (_, k) => `CODE${(k * 7919) % size}`);
        const t0 = performance.now();
        for (const t of targets) map.search(t);
        const t1 = performance.now();
        for (const t of targets) arr.find((x) => x.code === t);
        const t2 = performance.now();
        rows.push({ size, hashMs: t1 - t0, arrayMs: t2 - t1 });
      }
      setBench(rows);
      setRunning(false);
    }, 40);
  };

  /* ----- Sandbox deque ----- */
  const sandbox = useRef(null);
  if (sandbox.current === null) sandbox.current = new Deque(6);
  const counter = useRef(1);
  const [, force] = useReducer((x) => x + 1, 0);
  const [sbMsg, setSbMsg] = useState('Sandbox ready: an empty Deque with capacity 6.');

  const sandboxOp = (name) => {
    const d = sandbox.current;
    let msg = '';
    if (name === 'addFront' || name === 'addRear') {
      const item = { label: `N${counter.current++}` };
      const evicted = name === 'addFront' ? d.addFront(item) : d.addRear(item);
      msg = `${name}(${item.label})`;
      if (evicted) msg += ` -> deque was full, evicted ${evicted.label} from the ${name === 'addFront' ? 'rear' : 'front'}`;
    } else if (name === 'removeFront' || name === 'removeRear') {
      const item = name === 'removeFront' ? d.removeFront() : d.removeRear();
      msg = item ? `${name}() -> ${item.label}` : `${name}() -> deque is empty (undefined)`;
    } else if (name === 'peekFront' || name === 'peekRear') {
      const item = name === 'peekFront' ? d.peekFront() : d.peekRear();
      msg = item ? `${name}() -> ${item.label} (not removed)` : `${name}() -> deque is empty (undefined)`;
    } else if (name === 'reset') {
      sandbox.current = new Deque(6);
      counter.current = 1;
      msg = 'Sandbox reset.';
    }
    setSbMsg(msg);
    force();
  };

  /* ----- Live app deque ----- */
  const applyRandom = () => {
    const active = store.listCoupons().filter((c) => getCouponStatus(c) === 'active');
    if (active.length === 0) {
      push('There are no active coupons to apply.', 'error');
      return;
    }
    const pick = active[Math.floor(Math.random() * active.length)];
    const res = store.applyCoupon(pick.code, DEFAULT_PURCHASE_AMOUNT);
    push(res.ok ? `Applied ${pick.code} - watch the Deque below.` : res.message, res.ok ? 'success' : 'error');
  };

  const last = store.lastApply;
  const dequeLabel = (r) => r.code;
  const dequeSub = (r) => `#${r.usageNumber}`;

  return (
    <div className="page">
      <PageHeader title="DSA Implementation" subtitle="The two data structures behind the app, drawn from your real, live data." />

      <div className="dsa-hero">
        <h2 style={{ fontSize: 20 }}>HashMap + Deque, working together</h2>
        <p>
          Every coupon lives in a <b>HashMap</b> keyed by its code, so validating a code is one O(1) lookup. Every successful application is pushed onto a
          fixed-capacity <b>Deque</b>, which keeps just the latest records and drops the oldest from the front.
        </p>
        <div className="pills">
          <span className="pill">HashMap: {store.coupons.size} keys</span>
          <span className="pill">Searches: {stats.searches} ({stats.hits} hit / {stats.misses} miss)</span>
          <span className="pill">
            Deque: {store.history.size()} / {store.history.capacity()}
          </span>
        </div>
      </div>

      {/* ===================== HASHMAP ===================== */}
      <div className="section-title">
        <span className="num-badge">1</span> HashMap - coupon storage
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">How coupon codes are stored</div>
              <div className="card-sub">
                Each code is hashed (djb2) and mapped to one of {store.coupons.bucketCount} illustrated buckets - load factor{' '}
                {store.coupons.loadFactor().toFixed(2)}.
              </div>
            </div>
          </div>
          <div className="buckets">
            {buckets.map((keys, i) => {
              const state = lookup && lookup.bucket === i ? (lookup.found ? 'hit' : 'miss') : '';
              return (
                <div key={i} className={`bucket-row ${state}`}>
                  <div className="bucket-idx">bucket {i}</div>
                  <div className="bucket-items">
                    {keys.length === 0 && <span className="bucket-empty">empty</span>}
                    {keys.map((k) => {
                      const c = store.coupons.peek(k);
                      const s = c ? getCouponStatus(c) : 'active';
                      const isFound = lookup && lookup.found && lookup.code === k;
                      return (
                        <span key={k} className={`key-chip ${s !== 'active' ? `s-${s}` : ''} ${isFound ? 'found' : ''}`} title={c ? c.name : ''}>
                          {k} <small>{c ? `${c.usedCount}/${c.maxUsage}` : ''}</small>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="kv-note" style={{ marginTop: 10 }}>
            Key = coupon code, value = the coupon object. Several keys can share a bucket (a collision) - the real <code>Map</code> resolves that internally.
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">How a coupon is searched</div>
              <div className="card-sub">Runs the real HashMap.search()</div>
            </div>
          </div>
          <form onSubmit={runLookup} style={{ display: 'flex', gap: 10 }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <Search size={17} />
              <input
                className="input mono"
                value={lookupCode}
                onChange={(e) => setLookupCode(normalizeCode(e.target.value.replace(/\s/g, '')))}
                placeholder="SAVE10"
                aria-label="Coupon code to search"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>

          {lookup ? (
            <div className="trace">
              <div>
                1. hash(<em>"{lookup.code}"</em>) = <b>{lookup.hash}</b>
              </div>
              <div>
                2. {lookup.hash} % {store.coupons.bucketCount} = bucket <b>#{lookup.bucket}</b>
              </div>
              <div>
                3. check bucket #{lookup.bucket} ({lookup.bucketItems} key{lookup.bucketItems === 1 ? '' : 's'}) {'->'}{' '}
                {lookup.found ? <b>HIT - coupon returned</b> : <span className="bad">MISS - not found</span>}
              </div>
              <div>
                4. took ~{lookup.micros.toFixed(1)} microseconds, {lookup.size} keys stored: <b>O(1)</b>
              </div>
              <div style={{ color: '#98a2c8' }}>(an array scan would need up to {lookup.size} comparisons)</div>
            </div>
          ) : (
            <div className="trace" style={{ color: '#98a2c8' }}>
              Search a code to see the hash, the bucket and the result. The matching bucket lights up on the left.
            </div>
          )}

          <dl className="detail-grid" style={{ marginBottom: 0 }}>
            <div>
              <dt>Inserts / updates / deletes</dt>
              <dd className="num">
                {stats.inserts} / {stats.updates} / {stats.deletes}
              </dd>
            </div>
            <div>
              <dt>Searches (hit / miss)</dt>
              <dd className="num">
                {stats.searches} ({stats.hits} / {stats.misses})
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid-eq">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            HashMap time complexity
          </div>
          <ComplexityTable rows={COMPLEXITY_HASH} />
          <p className="kv-note" style={{ marginTop: 10 }}>
            Average case. In the worst case (every key colliding) it degrades to O(n), but a good hash function makes that extremely rare.
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">O(1) vs O(n) benchmark</div>
              <div className="card-sub">1000 lookups on synthetic data (separate from your coupons)</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={runBenchmark} disabled={running}>
              <Gauge size={15} /> {running ? 'Running...' : 'Run benchmark'}
            </button>
          </div>
          {bench ? (
            <table className="bench">
              <thead>
                <tr>
                  <th>Entries</th>
                  <th>HashMap</th>
                  <th>Array.find</th>
                  <th>Faster by</th>
                </tr>
              </thead>
              <tbody>
                {bench.map((r) => (
                  <tr key={r.size}>
                    <td className="num">{r.size.toLocaleString('en-IN')}</td>
                    <td className="num">{r.hashMs.toFixed(2)} ms</td>
                    <td className="num">{r.arrayMs.toFixed(2)} ms</td>
                    <td className="num">
                      <b>{r.hashMs > 0 ? `${Math.round(r.arrayMs / r.hashMs)}x` : '>100x'}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="kv-note">
              Click the button: as the number of entries grows, the HashMap time stays almost flat while a linear array scan keeps growing. The app itself never
              uses array scans to look up coupons.
            </p>
          )}
        </div>
      </div>

      {/* ===================== DEQUE ===================== */}
      <div className="section-title">
        <span className="num-badge">2</span> Deque - recent coupon usage
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Live history Deque (your real data)</div>
            <div className="card-sub">New applications enter at the REAR; when full, the oldest leaves from the FRONT.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={applyRandom}>
            <Zap size={15} /> Apply a random active coupon
          </button>
        </div>
        <DequeVisual deque={store.history} label={dequeLabel} sub={dequeSub} />

        <div className="grid-eq" style={{ marginTop: 18, marginBottom: 0 }}>
          <div className="ev-box in">
            <b>Last record to enter the rear</b>
            <div style={{ marginTop: 4 }}>
              {last ? (
                <>
                  <code>addRear({last.entered.code} #{last.entered.usageNumber})</code> {timeAgo(last.entered.appliedAt)}
                </>
              ) : (
                'Apply a coupon to see a record enter the rear.'
              )}
            </div>
          </div>
          <div className="ev-box out">
            <b>Last record removed from the front</b>
            <div style={{ marginTop: 4 }}>
              {last ? (
                last.evicted ? (
                  <>
                    <code>removeFront() {'->'} {last.evicted.code} #{last.evicted.usageNumber}</code> (history was full)
                  </>
                ) : (
                  'No eviction yet - the Deque still had free slots.'
                )
              ) : (
                'Nothing removed yet.'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-eq">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Try both ends - sandbox Deque</div>
              <div className="card-sub">A separate Deque (capacity 6) to experiment with every operation.</div>
            </div>
          </div>
          <DequeVisual deque={sandbox.current} label={(x) => x.label} sub={() => ''} />
          <div className="sandbox-btns">
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('addFront')}>
              addFront
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('addRear')}>
              addRear
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('removeFront')}>
              removeFront
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('removeRear')}>
              removeRear
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('peekFront')}>
              peekFront
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => sandboxOp('peekRear')}>
              peekRear
            </button>
            <button className="btn btn-danger-ghost btn-sm" onClick={() => sandboxOp('reset')}>
              Reset
            </button>
          </div>
          <div className="sandbox-msg">
            {sbMsg} | size() = {sandbox.current.size()} | isEmpty() = {String(sandbox.current.isEmpty())}
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>
            Deque time complexity
          </div>
          <ComplexityTable rows={COMPLEXITY_DEQUE} />
          <p className="kv-note" style={{ marginTop: 10 }}>
            A plain array needs O(n) for <code>shift()</code>/<code>unshift()</code> because every element moves. The circular buffer only moves two numbers.
          </p>
        </div>
      </div>

      {/* ===================== LOG ===================== */}
      <div className="section-title">
        <span className="num-badge">3</span> Operation log
      </div>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Recent data-structure operations</div>
            <div className="card-sub">Every insert, search, update, delete, addRear and removeFront is recorded here (this session).</div>
          </div>
        </div>
        {store.dsaLog.length === 0 ? (
          <p className="cell-sub">
            <Play size={14} style={{ verticalAlign: -2 }} /> No operations yet - apply a coupon, add one, or run a search above.
          </p>
        ) : (
          <div className="log">
            {store.dsaLog.map((l) => (
              <div className="log-row" key={l.id}>
                <span className={`tag ${l.structure === 'HashMap' ? 'hash' : 'deq'}`}>{l.structure}</span>
                <span>{l.detail}</span>
                <time>{timeAgo(l.time)}</time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

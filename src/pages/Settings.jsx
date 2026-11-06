import { useEffect, useState } from 'react';
import { RotateCcw, Trash2, Save, Info, Database } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { MIN_HISTORY_CAPACITY, MAX_HISTORY_CAPACITY } from '../data/constants.js';

export default function Settings() {
  const { store } = useCouponStore();
  const { push } = useToast();
  const [capacity, setCapacity] = useState(String(store.historyCapacity));
  const [capError, setCapError] = useState('');
  const [confirm, setConfirm] = useState(null); // 'reset' | 'clear' | 'capacity'

  // Keep the input in sync if capacity changes elsewhere (e.g. after a reset).
  useEffect(() => {
    setCapacity(String(store.historyCapacity));
  }, [store.historyCapacity]);

  const n = Number(capacity);
  const capValid = Number.isInteger(n) && n >= MIN_HISTORY_CAPACITY && n <= MAX_HISTORY_CAPACITY;

  const saveCapacity = (e) => {
    e.preventDefault();
    if (!capValid) {
      setCapError(`Enter a whole number from ${MIN_HISTORY_CAPACITY} to ${MAX_HISTORY_CAPACITY}.`);
      return;
    }
    setCapError('');
    if (n === store.historyCapacity) {
      push('History capacity is already set to that value.', 'info');
      return;
    }
    if (n < store.history.size()) {
      setConfirm('capacity'); // shrinking drops the oldest records - ask first
      return;
    }
    applyCapacity();
  };

  const applyCapacity = () => {
    const res = store.setHistoryCapacity(n);
    setConfirm(null);
    if (!res.ok) {
      push(res.message, 'error');
      return;
    }
    push(res.dropped ? `Capacity set to ${n}. ${res.dropped} oldest record(s) removed.` : `History capacity set to ${n}.`);
  };

  const doConfirm = () => {
    if (confirm === 'reset') {
      store.resetDemoData();
      push('Demo data restored.');
    } else if (confirm === 'clear') {
      store.clearHistory();
      push('Usage history cleared.');
    } else if (confirm === 'capacity') {
      applyCapacity();
      return;
    }
    setConfirm(null);
  };

  const dialogs = {
    reset: {
      title: 'Reset demo data?',
      message: 'All coupons and history will be replaced with the original sample data and the history capacity returns to the default. Your own coupons will be lost.',
      label: 'Reset data',
    },
    clear: {
      title: 'Clear usage history?',
      message: 'Every record in the history Deque will be removed. Coupon usage counts stay as they are.',
      label: 'Clear history',
    },
    capacity: {
      title: 'Reduce history capacity?',
      message: `The Deque currently holds ${store.history.size()} records. Setting the capacity to ${n} removes the ${Math.max(0, store.history.size() - n)} oldest record(s) from the front.`,
      label: 'Reduce capacity',
    },
  };
  const dlg = confirm ? dialogs[confirm] : null;
  const stats = store.computeStats();

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Manage demo data, history capacity and learn how the project works." />

      <div className="grid-eq">
        <div className="card">
          <div className="card-head">
            <div className="card-title">History &amp; data</div>
          </div>

          <div className="setting-row">
            <div>
              <h4>Maximum history capacity</h4>
              <p>
                How many recent applications the Deque keeps ({MIN_HISTORY_CAPACITY}-{MAX_HISTORY_CAPACITY}). Currently {store.history.size()} of{' '}
                {store.historyCapacity} used.
              </p>
              {capError && <span className="error-text">{capError}</span>}
            </div>
            <form className="inline-form" onSubmit={saveCapacity} noValidate>
              <input
                className={`input ${capError ? 'invalid' : ''}`}
                type="number"
                min={MIN_HISTORY_CAPACITY}
                max={MAX_HISTORY_CAPACITY}
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  setCapError('');
                }}
                aria-label="Maximum history capacity"
              />
              <button className="btn btn-primary btn-sm" type="submit">
                <Save size={15} /> Save
              </button>
            </form>
          </div>

          <div className="setting-row">
            <div>
              <h4>Clear usage history</h4>
              <p>Empties the history Deque. Coupon usage counts are not affected.</p>
            </div>
            <button className="btn btn-danger-ghost btn-sm" onClick={() => setConfirm('clear')} disabled={store.history.isEmpty()}>
              <Trash2 size={15} /> Clear history
            </button>
          </div>

          <div className="setting-row">
            <div>
              <h4>Reset demo data</h4>
              <p>Restore the {12} sample coupons and history. This deletes any coupons you added or changed.</p>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => setConfirm('reset')}>
              <RotateCcw size={15} /> Reset data
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Info size={16} style={{ verticalAlign: -2 }} /> Application information
            </div>
          </div>
          <dl className="kv">
            <dt>Application</dt>
            <dd>Digital Coupon Usage Limit Tracker</dd>
            <dt>Purpose</dt>
            <dd>DSA-II project: HashMap + Deque in practice</dd>
            <dt>Version</dt>
            <dd>1.0.0</dd>
            <dt>Stack</dt>
            <dd>React 18, Vite, Recharts, Lucide, LocalStorage</dd>
            <dt>Coupons stored</dt>
            <dd>{stats.total}</dd>
            <dt>History records</dt>
            <dd>
              {store.history.size()} / {store.historyCapacity}
            </dd>
            <dt>
              <Database size={13} style={{ verticalAlign: -2 }} /> Browser storage used
            </dt>
            <dd>{(store.storageSize() / 1024).toFixed(1)} KB (localStorage)</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">DSA information</div>
        </div>
        <ul className="info-list">
          <li>
            <b>HashMap (JavaScript Map)</b> stores every coupon by its unique code. insert, search, update, delete and has() are O(1) on average, so checking a
            code never gets slower as more coupons are added. Code: <code>src/structures/HashMap.js</code>
          </li>
          <li>
            <b>Deque (circular buffer)</b> holds the latest successful applications. A fixed array plus a head index and a count lets both ends be used in O(1)
            with modulo wrap-around. When full, <code>addRear()</code> evicts the oldest record from the front. Code: <code>src/structures/Deque.js</code>
          </li>
          <li>
            <b>Applying a coupon</b> = HashMap.search(code) {'->'} check expiry and limit {'->'} HashMap.update(code) {'->'} Deque.addRear(record). Failed attempts
            change neither structure.
          </li>
          <li>
            <b>Persistence:</b> both structures are serialised to localStorage after every change and rebuilt (HashMap by re-inserting, Deque by re-adding from
            front to rear) when the page loads.
          </li>
        </ul>
      </div>

      <ConfirmDialog
        open={Boolean(dlg)}
        title={dlg ? dlg.title : ''}
        message={dlg ? dlg.message : ''}
        confirmLabel={dlg ? dlg.label : 'Confirm'}
        onConfirm={doConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

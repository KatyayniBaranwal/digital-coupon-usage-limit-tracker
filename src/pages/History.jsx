import { useMemo, useState } from 'react';
import { Search, Trash2, History as HistoryIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { CATEGORIES } from '../data/constants.js';
import { formatCurrency, formatDateTime } from '../utils/dates.js';

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt) || b.id - a.id },
  oldest: { label: 'Oldest first', fn: (a, b) => new Date(a.appliedAt) - new Date(b.appliedAt) || a.id - b.id },
  discount: { label: 'Discount: high to low', fn: (a, b) => b.discountPercent - a.discountPercent },
  usage: { label: 'Usage number: high to low', fn: (a, b) => b.usageNumber - a.usageNumber },
  savings: { label: 'Savings: high to low', fn: (a, b) => b.discountAmount - a.discountAmount },
};

export default function History() {
  const { store, version } = useCouponStore();
  const { push } = useToast();
  const [query, setQuery] = useState('');
  const [coupon, setCoupon] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [confirming, setConfirming] = useState(false);

  // listHistory() reads the Deque front->rear and reverses it: latest application first.
  const records = useMemo(() => store.listHistory(), [store, version]);
  const front = store.history.peekFront();
  const rear = store.history.peekRear();

  const codes = useMemo(() => [...new Set(records.map((r) => r.code))].sort(), [records]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter((r) => coupon === 'all' || r.code === coupon)
      .filter((r) => category === 'all' || r.category === category)
      .filter(
        (r) =>
          !q ||
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          formatDateTime(r.appliedAt).toLowerCase().includes(q)
      )
      .sort(SORTS[sort].fn);
  }, [records, query, coupon, category, sort]);

  const clear = () => {
    store.clearHistory();
    setConfirming(false);
    setCoupon('all');
    push('Usage history cleared.');
  };

  return (
    <div className="page">
      <PageHeader title="Usage History" subtitle="Most recent successful applications, held in a fixed-capacity Deque.">
        <button className="btn btn-danger-ghost" onClick={() => setConfirming(true)} disabled={records.length === 0}>
          <Trash2 size={17} /> Clear history
        </button>
      </PageHeader>

      <div className="card" style={{ marginBottom: 18 }}>
        <dl className="detail-grid" style={{ margin: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <div>
            <dt>Deque size / capacity</dt>
            <dd className="num">
              {store.history.size()} / {store.history.capacity()}
            </dd>
          </div>
          <div>
            <dt>
              <ArrowLeft size={11} style={{ verticalAlign: -1 }} /> Front (oldest)
            </dt>
            <dd>{front ? `${front.code} #${front.usageNumber}` : '-'}</dd>
          </div>
          <div>
            <dt>
              Rear (newest) <ArrowRight size={11} style={{ verticalAlign: -1 }} />
            </dt>
            <dd>{rear ? `${rear.code} #${rear.usageNumber}` : '-'}</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="input-wrap">
            <Search size={17} />
            <input
              className="input"
              placeholder="Search by code, name or date..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search history"
            />
          </div>
          <select className="select" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="Filter by coupon">
            <option value="all">All coupons</option>
            {codes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort history">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <HistoryIcon size={40} />
            <h3>{records.length === 0 ? 'No usage history' : 'No matching records'}</h3>
            <p>
              {records.length === 0
                ? 'Apply a coupon and it will appear here.'
                : 'Try changing your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Discount</th>
                  <th>Applied on</th>
                  <th>Saved</th>
                  <th>Usage no.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="code-pill">{r.code}</span>
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        {r.name}
                      </div>
                    </td>
                    <td className="num cell-title">{r.discountPercent}%</td>
                    <td>{formatDateTime(r.appliedAt)}</td>
                    <td className="num">
                      {formatCurrency(r.discountAmount)}
                      <div className="cell-sub">of {formatCurrency(r.purchaseAmount)}</div>
                    </td>
                    <td className="num cell-title">#{r.usageNumber}</td>
                    <td>
                      <span className="badge badge-applied">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint-text" style={{ marginTop: 12 }}>
          Showing {rows.length} of {records.length} record(s). When the Deque is full, the oldest record is removed from the front.
        </p>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Clear usage history?"
        message="All records in the history Deque will be removed. Coupon usage counts are not changed."
        confirmLabel="Clear history"
        onConfirm={clear}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Ticket } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import UsageBar from '../components/UsageBar.jsx';
import CouponForm from '../components/CouponForm.jsx';
import CouponDetails from '../components/CouponDetails.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { getCouponStatus } from '../utils/couponStore.js';
import { CATEGORIES, STATUSES, STATUS_LABELS } from '../data/constants.js';
import { formatDate, expiryLabel } from '../utils/dates.js';

const SORTS = {
  'expiry-asc': { label: 'Expiry: soonest first', fn: (a, b) => a.expiryDate.localeCompare(b.expiryDate) },
  'expiry-desc': { label: 'Expiry: latest first', fn: (a, b) => b.expiryDate.localeCompare(a.expiryDate) },
  'discount-desc': { label: 'Discount: high to low', fn: (a, b) => b.discountPercent - a.discountPercent },
  'discount-asc': { label: 'Discount: low to high', fn: (a, b) => a.discountPercent - b.discountPercent },
  'usage-desc': { label: 'Usage: most used', fn: (a, b) => b.usedCount - a.usedCount },
  'usage-asc': { label: 'Usage: least used', fn: (a, b) => a.usedCount - b.usedCount },
  'code-asc': { label: 'Code: A to Z', fn: (a, b) => a.code.localeCompare(b.code) },
};

export default function Coupons() {
  const { store, version } = useCouponStore();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('expiry-asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Dashboard "New coupon" button links here with ?new=1
  useEffect(() => {
    if (params.get('new')) {
      setEditing(null);
      setFormOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const all = useMemo(
    () => store.listCoupons().map((c) => ({ ...c, status: getCouponStatus(c) })),
    [store, version]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((c) => category === 'all' || c.category === category)
      .filter((c) => status === 'all' || c.status === status)
      .filter(
        (c) =>
          !q ||
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      )
      .sort(SORTS[sort].fn);
  }, [all, query, category, status, sort]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (coupon) => {
    setViewing(null);
    setEditing(coupon);
    setFormOpen(true);
  };
  const askDelete = (coupon) => {
    setViewing(null);
    setDeleting(coupon);
  };
  const confirmDelete = () => {
    if (store.deleteCoupon(deleting.code)) push(`Coupon ${deleting.code} deleted.`);
    else push('That coupon no longer exists.', 'error');
    setDeleting(null);
  };

  return (
    <div className="page">
      <PageHeader title="Coupons" subtitle={`${all.length} coupon${all.length === 1 ? '' : 's'} stored in the HashMap`}>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={17} /> Add coupon
        </button>
      </PageHeader>

      <div className="card">
        <div className="toolbar">
          <div className="input-wrap">
            <Search size={17} />
            <input
              className="input"
              placeholder="Search by code, name, category or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search coupons"
            />
          </div>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort coupons">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <Ticket size={40} />
            <h3>No coupons found</h3>
            <p>{all.length === 0 ? 'Create your first coupon to get started.' : 'Try changing your search or filters.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Discount</th>
                  <th>Usage</th>
                  <th>Expiry</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code}>
                    <td>
                      <span className="code-pill">{c.code}</span>
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        {c.name}
                      </div>
                    </td>
                    <td className="num cell-title">{c.discountPercent}%</td>
                    <td>
                      <UsageBar coupon={c} />
                    </td>
                    <td>
                      <div className="cell-title">{formatDate(c.expiryDate)}</div>
                      <div className="cell-sub">{expiryLabel(c.expiryDate)}</div>
                    </td>
                    <td>{c.category}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="View details" aria-label={`View ${c.code}`} onClick={() => setViewing(c)}>
                          <Eye size={16} />
                        </button>
                        <button className="icon-btn" title="Edit" aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-btn danger" title="Delete" aria-label={`Delete ${c.code}`} onClick={() => setDeleting(c)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint-text" style={{ marginTop: 12 }}>
          Showing {rows.length} of {all.length} coupons.
        </p>
      </div>

      <CouponForm open={formOpen} coupon={editing} onClose={() => setFormOpen(false)} />
      <CouponDetails coupon={viewing} onClose={() => setViewing(null)} onEdit={openEdit} onDelete={askDelete} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete coupon?"
        message={
          deleting
            ? `Coupon ${deleting.code} (${deleting.name}) will be removed from the HashMap. Existing usage history entries are kept.`
            : ''
        }
        confirmLabel="Delete coupon"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

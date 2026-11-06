import { Pencil, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import UsageBar from './UsageBar.jsx';
import { HashMap } from '../structures/HashMap.js';
import { getCouponStatus } from '../utils/couponStore.js';
import { formatDate, expiryLabel } from '../utils/dates.js';
import { useCouponStore } from '../utils/useCouponStore.js';

export default function CouponDetails({ coupon, onClose, onEdit, onDelete }) {
  const { store } = useCouponStore();
  if (!coupon) return null;
  // Always show live data (the object passed in may be stale after an apply).
  const live = store.previewCoupon(coupon.code) || coupon;
  const status = getCouponStatus(live);

  return (
    <Modal
      open
      onClose={onClose}
      title="Coupon details"
      footer={
        <>
          <button className="btn btn-danger-ghost" onClick={() => onDelete(live)}>
            <Trash2 size={16} /> Delete
          </button>
          <button className="btn btn-primary" onClick={() => onEdit(live)}>
            <Pencil size={16} /> Edit
          </button>
        </>
      }
    >
      <div className="detail-hero">
        <div>
          <span className="code-pill">{live.code}</span>
          <h3 style={{ marginTop: 8, fontSize: 20 }}>{live.name}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="big-discount">{live.discountPercent}%</div>
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <p style={{ color: '#35406a', marginTop: 12 }}>{live.description}</p>

      <dl className="detail-grid">
        <div>
          <dt>Category</dt>
          <dd>{live.category}</dd>
        </div>
        <div>
          <dt>Expiry date</dt>
          <dd>
            {formatDate(live.expiryDate)} <span className="cell-sub">({expiryLabel(live.expiryDate)})</span>
          </dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd className="num">
            {live.usedCount} of {live.maxUsage} used
          </dd>
        </div>
        <div>
          <dt>Remaining uses</dt>
          <dd className="num">{Math.max(0, live.maxUsage - live.usedCount)}</dd>
        </div>
      </dl>

      <UsageBar coupon={live} showText={false} />

      <div className="note-box" style={{ marginTop: 18 }}>
        <strong>HashMap view:</strong> key <code>"{live.code}"</code> hashes to bucket{' '}
        <code>#{store.coupons.bucketIndex(live.code)}</code> (hash {HashMap.hashCode(live.code)}) - looked up in O(1).
      </div>
    </Modal>
  );
}

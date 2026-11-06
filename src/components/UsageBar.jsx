import { getCouponStatus } from '../utils/couponStore.js';

/** Progress bar showing used / max for a coupon. */
export default function UsageBar({ coupon, showText = true }) {
  const pct = Math.min(100, Math.round((coupon.usedCount / coupon.maxUsage) * 100));
  const status = getCouponStatus(coupon);
  const cls = status === 'exhausted' ? 'full' : status === 'expired' ? 'dim' : '';
  return (
    <div className="usage-cell">
      <div className={`progress ${cls}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {showText && (
        <small className="num">
          {coupon.usedCount} / {coupon.maxUsage} used
        </small>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { BadgePercent, CheckCircle2, XCircle, Circle, PartyPopper, ShieldAlert, Info } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { getCouponStatus } from '../utils/couponStore.js';
import { normalizeCode } from '../utils/validators.js';
import { DEFAULT_PURCHASE_AMOUNT } from '../data/constants.js';
import { formatCurrency, formatDate, timeAgo } from '../utils/dates.js';

const STEP_ICON = { pass: CheckCircle2, fail: XCircle, skipped: Circle, pending: Circle };

export default function ApplyCoupon() {
  const { store, version } = useCouponStore();
  const { push } = useToast();
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState(String(DEFAULT_PURCHASE_AMOUNT));
  const [result, setResult] = useState(null);

  const coupons = useMemo(() => store.listCoupons().sort((a, b) => a.code.localeCompare(b.code)), [store, version]);
  const recent = useMemo(() => store.listHistory().slice(0, 5), [store, version]);
  const preview = store.previewCoupon(code);
  const previewStatus = preview ? getCouponStatus(preview) : null;

  const submit = (e) => {
    e.preventDefault();
    const res = store.applyCoupon(code, amount);
    setResult(res);
    push(res.message, res.ok ? 'success' : 'error');
  };

  return (
    <div className="page">
      <PageHeader title="Apply Coupon" subtitle="Enter a code and a purchase amount. The code is looked up in the HashMap in O(1)." />

      <div className="apply-grid">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Redeem a coupon</div>
              <div className="card-sub">Only successful applications consume a use.</div>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="label" htmlFor="apply-code">
                Coupon code
              </label>
              <input
                id="apply-code"
                className="input mono"
                placeholder="e.g. SAVE10"
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value.replace(/\s/g, '')))}
                autoComplete="off"
                autoFocus
              />
            </div>

            {code && (
              <div className="preview-box" style={{ marginBottom: 16 }}>
                {preview ? (
                  <>
                    <Info size={18} color="#6d4aff" />
                    <span>
                      <b>{preview.name}</b> · {preview.discountPercent}% off · {Math.max(0, preview.maxUsage - preview.usedCount)} use(s) left
                    </span>
                    <span style={{ marginLeft: 'auto' }}>
                      <StatusBadge status={previewStatus} />
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} color="#f04438" />
                    <span>No coupon with this code exists.</span>
                  </>
                )}
              </div>
            )}

            <div className="field" style={{ marginBottom: 20 }}>
              <label className="label" htmlFor="apply-amount">
                Example purchase amount (INR)
              </label>
              <input
                id="apply-amount"
                className="input"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="hint-text">Used to calculate the discount and the final payable amount.</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <BadgePercent size={18} /> Apply coupon
            </button>
          </form>

          <div style={{ marginTop: 22 }}>
            <div className="label" style={{ marginBottom: 8 }}>
              Try a coupon (click to fill)
            </div>
            <div className="chip-row">
              {coupons.map((c) => (
                <button key={c.code} type="button" className="chip" onClick={() => setCode(c.code)} title={c.name}>
                  <i className={getCouponStatus(c)} />
                  {c.code}
                </button>
              ))}
            </div>
            <p className="hint-text" style={{ marginTop: 8 }}>
              Green = active, amber = exhausted, red = expired. Try the amber and red ones to see the error messages.
            </p>
          </div>
        </div>

        <div className="card">
          {!result ? (
            <div className="placeholder-panel">
              <div>
                <BadgePercent size={42} />
                <h3 style={{ color: '#0f1a3a' }}>Result appears here</h3>
                <p>Apply a coupon to see the validation steps, discount and remaining uses.</p>
              </div>
            </div>
          ) : (
            <div className={`result ${result.ok ? 'ok' : 'bad'}`}>
              <div className="result-head">
                {result.ok ? <PartyPopper size={34} color="#12b76a" /> : <XCircle size={34} color="#f04438" />}
                <div>
                  <h3>{result.ok ? 'Coupon applied!' : 'Could not apply coupon'}</h3>
                  <p>{result.message}</p>
                </div>
              </div>

              {result.ok && (
                <div className="receipt">
                  <div className="receipt-row">
                    <span>Purchase amount</span>
                    <span className="num">{formatCurrency(result.record.purchaseAmount)}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Discount ({result.coupon.discountPercent}%)</span>
                    <span className="num save">- {formatCurrency(result.discountAmount)}</span>
                  </div>
                  <div className="receipt-row total">
                    <span>Final payable</span>
                    <span className="num">{formatCurrency(result.finalAmount)}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Usage count</span>
                    <span className="num">
                      {result.coupon.usedCount} / {result.coupon.maxUsage}
                    </span>
                  </div>
                  <div className="receipt-row">
                    <span>Remaining uses</span>
                    <span className="num">{result.remaining}</span>
                  </div>
                </div>
              )}

              {result.steps.length > 0 && (
                <div className="steps">
                  {result.steps.map((s) => {
                    const Icon = STEP_ICON[s.status];
                    return (
                      <div key={s.key} className={`step ${s.status}`}>
                        <Icon size={18} />
                        {s.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {result.ok && (
                <p className="hint-text" style={{ marginTop: 14 }}>
                  Added to the rear of the history Deque
                  {result.evicted ? ` — history was full, so the oldest record (${result.evicted.code} #${result.evicted.usageNumber}) left from the front.` : '.'}
                </p>
              )}
              {!result.ok && result.coupon && (
                <p className="hint-text" style={{ marginTop: 14 }}>
                  {result.coupon.name} · valid until {formatDate(result.coupon.expiryDate)}. No use was consumed and nothing was added to history.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Latest successful applications</div>
        </div>
        {recent.length === 0 ? (
          <p className="cell-sub">Nothing applied yet.</p>
        ) : (
          <div className="list">
            {recent.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="dot-ok">
                  <CheckCircle2 size={18} />
                </div>
                <div className="list-main">
                  <div className="list-title">
                    {r.code} <span className="cell-sub">· {r.name}</span>
                  </div>
                  <div className="list-sub">
                    {r.discountPercent}% off · saved {formatCurrency(r.discountAmount)} · use #{r.usageNumber}
                  </div>
                </div>
                <span className="cell-sub">{timeAgo(r.appliedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

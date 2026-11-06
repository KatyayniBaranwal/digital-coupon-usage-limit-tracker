import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { CATEGORIES } from '../data/constants.js';
import { dateKeyPlus } from '../utils/dates.js';

const blankValues = () => ({
  code: '',
  name: '',
  discountPercent: '',
  maxUsage: '',
  expiryDate: dateKeyPlus(30),
  category: CATEGORIES[0],
  description: '',
});

const fromCoupon = (c) => ({
  code: c.code,
  name: c.name,
  discountPercent: String(c.discountPercent),
  maxUsage: String(c.maxUsage),
  expiryDate: c.expiryDate,
  category: c.category,
  description: c.description,
});

function Field({ label, error, hint, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      <label className="label">{label}</label>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint-text">{hint}</span> : null}
    </div>
  );
}

/** Add / edit modal. Pass `coupon` to edit, omit it to create. */
export default function CouponForm({ open, coupon, onClose, onSaved }) {
  const { store } = useCouponStore();
  const { push } = useToast();
  const isEdit = Boolean(coupon);
  const [values, setValues] = useState(blankValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setValues(coupon ? fromCoupon(coupon) : blankValues());
      setErrors({});
    }
  }, [open, coupon]);

  const bind = (key, transform = (v) => v) => ({
    value: values[key],
    onChange: (e) => {
      const v = transform(e.target.value);
      setValues((prev) => ({ ...prev, [key]: v }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    className: `${key === 'category' ? 'select' : key === 'description' ? 'textarea' : 'input'} ${errors[key] ? 'invalid' : ''}`,
  });

  const submit = (e) => {
    e.preventDefault();
    const result = isEdit ? store.updateCoupon(coupon.code, values) : store.addCoupon(values);
    if (!result.ok) {
      setErrors(result.errors || {});
      push(result.message || 'Please fix the highlighted fields.', 'error');
      return;
    }
    push(isEdit ? `Coupon ${result.coupon.code} updated.` : `Coupon ${result.coupon.code} created.`);
    if (onSaved) onSaved(result.coupon);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit coupon ${coupon.code}` : 'Add new coupon'}
      size="wide"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="coupon-form" className="btn btn-primary">
            {isEdit ? 'Save changes' : 'Create coupon'}
          </button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field
            label="Coupon code *"
            error={errors.code}
            hint={isEdit ? 'The code is the HashMap key and cannot be changed.' : 'Unique key, e.g. SAVE10'}
          >
            <input
              {...bind('code', (v) => v.toUpperCase().replace(/\s/g, ''))}
              disabled={isEdit}
              maxLength={20}
              placeholder="SAVE10"
              autoFocus={!isEdit}
            />
          </Field>
          <Field label="Coupon name *" error={errors.name}>
            <input {...bind('name')} maxLength={60} placeholder="Everyday Saver" />
          </Field>
          <Field label="Discount (%) *" error={errors.discountPercent}>
            <input {...bind('discountPercent')} type="number" min="1" max="100" step="1" placeholder="10" />
          </Field>
          <Field
            label="Maximum usage limit *"
            error={errors.maxUsage}
            hint={isEdit ? `Currently used ${coupon.usedCount} time(s).` : undefined}
          >
            <input {...bind('maxUsage')} type="number" min="1" step="1" placeholder="100" />
          </Field>
          <Field label="Expiry date *" error={errors.expiryDate}>
            <input {...bind('expiryDate')} type="date" />
          </Field>
          <Field label="Category *" error={errors.category}>
            <select {...bind('category')}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description *" error={errors.description} className="full">
            <textarea {...bind('description')} maxLength={200} placeholder="What does this coupon offer?" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

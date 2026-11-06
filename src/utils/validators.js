import { CATEGORIES } from '../data/constants.js';
import { isValidDateKey } from './dates.js';

export const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();

/**
 * Validate the add/edit coupon form. Returns an object of { field: message };
 * an empty object means the input is valid.
 */
export function validateCoupon(values, { isEdit = false, usedCount = 0, codeExists = () => false } = {}) {
  const errors = {};

  if (!isEdit) {
    const code = normalizeCode(values.code);
    if (!code) errors.code = 'Coupon code is required.';
    else if (!/^[A-Z0-9_-]{3,20}$/.test(code)) errors.code = 'Use 3-20 letters, numbers, "-" or "_" (no spaces).';
    else if (codeExists(code)) errors.code = 'This coupon code already exists.';
  }

  const name = String(values.name ?? '').trim();
  if (!name) errors.name = 'Coupon name is required.';
  else if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2-60 characters.';

  const discountRaw = String(values.discountPercent ?? '').trim();
  const discount = Number(discountRaw);
  if (discountRaw === '') errors.discountPercent = 'Discount percentage is required.';
  else if (!Number.isInteger(discount) || discount < 1 || discount > 100)
    errors.discountPercent = 'Enter a whole number from 1 to 100.';

  const maxRaw = String(values.maxUsage ?? '').trim();
  const max = Number(maxRaw);
  if (maxRaw === '') errors.maxUsage = 'Maximum usage limit is required.';
  else if (!Number.isInteger(max) || max < 1 || max > 100000)
    errors.maxUsage = 'Enter a whole number from 1 to 100000.';
  else if (isEdit && max < usedCount)
    errors.maxUsage = `Cannot be lower than the current usage (${usedCount}).`;

  if (!values.expiryDate) errors.expiryDate = 'Expiry date is required.';
  else if (!isValidDateKey(values.expiryDate)) errors.expiryDate = 'Enter a valid date.';

  if (!CATEGORIES.includes(values.category)) errors.category = 'Choose a category.';

  const description = String(values.description ?? '').trim();
  if (!description) errors.description = 'Description is required.';
  else if (description.length < 5 || description.length > 200)
    errors.description = 'Description must be 5-200 characters.';

  return errors;
}

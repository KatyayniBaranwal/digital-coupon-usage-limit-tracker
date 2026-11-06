import { toDateKey, formatShortDate, round2 } from './dates.js';
import { getCouponStatus } from './couponStore.js';
import { STATUS_LABELS } from '../data/constants.js';

/** Applications (and money saved) per day for the last `days` days, from history records. */
export function usageByDay(records, days = 7, now = new Date()) {
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    const row = { date: key, label: formatShortDate(key), applications: 0, savings: 0 };
    rows.push(row);
    index.set(key, row);
  }
  records.forEach((r) => {
    const row = index.get(toDateKey(new Date(r.appliedAt)));
    if (row) {
      row.applications += 1;
      row.savings = round2(row.savings + (r.discountAmount || 0));
    }
  });
  return rows;
}

export function cumulativeByDay(records, days = 14, now = new Date()) {
  let total = 0;
  return usageByDay(records, days, now).map((row) => {
    total += row.applications;
    return { ...row, total };
  });
}

export function topCoupons(coupons, n = 5) {
  return [...coupons].sort((a, b) => b.usedCount - a.usedCount).slice(0, n);
}

export function categoryDistribution(coupons) {
  const map = new Map();
  coupons.forEach((c) => {
    const row = map.get(c.category) || { name: c.category, value: 0, coupons: 0 };
    row.value += c.usedCount;
    row.coupons += 1;
    map.set(c.category, row);
  });
  return [...map.values()].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
}

export function statusDistribution(coupons) {
  const counts = { active: 0, expired: 0, exhausted: 0 };
  coupons.forEach((c) => {
    counts[getCouponStatus(c)] += 1;
  });
  return Object.keys(counts).map((key) => ({ key, name: STATUS_LABELS[key], value: counts[key] }));
}

/** Used vs remaining uses for coupons that can still be redeemed (not expired). */
export function availability(coupons, n = 10) {
  return coupons
    .filter((c) => getCouponStatus(c) !== 'expired')
    .map((c) => ({ code: c.code, used: c.usedCount, remaining: c.maxUsage - c.usedCount, max: c.maxUsage }))
    .sort((a, b) => b.max - a.max)
    .slice(0, n);
}

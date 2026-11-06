import { dateKeyPlus, round2 } from '../utils/dates.js';

/**
 * Demo coupons. Expiry dates are relative to "today" so the demo always shows
 * a healthy mix of Active, Expired and Exhausted coupons.
 */
export function buildSampleCoupons(now = new Date()) {
  const mk = (code, name, discountPercent, category, maxUsage, usedCount, expiryOffset, description) => ({
    code,
    name,
    discountPercent,
    category,
    maxUsage,
    usedCount,
    expiryDate: dateKeyPlus(expiryOffset, now),
    description,
    createdAt: new Date(now.getTime() - 40 * 86400000).toISOString(),
  });

  return [
    mk('SAVE10', 'Everyday Saver', 10, 'Shopping', 100, 42, 45, 'Flat 10% off on any order across the store.'),
    mk('WELCOME20', 'Welcome Offer', 20, 'Shopping', 50, 18, 60, 'Greeting gift for customers placing their first few orders.'),
    mk('FESTIVE25', 'Festive Bonanza', 25, 'Seasonal', 200, 120, 20, 'Celebrate the festive season with 25% off sitewide.'),
    mk('STUDENT15', 'Student Saver', 15, 'Education', 75, 31, 90, 'Valid on books, courses and stationery with a student ID.'),
    mk('TECH30', 'Tech Fest', 30, 'Electronics', 40, 40, 30, 'Huge savings on gadgets - all redemptions have been claimed.'),
    mk('SUMMER50', 'Summer Mega Sale', 50, 'Fashion', 100, 77, -25, 'Half-price summer collection. This campaign has ended.'),
    mk('NEWUSER10', 'New User Bonus', 10, 'Shopping', 500, 212, 120, 'Extra 10% off for newly registered users.'),
    mk('SHOP20', 'Weekend Shopper', 20, 'Shopping', 60, 59, 10, 'Weekend special - only one redemption left, grab it fast.'),
    mk('FOODIE12', 'Foodie Delight', 12, 'Food & Dining', 150, 64, 35, 'Save on restaurant orders and food delivery.'),
    mk('TRAVEL18', 'Wanderlust Deal', 18, 'Travel', 30, 30, 50, 'Discount on flight and hotel bookings - fully redeemed.'),
    mk('DIWALI35', 'Diwali Dhamaka', 35, 'Seasonal', 80, 66, -5, 'Festival of lights mega deal. The offer has expired.'),
    mk('FASHION40', 'Style Edit', 40, 'Fashion', 25, 9, 15, 'Refresh your wardrobe with 40% off selected styles.'),
  ];
}

/**
 * Seed usage history (oldest -> newest). Up to 2 records per coupon; the Deque
 * keeps only the latest `capacity` of them, so you can see eviction in action.
 */
export function buildSampleHistory(coupons, now = new Date()) {
  const amounts = [1200, 1800, 2500, 3200, 4500, 999];
  const records = [];

  coupons.forEach((c, i) => {
    const n = Math.min(2, c.usedCount);
    const expired = c.expiryDate < dateKeyPlus(0, now);
    for (let j = 0; j < n; j++) {
      const when = expired
        ? new Date(`${c.expiryDate}T12:00:00`).getTime() - j * 5 * 3600000
        : now.getTime() - (3 + ((i * 11 + j * 29) % 140)) * 3600000;
      const purchaseAmount = amounts[(i + j) % amounts.length];
      const discountAmount = round2((purchaseAmount * c.discountPercent) / 100);
      records.push({
        id: 0,
        code: c.code,
        name: c.name,
        discountPercent: c.discountPercent,
        category: c.category,
        appliedAt: new Date(when).toISOString(),
        usageNumber: c.usedCount - (n - 1 - j),
        status: 'Applied',
        purchaseAmount,
        discountAmount,
        finalAmount: round2(purchaseAmount - discountAmount),
      });
    }
  });

  records.sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt));
  records.forEach((r, idx) => {
    r.id = idx + 1;
  });
  return records;
}

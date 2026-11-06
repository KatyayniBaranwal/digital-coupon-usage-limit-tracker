import { CouponStore } from './couponStore.js';

// One shared store for the whole app (created once, backed by localStorage).
export const store = new CouponStore();

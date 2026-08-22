export function normalizePromoCode(code) {
  return (code || "").trim().toUpperCase();
}

// Checks whether a promo code can be applied right now, without computing the discount
// itself (see computePromoDiscount). Returns { ok: true } or { ok: false, error, ...extra }
// where `error` is one of: notFound, expired, minOrder, limitReached, alreadyUsed.
export function validatePromoCode(promo, { subtotal, userEmail }) {
  if (!promo || !promo.active) return { ok: false, error: "notFound" };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { ok: false, error: "expired" };
  if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
    return { ok: false, error: "minOrder", minOrderAmount: promo.minOrderAmount };
  }
  if (promo.usageLimit && (promo.usedCount || 0) >= promo.usageLimit) return { ok: false, error: "limitReached" };
  if (promo.perUserOnce && userEmail && (promo.usedByEmails || []).includes(userEmail)) {
    return { ok: false, error: "alreadyUsed" };
  }
  return { ok: true };
}

export function computePromoDiscount(promo, subtotal) {
  if (!promo) return 0;
  const raw = promo.type === "percent" ? Math.round(subtotal * (promo.value / 100)) : promo.value;
  const capped = promo.maxDiscount ? Math.min(raw, promo.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

import { useMemo, useRef, useState, useEffect } from "react";
import { ShoppingCart, Check, Heart, Star } from "lucide-react";
import { useApp } from "../context/AppContext";
import { CAT_STYLE, CAT_ICON } from "../data/categories";
import { unitOptions, optionFactor, optionLabel, formatMoney } from "../utils/units";
import Stepper from "./Stepper";
import ReviewsModal from "./ReviewsModal";

export default function ProductCard({ product }) {
  const { lang, t, addToCart, currentUser, showToast, wishlist, toggleWishlist, reviews, requestStockNotification } = useApp();
  const options = useMemo(() => unitOptions(product.baseUnit), [product.baseUnit]);
  const [optionIdx, setOptionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const timerRef = useRef(null);
  const isWishlisted = wishlist.includes(product.id);
  const productReviews = useMemo(() => reviews.filter((r) => r.productId === product.id), [reviews, product.id]);
  const avgRating = productReviews.length > 0 ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 0;

  const style = CAT_STYLE[product.category] || CAT_STYLE.sabzavot;
  const Icon = CAT_ICON[product.category] || CAT_ICON.sabzavot;
  const option = options[optionIdx];
  const factor = optionFactor(product, option);
  const unitPrice = product.price * factor;
  const lineTotal = unitPrice * qty;
  const maxQty = Math.floor(product.stock / factor);
  const disabled = product.stock <= 0 || maxQty <= 0;
  const outOfStock = product.stock <= 0;
  // Admins manage the catalog, they don't shop it — buying isn't part of their role, so the
  // purchase controls below are disabled for them rather than removed, matching the pattern
  // that only the ability to act (not the page/card itself) is gated per role in this app.
  const isAdmin = currentUser?.role === "admin";
  const notifyRequested = !!currentUser && (product.notifyRequests || []).includes(currentUser.email);

  const handleAdd = () => {
    if (!currentUser) {
      showToast(t.guestCartBlocked, "error");
      return;
    }
    if (isAdmin) {
      showToast(t.adminCannotBuy, "error");
      return;
    }
    if (disabled) return;
    // Ensure we don't add more than available
    const allowedQty = Math.min(qty, maxQty);
    addToCart({
      key: `${product.id}-${optionIdx}`,
      productId: product.id,
      name: product.name[lang],
      category: product.category,
      optionLabel: optionLabel(option, lang, t),
      unitPrice,
      qty: allowedQty,
      factor, // how many base-units one option represents (e.g. 0.5 for 500g when baseUnit=kg)
    });
    showToast(t.addedToCart(product.name[lang]), "success");
    setFlash(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFlash(false), 900);
  };

  const handleNotifyRequest = () => {
    if (!currentUser) {
      showToast(t.notifyLoginRequired, "error");
      return;
    }
    if (isAdmin || notifyRequested) return;
    requestStockNotification(product.id);
    showToast(t.notifyRequestSaved, "info");
  };

  const handleToggleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(product.id);
    setHeartAnim(true);
    window.setTimeout(() => setHeartAnim(false), 450);
  };

  // Clamp qty when option changes or stock changes
  useEffect(() => {
    if (maxQty <= 0) {
      setQty(1);
    } else if (qty > maxQty) {
      setQty(maxQty);
    } else if (qty < 1) {
      setQty(1);
    }
  }, [optionIdx, product.stock, maxQty]);

  return (
    <div
      className="group h-full flex flex-col overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_28px_rgba(27,77,62,0.08)]"
      style={{
        background: "var(--gc-surface)",
        borderColor: "var(--gc-border)",
        boxShadow: "0 8px 18px rgba(27,77,62,0.04)",
      }}
    >
      <div className="relative aspect-square flex items-center justify-center overflow-hidden" style={{ background: style.bg }}>
        <Icon size={42} color={style.fg} strokeWidth={1.6} />
        {product.image && (
          <img
            src={product.image}
            alt={product.name[lang]}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
          title={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition active:scale-90"
          style={{ background: "rgba(255,255,255,0.9)" }}
        >
          <Heart
            size={16}
            strokeWidth={2}
            color={isWishlisted ? "var(--gc-tomato)" : "var(--gc-muted)"}
            fill={isWishlisted ? "var(--gc-tomato)" : "transparent"}
            className={heartAnim ? "animate-heart-pop" : ""}
          />
        </button>
        {product.stock > 0 && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={
              product.stock <= 10
                ? { background: "var(--cat-sut-bg)", color: "var(--gc-mango-dark)" }
                : { background: "rgba(255,255,255,0.9)", color: "var(--gc-muted-dark)" }
            }
          >
            {t.inStock(product.stock)} {t.unit[product.baseUnit]}
          </span>
        )}
        {disabled && (
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "rgba(43,38,32,0.55)" }}
          >
            {t.outOfStock}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="min-h-10">
          <p className="font-display text-sm sm:text-[15px] font-semibold leading-tight wrap-break-word" style={{ color: "var(--gc-charcoal)" }}>
            {product.name[lang]}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--gc-muted)" }}>{product.brand}</p>
          <button
            type="button"
            onClick={() => setReviewsOpen(true)}
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold transition hover:opacity-75"
            style={{ color: "var(--gc-muted)" }}
          >
            <Star size={12} strokeWidth={1.8} color="var(--gc-mango)" fill={avgRating > 0 ? "var(--gc-mango)" : "transparent"} />
            {avgRating > 0 ? avgRating.toFixed(1) : t.noRatingsYet}
            <span className="underline decoration-dotted">· {t.reviewsCount(productReviews.length)}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOptionIdx(i)}
              className="rounded-full border px-2.5 py-1 text-[11px] font-bold transition whitespace-normal"
              style={{
                background: i === optionIdx ? style.accent : "var(--gc-cream-2)",
                color: i === optionIdx ? "#fff" : "var(--gc-muted-dark)",
                borderColor: i === optionIdx ? style.accent : "var(--gc-border)",
                transform: i === optionIdx ? "translateY(-1px)" : "none",
              }}
            >
              {optionLabel(opt, lang, t)}
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-[15px] sm:text-[17px] font-bold leading-none wrap-break-word" style={{ color: "var(--gc-charcoal)" }}>
            {formatMoney(unitPrice, lang, t)}
          </span>
          <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, maxQty)} disabled={disabled || isAdmin} />
        </div>

        {outOfStock ? (
          <button
            type="button"
            disabled={notifyRequested || isAdmin}
            onClick={handleNotifyRequest}
            className="mt-auto w-full overflow-hidden rounded-full px-2 py-2 text-[10.5px] font-extrabold tracking-[-0.01em] transition active:scale-[0.98]"
            style={{
              background: notifyRequested || isAdmin ? "var(--gc-cream-2)" : style.accent,
              color: notifyRequested || isAdmin ? "var(--gc-muted-dark)" : "#fff",
              cursor: notifyRequested || isAdmin ? "default" : "pointer",
              whiteSpace: "normal",
              lineHeight: 1.2,
            }}
          >
            {notifyRequested ? t.notifyRequested : t.notifyWhenInStock}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || isAdmin}
            onClick={handleAdd}
            className="mt-auto w-full overflow-hidden rounded-full px-2 py-2 text-[10.5px] font-extrabold tracking-[-0.01em] transition active:scale-[0.98]"
            style={{
              background: disabled || isAdmin ? "var(--gc-border)" : flash ? "var(--gc-forest)" : style.accent,
              color: disabled || isAdmin ? "var(--gc-muted-light)" : "#fff",
              boxShadow: disabled || isAdmin ? "none" : "0 8px 16px rgba(27,77,62,0.18)",
              cursor: disabled || isAdmin ? "not-allowed" : "pointer",
              whiteSpace: "normal",
              lineHeight: 1.2,
            }}
          >
            <span className="flex items-center justify-center gap-2 leading-none text-center">
              {isAdmin ? null : flash ? <Check size={15} /> : <ShoppingCart size={14} />}
              {isAdmin ? (
                t.adminCannotBuy
              ) : flash ? (
                t.added
              ) : (
                <>
                  <span className="inline lg:hidden">{t.addToCart}</span>
                  <span className="hidden lg:inline">{`${t.addToCart} · ${formatMoney(lineTotal, lang, t)}`}</span>
                </>
              )}
            </span>
          </button>
        )}
      </div>

      {reviewsOpen && (
        <ReviewsModal
          productId={product.id}
          productName={product.name[lang]}
          onClose={() => setReviewsOpen(false)}
        />
      )}
    </div>
  );
}

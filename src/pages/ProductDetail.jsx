import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Heart, ShoppingCart, Star } from "lucide-react";
import { useApp } from "../context/AppContext";
import { CATEGORIES, CAT_ICON, CAT_STYLE } from "../data/categories";
import { formatMoney, optionFactor, optionLabel, unitOptions } from "../utils/units";
import Stepper from "../components/Stepper";
import ReviewsModal from "../components/ReviewsModal";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t, products, addToCart, currentUser, showToast, wishlist, toggleWishlist, reviews, requestStockNotification } = useApp();
  const product = products.find((p) => p.id === id);

  const options = useMemo(() => (product ? unitOptions(product.baseUnit) : []), [product]);
  const [optionIdx, setOptionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const timerRef = useRef(null);

  const productReviews = useMemo(
    () => (product ? reviews.filter((r) => r.productId === product.id) : []),
    [reviews, product]
  );
  const avgRating = productReviews.length > 0 ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 0;
  const isWishlisted = !!product && wishlist.includes(product.id);
  const isAdmin = currentUser?.role === "admin";

  const option = options[optionIdx];
  const factor = product && option ? optionFactor(product, option) : 1;
  const unitPrice = product ? product.price * factor : 0;
  const lineTotal = unitPrice * qty;
  const maxQty = product ? Math.floor(product.stock / factor) : 0;
  const disabled = !product || product.stock <= 0 || maxQty <= 0;
  const outOfStock = !product || product.stock <= 0;
  const notifyRequested = !!currentUser && !!product && (product.notifyRequests || []).includes(currentUser.email);

  // Clamp qty when option changes or stock changes — same rule as ProductCard.jsx.
  useEffect(() => {
    if (!product) return;
    if (maxQty <= 0) setQty(1);
    else if (qty > maxQty) setQty(maxQty);
    else if (qty < 1) setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionIdx, product?.stock, maxQty]);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <p className="text-sm mb-5" style={{ color: "var(--gc-muted)" }}>{t.productNotFound}</p>
        <Link to="/dokon" className="px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "var(--gc-leaf)" }}>
          {t.backToShop}
        </Link>
      </div>
    );
  }

  const style = CAT_STYLE[product.category] || CAT_STYLE.sabzavot;
  const Icon = CAT_ICON[product.category] || CAT_ICON.sabzavot;
  const categoryLabel = t[(CATEGORIES.find((c) => c.id === product.category) || CATEGORIES[0]).key];

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
    const allowedQty = Math.min(qty, maxQty);
    addToCart({
      key: `${product.id}-${optionIdx}`,
      productId: product.id,
      name: product.name[lang],
      category: product.category,
      optionLabel: optionLabel(option, lang, t),
      unitPrice,
      qty: allowedQty,
      factor,
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

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    setHeartAnim(true);
    window.setTimeout(() => setHeartAnim(false), 450);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold mb-4"
        style={{ color: "var(--gc-leaf)" }}
      >
        <ArrowLeft size={14} /> {t.backToShop}
      </button>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative aspect-square rounded-3xl overflow-hidden flex items-center justify-center" style={{ background: style.bg }}>
          <Icon size={72} color={style.fg} strokeWidth={1.4} />
          {product.image && (
            <img
              src={product.image}
              alt={product.name[lang]}
              className="absolute inset-0 h-full w-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
            title={isWishlisted ? t.removeFromWishlist : t.addToWishlist}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition active:scale-90"
            style={{ background: "rgba(255,255,255,0.9)" }}
          >
            <Heart
              size={20}
              strokeWidth={2}
              color={isWishlisted ? "var(--gc-tomato)" : "var(--gc-muted)"}
              fill={isWishlisted ? "var(--gc-tomato)" : "transparent"}
              className={heartAnim ? "animate-heart-pop" : ""}
            />
          </button>
          {product.stock > 0 && (
            <span
              className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold"
              style={
                product.stock <= 10
                  ? { background: "var(--cat-sut-bg)", color: "var(--gc-mango-dark)" }
                  : { background: "var(--gc-forest)", color: "#fff" }
              }
            >
              {t.inStock(product.stock)} {t.unit[product.baseUnit]}
            </span>
          )}
          {disabled && (
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "rgba(43,38,32,0.55)" }}
            >
              {t.outOfStock}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-2" style={{ background: style.bg, color: style.fg }}>
              {categoryLabel}
            </span>
            <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{product.name[lang]}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--gc-muted)" }}>{product.brand}</p>
            <button
              type="button"
              onClick={() => setReviewsOpen(true)}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-75"
              style={{ color: "var(--gc-muted)" }}
            >
              <Star size={14} strokeWidth={1.8} color="var(--gc-mango)" fill={avgRating > 0 ? "var(--gc-mango)" : "transparent"} />
              {avgRating > 0 ? avgRating.toFixed(1) : t.noRatingsYet}
              <span className="underline decoration-dotted">· {t.reviewsCount(productReviews.length)}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setOptionIdx(i)}
                className="rounded-full border px-3.5 py-1.5 text-sm font-bold transition"
                style={{
                  background: i === optionIdx ? style.accent : "var(--gc-cream-2)",
                  color: i === optionIdx ? "#fff" : "var(--gc-muted-dark)",
                  borderColor: i === optionIdx ? style.accent : "var(--gc-border)",
                }}
              >
                {optionLabel(opt, lang, t)}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-2xl font-bold" style={{ color: "var(--gc-charcoal)" }}>
              {formatMoney(unitPrice, lang, t)}
            </span>
            <Stepper value={qty} onChange={setQty} min={1} max={Math.max(1, maxQty)} disabled={disabled || isAdmin} />
          </div>

          {outOfStock ? (
            <button
              type="button"
              disabled={notifyRequested || isAdmin}
              onClick={handleNotifyRequest}
              className="w-full py-3 rounded-full text-sm font-extrabold transition active:scale-[0.98]"
              style={{
                background: notifyRequested || isAdmin ? "var(--gc-cream-2)" : style.accent,
                color: notifyRequested || isAdmin ? "var(--gc-muted-dark)" : "#fff",
                cursor: notifyRequested || isAdmin ? "default" : "pointer",
              }}
            >
              {notifyRequested ? t.notifyRequested : t.notifyWhenInStock}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || isAdmin}
              onClick={handleAdd}
              className="w-full py-3 rounded-full text-sm font-extrabold transition active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: disabled || isAdmin ? "var(--gc-border)" : flash ? "var(--gc-forest)" : style.accent,
                color: disabled || isAdmin ? "var(--gc-muted-light)" : "#fff",
                boxShadow: disabled || isAdmin ? "none" : "0 8px 16px rgba(27,77,62,0.18)",
                cursor: disabled || isAdmin ? "not-allowed" : "pointer",
              }}
            >
              {isAdmin ? null : flash ? <Check size={16} /> : <ShoppingCart size={15} />}
              {isAdmin ? t.adminCannotBuy : flash ? t.added : `${t.addToCart} · ${formatMoney(lineTotal, lang, t)}`}
            </button>
          )}
        </div>
      </div>

      {reviewsOpen && (
        <ReviewsModal productId={product.id} productName={product.name[lang]} onClose={() => setReviewsOpen(false)} />
      )}
    </div>
  );
}

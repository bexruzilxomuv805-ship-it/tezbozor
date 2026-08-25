import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, LocateFixed, Loader2, Gift, MapPin, X, Tag } from "lucide-react";
import { useApp } from "../context/AppContext";
import { CAT_STYLE, CAT_ICON } from "../data/categories";
import { cartReservedQty, formatMoney, productImages, resolveItemName } from "../utils/units";
import { POINT_VALUE, discountForPoints } from "../utils/loyalty";
import { computePromoDiscount } from "../utils/promo";
import Stepper from "../components/Stepper";

const PROMO_ERROR_KEY = {
  notFound: "promoErrorNotFound",
  expired: "promoErrorExpired",
  limitReached: "promoErrorLimitReached",
  alreadyUsed: "promoErrorAlreadyUsed",
};

export default function Cart() {
  const {
    cart, lang, t, products, updateCartQty, removeFromCart, cartTotal, cartCount, checkout, checkoutInProgress,
    currentUser, showToast, loyaltyPoints, savedAddresses, addSavedAddress, deleteSavedAddress,
    appliedPromoCode, applyPromoCode, removePromoCode, settings,
  } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [locating, setLocating] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const [promoInput, setPromoInput] = useState("");

  // Stock is one shared pool per product across all its unit-option lines (see cartReservedQty
  // in units.js) — the cap for THIS line is the stock left after every OTHER line for the same
  // product, so setting this line's qty up to that cap can never push the product's total over
  // its stock, regardless of how many different options (1kg/500g/250g...) are in the cart.
  const maxQtyForLine = useCallback((item, product) => {
    if (!product) return item.qty;
    const factor = item.factor || 1;
    const reservedByOtherLines = cartReservedQty(cart, item.productId) - factor * item.qty;
    return Math.floor((product.stock - reservedByOtherLines) / factor);
  }, [cart]);

  const selectSavedAddress = (a) => {
    setFullName(a.fullName);
    setPhone(a.phone);
    setAddress(a.address);
    setSelectedSavedId(a.id);
  };

  const promoDiscount = appliedPromoCode ? computePromoDiscount(appliedPromoCode, cartTotal) : 0;
  const afterPromo = Math.max(0, cartTotal - promoDiscount);
  const maxUsablePoints = Math.max(0, Math.min(loyaltyPoints, Math.floor(afterPromo / POINT_VALUE)));
  const safePointsToUse = Math.min(pointsToUse, maxUsablePoints);
  const pointsDiscount = discountForPoints(safePointsToUse);
  const goodsTotal = Math.max(0, afterPromo - pointsDiscount);
  // Mirrors the same rule checkout() applies server-side-of-truth — see AppContext.jsx.
  const qualifiesForFreeDelivery = settings.freeDeliveryThreshold > 0 && cartTotal >= settings.freeDeliveryThreshold;
  const deliveryFee = qualifiesForFreeDelivery ? 0 : (settings.deliveryFee || 0);
  const finalTotal = goodsTotal + deliveryFee;
  const belowMinOrder = settings.minOrderAmount > 0 && cartTotal < settings.minOrderAmount;
  const amountToFreeDelivery = settings.freeDeliveryThreshold > 0 ? Math.max(0, settings.freeDeliveryThreshold - cartTotal) : 0;

  const handleApplyPromo = () => {
    const result = applyPromoCode(promoInput);
    if (!result.ok) {
      const message = result.error === "minOrder"
        ? t.promoErrorMinOrder(formatMoney(result.minOrderAmount, lang, t))
        : t[PROMO_ERROR_KEY[result.error]] || t.promoErrorNotFound;
      showToast(message, "error");
      return;
    }
    showToast(t.promoCodeApplied(result.promo.code), "success");
    setPromoInput("");
  };

  // Auto-check on every visit and every stock update: clamp/remove cart lines that now exceed
  // available stock (e.g. admin reduced stock after the item was added to the cart, possibly
  // more than once while this page stays open). Relies on `item.qty <= maxQty` to converge —
  // once a line is clamped down to maxQty, this loop naturally stops touching it again until
  // stock drops further.
  useEffect(() => {
    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      const maxQty = product ? maxQtyForLine(item, product) : 0;
      if (item.qty <= maxQty) continue;
      const itemName = resolveItemName(item, products, lang);
      if (maxQty <= 0) {
        removeFromCart(item.key);
        showToast(t.cartAdjustedRemoved(itemName), "error");
      } else {
        updateCartQty(item.key, maxQty);
        showToast(t.cartAdjustedReduced(itemName, maxQty), "info");
      }
    }
  }, [cart, products, lang, removeFromCart, updateCartQty, showToast, t, maxQtyForLine]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast(t.locationUnsupported, "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setAddress(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          showToast(t.locationDetected, "info");
        } catch (e) {
          showToast(t.locationFailed, "error");
        } finally {
          setLocating(false);
        }
      },
      () => {
        showToast(t.locationFailed, "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckout = () => {
    if (!currentUser) {
      showToast(t.guestCheckoutBlocked, "error");
      navigate('/login');
      return;
    }
    if (!fullName.trim() || !address.trim() || !phone.trim()) {
      showToast(t.deliveryInfoRequired, "error");
      return;
    }
    if (belowMinOrder) {
      showToast(t.minOrderRequired(formatMoney(settings.minOrderAmount, lang, t)), "error");
      return;
    }

    if (saveThisAddress) {
      addSavedAddress({ fullName: fullName.trim(), phone: phone.trim(), address: address.trim() });
    }

    (async () => {
      const id = await checkout({ fullName: fullName.trim(), address: address.trim(), phone: phone.trim(), pointsToUse: safePointsToUse });
      if (id) navigate(`/buyurtma-qabul-qilindi/${id}`);
    })();
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gc-cream-2)" }}>
          <ShoppingCart size={26} color="var(--gc-muted)" />
        </div>
        <p className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.cartEmptyTitle}</p>
        <p className="text-sm mt-1 mb-5" style={{ color: "var(--gc-muted)" }}>{t.cartEmptyBody}</p>
        <Link
          to="/dokon"
          className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: "var(--gc-leaf)" }}
        >
          {t.goShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-semibold mb-4" style={{ color: "var(--gc-charcoal)" }}>
        {t.cart} <span style={{ color: "var(--gc-muted)", fontSize: 15 }}>· {t.itemsCount(cartCount)}</span>
      </h1>

      <div className="flex flex-col gap-2.5 mb-5">
        {cart.map((item) => {
          const style = CAT_STYLE[item.category] || CAT_STYLE.sabzavot;
          const Icon = CAT_ICON[item.category] || CAT_ICON.sabzavot;
          const product = products.find((p) => p.id === item.productId);
          const maxQty = product ? maxQtyForLine(item, product) : item.qty;
          return (
            <div
              key={item.key}
              className="flex items-center gap-3 p-3 rounded-2xl bg-(--gc-surface)"
              style={{ border: "1px solid var(--gc-border)" }}
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                <Icon size={20} color={style.fg} strokeWidth={1.6} />
                {product && productImages(product)[0] && (
                  <img src={productImages(product)[0]} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{product ? product.name[lang] : item.name}</p>
                <p className="text-xs" style={{ color: "var(--gc-muted)" }}>
                  {item.optionLabel} · {formatMoney(item.unitPrice, lang, t)}
                </p>
              </div>
              <Stepper
                value={item.qty}
                min={0}
                max={Math.max(1, maxQty)}
                onChange={(v) => (v <= 0 ? removeFromCart(item.key) : updateCartQty(item.key, v))}
              />
              <button
                onClick={() => removeFromCart(item.key)}
                aria-label={t.remove}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition shrink-0"
              >
                <Trash2 size={15} color="var(--gc-tomato-dark)" />
              </button>
            </div>
          );
        })}
      </div>

      {savedAddresses.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold mb-2" style={{ color: "var(--gc-muted)" }}>{t.savedAddresses}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedAddresses.map((a) => {
              const active = selectedSavedId === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectSavedAddress(a)}
                  className="relative shrink-0 w-52 text-left rounded-xl p-3 pr-7 transition"
                  style={{
                    background: active ? "var(--gc-cream-2)" : "var(--gc-surface)",
                    border: `1.5px solid ${active ? "var(--gc-forest)" : "var(--gc-border)"}`,
                  }}
                >
                  <p className="text-xs font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{a.fullName}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--gc-muted)" }}>{a.phone}</p>
                  <p className="flex items-start gap-1 text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--gc-muted-dark)" }}>
                    <MapPin size={11} className="shrink-0 mt-0.5" /> {a.address}
                  </p>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedAddress(a.id);
                      if (selectedSavedId === a.id) setSelectedSavedId(null);
                    }}
                    aria-label={t.remove}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/5 transition"
                  >
                    <X size={12} color="var(--gc-muted)" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4 bg-(--gc-surface) flex flex-col gap-2.5" style={{ border: "1px solid var(--gc-border)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{t.deliveryInfo}</p>
        <input
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setSelectedSavedId(null); }}
          placeholder={t.fullName}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setSelectedSavedId(null); }}
          placeholder={t.phone}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
        />
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => { setAddress(e.target.value); setSelectedSavedId(null); }}
            placeholder={t.address}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
          />
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            aria-label={t.detectLocation}
            title={t.detectLocation}
            className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl transition"
            style={{ background: "var(--gc-leaf)", opacity: locating ? 0.6 : 1 }}
          >
            <LocateFixed size={18} color="#fff" className={locating ? "animate-pulse" : ""} />
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: "var(--gc-muted-dark)" }}>
          <input
            type="checkbox"
            checked={saveThisAddress}
            onChange={(e) => setSaveThisAddress(e.target.checked)}
            className="h-4 w-4 rounded"
            style={{ accentColor: "var(--gc-forest)" }}
          />
          {t.saveThisAddress}
        </label>
      </div>

      <div className="rounded-2xl p-4 mb-4 bg-(--gc-surface) flex flex-col gap-2.5" style={{ border: "1px solid var(--gc-border)" }}>
        <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>
          <Tag size={15} color="var(--gc-leaf)" /> {t.promoCode}
        </p>
        {appliedPromoCode ? (
          <div className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "var(--gc-cream-2)" }}>
            <span className="text-sm font-bold" style={{ color: "var(--gc-forest)" }}>{appliedPromoCode.code}</span>
            <button
              type="button"
              onClick={removePromoCode}
              className="text-xs font-bold shrink-0"
              style={{ color: "var(--gc-tomato-dark)" }}
            >
              {t.promoCodeRemove}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyPromo(); } }}
              placeholder={t.promoCodePlaceholder}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: promoInput.trim() ? "var(--gc-forest)" : "var(--gc-border)", cursor: promoInput.trim() ? "pointer" : "not-allowed" }}
            >
              {t.promoCodeApply}
            </button>
          </div>
        )}
      </div>

      {currentUser && maxUsablePoints > 0 && (
        <div className="rounded-2xl p-4 mb-4 bg-(--gc-surface) flex flex-col gap-2.5" style={{ border: "1px solid var(--gc-border)" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>
              <Gift size={15} color="var(--gc-mango-dark)" /> {t.loyaltyPoints}
            </p>
            <span className="text-xs font-semibold" style={{ color: "var(--gc-muted)" }}>{t.pointsAvailable(loyaltyPoints)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={maxUsablePoints}
              value={safePointsToUse}
              onChange={(e) => setPointsToUse(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-14 shrink-0 text-right text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{safePointsToUse}</span>
          </div>
          <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{t.maxPointsHint(maxUsablePoints)}</p>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ background: "var(--gc-cream-2)" }}>
        <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--gc-muted-dark)" }}>
          <span>{t.subtotal}</span>
          <span>{formatMoney(cartTotal, lang, t)}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--gc-leaf)" }}>
            <span>{t.promoDiscount}</span>
            <span>-{formatMoney(promoDiscount, lang, t)}</span>
          </div>
        )}
        {pointsDiscount > 0 && (
          <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--gc-leaf)" }}>
            <span>{t.pointsDiscount}</span>
            <span>-{formatMoney(pointsDiscount, lang, t)}</span>
          </div>
        )}
        {settings.deliveryFee > 0 && (
          <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--gc-muted-dark)" }}>
            <span>{t.deliveryFeeLine}</span>
            <span style={qualifiesForFreeDelivery ? { color: "var(--gc-leaf)", fontWeight: 700 } : undefined}>
              {qualifiesForFreeDelivery ? t.freeDelivery : formatMoney(deliveryFee, lang, t)}
            </span>
          </div>
        )}
        {settings.deliveryFee > 0 && amountToFreeDelivery > 0 && (
          <p className="text-[11px] mb-1.5" style={{ color: "var(--gc-muted)" }}>
            {t.freeDeliveryHint(formatMoney(amountToFreeDelivery, lang, t))}
          </p>
        )}
        <div className="flex justify-between text-lg font-bold mb-4" style={{ color: "var(--gc-charcoal)" }}>
          <span>{t.total}</span>
          <span>{formatMoney(finalTotal, lang, t)}</span>
        </div>
        {belowMinOrder && (
          <p className="text-xs font-bold text-center mb-2" style={{ color: "var(--gc-tomato-dark)" }}>
            {t.minOrderRequired(formatMoney(settings.minOrderAmount, lang, t))}
          </p>
        )}
        <button
          onClick={handleCheckout}
          disabled={checkoutInProgress || belowMinOrder}
          className="w-full py-3 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "var(--gc-forest)", opacity: checkoutInProgress || belowMinOrder ? 0.6 : 1 }}
        >
          {checkoutInProgress && <Loader2 size={16} className="animate-spin" />}
          {t.checkout}
        </button>
      </div>
    </div>
  );
}

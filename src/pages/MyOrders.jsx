import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { ClipboardList, MapPin, Receipt as ReceiptIcon, Ban } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatMoney, formatDate } from "../utils/units";
import { CAT_STYLE, CAT_ICON } from "../data/categories";
import { STATUS_STYLE } from "../data/orderStatus";
import ReceiptModal from "../components/ReceiptModal";

const CANCEL_REASON_KEYS = ["changedMind", "wrongOrder", "tooLong", "priceIssue", "other"];

export default function MyOrders() {
  const { t, lang, orders, products, currentUser, cancelOrder, showToast } = useApp();
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [cancelling, setCancelling] = useState(null); // order id being cancelled
  const [reasonKey, setReasonKey] = useState("changedMind");
  const [customReason, setCustomReason] = useState("");

  if (!currentUser) return <Navigate to="/login" replace />;

  const confirmCancel = () => {
    const reason = reasonKey === "other" ? customReason.trim() : t.cancelReasons[reasonKey];
    if (!reason) {
      showToast(t.cancelReasonRequired, "error");
      return;
    }
    cancelOrder(cancelling, reason);
    showToast(t.orderCancelled, "info");
    setCancelling(null);
    setCustomReason("");
    setReasonKey("changedMind");
  };

  const myOrders = orders.filter((o) => o.customerEmail === currentUser.email);

  if (myOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gc-cream-2)" }}>
          <ClipboardList size={26} color="var(--gc-muted)" />
        </div>
        <p className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.myOrdersEmptyTitle}</p>
        <p className="text-sm mt-1 mb-5" style={{ color: "var(--gc-muted)" }}>{t.myOrdersEmptyBody}</p>
        <Link to="/dokon" className="px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "var(--gc-leaf)" }}>
          {t.goShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display text-xl sm:text-2xl font-semibold mb-4" style={{ color: "var(--gc-charcoal)" }}>
        {t.myOrders} <span style={{ color: "var(--gc-muted)", fontSize: 15 }}>· {t.itemsCount(myOrders.length)}</span>
      </h1>

      <div className="flex flex-col gap-3">
        {myOrders.map((o) => {
          const status = o.status || "new";
          const style = STATUS_STYLE[status];
          return (
            <div key={o.id} className="rounded-2xl p-3.5 sm:p-4 bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{t.admin.orderFrom} #{o.id}</p>
                  <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{formatDate(o.date, lang)}</p>
                </div>
                <span
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                  style={{ background: style.bg, color: style.fg }}
                >
                  {t.admin.status[status]}
                </span>
              </div>

              {o.address && (
                <div className="flex items-center gap-1 text-xs mb-2" style={{ color: "var(--gc-muted-dark)" }}>
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{o.address}</span>
                </div>
              )}

              {status === "cancelled" && o.cancelReason && (
                <div className="text-xs mb-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)" }}>
                  {t.reasonLabel}: {o.cancelReason}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {o.items.map((it, idx) => {
                  const cStyle = CAT_STYLE[it.category] || CAT_STYLE.sabzavot;
                  const Icon = CAT_ICON[it.category] || CAT_ICON.sabzavot;
                  const product = products.find((p) => p.id === it.productId);
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: cStyle.bg }}>
                        {product?.image ? (
                          <img src={product.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={16} color={cStyle.fg} strokeWidth={1.6} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{product ? product.name[lang] : it.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{it.optionLabel} × {it.qty}</p>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: "var(--gc-charcoal)" }}>
                        {formatMoney(it.unitPrice * it.qty, lang, t)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="flex justify-between text-sm font-bold mt-2.5 pt-2.5"
                style={{ borderTop: "1px solid var(--gc-border)", color: "var(--gc-charcoal)" }}
              >
                <span>{t.total}</span>
                <span>{formatMoney(o.total, lang, t)}</span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setReceiptOrder(o)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition"
                  style={{ background: "var(--gc-cream-2)", color: "var(--gc-charcoal)" }}
                >
                  <ReceiptIcon size={13} /> {t.viewReceipt}
                </button>
                {status === "new" && (
                  <button
                    type="button"
                    onClick={() => setCancelling(o.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition"
                    style={{ background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)" }}
                  >
                    <Ban size={13} /> {t.cancelOrder}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}

      {cancelling && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(43,38,32,0.45)" }}
          onClick={() => setCancelling(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
            style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>{t.cancelOrderTitle}</h3>
            <p className="text-sm mb-3" style={{ color: "var(--gc-muted-dark)" }}>{t.cancelReasonPrompt}</p>

            <div className="flex flex-col gap-2 mb-3">
              {CANCEL_REASON_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition"
                  style={{
                    background: reasonKey === key ? "var(--gc-cream-2)" : "var(--gc-surface)",
                    border: `1.5px solid ${reasonKey === key ? "var(--gc-forest)" : "var(--gc-border)"}`,
                    color: "var(--gc-charcoal)",
                  }}
                >
                  <input
                    type="radio"
                    name="cancelReason"
                    checked={reasonKey === key}
                    onChange={() => setReasonKey(key)}
                    className="shrink-0"
                  />
                  {t.cancelReasons[key]}
                </label>
              ))}
            </div>

            {reasonKey === "other" && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t.otherReasonPlaceholder}
                rows={3}
                className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none mb-3"
                style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCancelling(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
              >
                {t.admin.cancel}
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--gc-tomato-dark)" }}
              >
                {t.confirmCancelOrder}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

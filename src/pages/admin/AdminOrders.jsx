import { useState } from "react";
import { ClipboardList, User, Phone, MapPin, Ban } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatMoney, formatDate } from "../../utils/units";
import { CAT_STYLE, CAT_ICON } from "../../data/categories";
import { ORDER_STATUSES, STATUS_STYLE } from "../../data/orderStatus";

const CANCEL_REASON_KEYS = ["outOfStock", "customerUnreachable", "invalidAddress", "deliveryUnavailable", "duplicateOrder", "other"];

export default function AdminOrders() {
  const { t, lang, orders, products, deleteOrder, updateOrderStatus, cancelOrder, showToast } = useApp();
  const [pendingDelete, setPendingDelete] = useState(null); // { id, label }
  const [cancelling, setCancelling] = useState(null); // order id being cancelled
  const [reasonKey, setReasonKey] = useState("outOfStock");
  const [customReason, setCustomReason] = useState("");
  const [filter, setFilter] = useState("all");

  const confirmCancel = () => {
    const reason = reasonKey === "other" ? customReason.trim() : t.admin.cancelReasons[reasonKey];
    if (!reason) {
      showToast(t.cancelReasonRequired, "error");
      return;
    }
    cancelOrder(cancelling, reason);
    showToast(t.orderCancelled, "info");
    setCancelling(null);
    setCustomReason("");
    setReasonKey("outOfStock");
  };

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => (o.status || "new") === s).length;
    return acc;
  }, {});

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => (o.status || "new") === filter);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.admin.ordersPageTitle}</h2>
          <p className="text-xs mt-1" style={{ color: "var(--gc-muted)" }}>{t.admin.ordersPageSubtitle}</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}>
          {t.admin.ordersCount(orders.length)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {ORDER_STATUSES.map((s) => {
          const style = STATUS_STYLE[s];
          const Icon = style.icon;
          return (
            <div key={s} className="rounded-2xl p-4 flex items-center gap-3 bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                <Icon size={18} color={style.fg} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--gc-muted)" }}>{t.admin.status[s]}</p>
                <p className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{statusCounts[s]}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 rounded-full p-1 min-w-0" style={{ background: "var(--gc-cream-2)" }}>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0"
          style={{ background: filter === "all" ? "var(--gc-forest)" : "transparent", color: filter === "all" ? "#fff" : "var(--gc-muted-dark)" }}
        >
          <ClipboardList size={13} /> {t.all}
        </button>
        {ORDER_STATUSES.map((s) => {
          const style = STATUS_STYLE[s];
          const Icon = style.icon;
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0"
              style={{ background: active ? style.fg : "transparent", color: active ? "#fff" : "var(--gc-muted-dark)" }}
            >
              <Icon size={13} /> {t.admin.status[s]}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl p-5 bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
        {filteredOrders.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--gc-muted)" }}>{t.admin.noOrders}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredOrders.map((o) => {
              const currentStatus = o.status || "new";
              return (
                <div key={o.id} className="rounded-xl p-3.5 flex flex-col sm:flex-row gap-3" style={{ background: "var(--gc-cream-2)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>
                          {t.admin.orderFrom} #{o.id}{o.customerName ? ` · ${o.customerName}` : ""}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{formatDate(o.date, lang)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: STATUS_STYLE[currentStatus].bg, color: STATUS_STYLE[currentStatus].fg }}
                        >
                          {t.admin.status[currentStatus]}
                        </span>
                        <button
                          type="button"
                          title={t.admin.delete}
                          aria-label={`Delete order ${o.id}`}
                          onClick={() => setPendingDelete({ id: o.id, label: `${t.admin.orderFrom} #${o.id}` })}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {(o.customerName || o.phone) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mb-1" style={{ color: "var(--gc-muted-dark)" }}>
                        {o.customerName && <span className="flex items-center gap-1"><User size={12} /> {o.customerName}</span>}
                        {o.phone && <span className="flex items-center gap-1"><Phone size={12} /> {o.phone}</span>}
                      </div>
                    )}
                    {o.address && (
                      <div className="flex items-center gap-1 text-xs mb-2" style={{ color: "var(--gc-muted-dark)" }}>
                        <MapPin size={12} /> {o.address}
                      </div>
                    )}

                    {currentStatus === "cancelled" && o.cancelReason && (
                      <div className="text-xs mb-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)" }}>
                        {t.reasonLabel}: {o.cancelReason}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 mt-1">
                      {o.items.map((it, idx) => {
                        const style = CAT_STYLE[it.category] || CAT_STYLE.sabzavot;
                        const Icon = CAT_ICON[it.category] || CAT_ICON.sabzavot;
                        const product = products.find((p) => p.id === it.productId);
                        return (
                          <div key={idx} className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                              {product?.image ? (
                                <img src={product.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Icon size={16} color={style.fg} strokeWidth={1.6} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{it.name}</p>
                              <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{it.optionLabel} × {it.qty}</p>
                            </div>
                            <span className="text-xs font-bold shrink-0" style={{ color: "var(--gc-charcoal)" }}>
                              {formatMoney(it.unitPrice * it.qty, lang, t)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-sm font-bold mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--gc-border)", color: "var(--gc-charcoal)" }}>
                      <span>{t.total}</span>
                      <span>{formatMoney(o.total, lang, t)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 sm:w-36 shrink-0 self-start">
                    {ORDER_STATUSES.map((s) => {
                      const style = STATUS_STYLE[s];
                      const Icon = style.icon;
                      const active = currentStatus === s;
                      const locked = currentStatus === "cancelled";
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            if (active || locked) return;
                            updateOrderStatus(o.id, s);
                            showToast(t.admin.orderStatusUpdated(t.admin.status[s]), "info");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                          style={{
                            background: active ? style.bg : "var(--gc-surface)",
                            color: active ? style.fg : "var(--gc-muted)",
                            border: `1.5px solid ${active ? style.fg : "var(--gc-border)"}`,
                            opacity: locked ? 0.45 : 1,
                            cursor: locked ? "not-allowed" : "pointer",
                          }}
                        >
                          <Icon size={13} /> {t.admin.status[s]}
                        </button>
                      );
                    })}
                    {!["cancelled", "delivered"].includes(currentStatus) && (
                      <button
                        type="button"
                        onClick={() => setCancelling(o.id)}
                        className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                        style={{ background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)", border: "1.5px solid transparent" }}
                      >
                        <Ban size={13} /> {t.cancelOrder}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-(--gc-surface) p-4 shadow-lg" style={{ border: "1px solid var(--gc-border)" }}>
            <div className="flex flex-col gap-3">
              <div className="text-sm font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.admin.confirmDelete}</div>
              <div className="text-xs" style={{ color: "var(--gc-muted)" }}>{`${pendingDelete.label}`}</div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setPendingDelete(null)} className="rounded-md px-3 py-2 bg-gray-100 text-sm">{t.admin.confirmNo}</button>
                <button type="button" onClick={() => { deleteOrder(pendingDelete.id); showToast(t.admin.orderDeleted, "info"); setPendingDelete(null); }} className="rounded-md px-3 py-2 bg-red-500 text-sm text-white">{t.admin.confirmYes}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    name="adminCancelReason"
                    checked={reasonKey === key}
                    onChange={() => setReasonKey(key)}
                    className="shrink-0"
                  />
                  {t.admin.cancelReasons[key]}
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

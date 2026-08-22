import { Printer } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatMoney, formatDate } from "../utils/units";
import { CAT_STYLE, CAT_ICON } from "../data/categories";
import { STATUS_STYLE } from "../data/orderStatus";
import { printReceipt } from "../utils/printReceipt";

export default function Receipt({ order }) {
  const { t, lang, products } = useApp();
  const status = order.status || "new";
  const style = STATUS_STYLE[status];

  return (
    <div
      className="w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-(--gc-surface)"
      style={{ border: "1px solid var(--gc-border)", boxShadow: "0 14px 32px rgba(27,77,62,0.08)" }}
    >
      <div className="h-1.5 w-full" style={{ background: style.fg }} />

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo-icon.png" alt="" className="h-11 w-11 rounded-2xl shrink-0" style={{ background: "var(--gc-cream-2)" }} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base font-bold leading-tight truncate" style={{ color: "var(--gc-charcoal)" }}>{t.appName}</p>
            <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{t.receipt} · #{order.id}</p>
          </div>
          <span
            className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: style.bg, color: style.fg }}
          >
            {t.admin.status[status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--gc-cream-2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gc-muted)" }}>{t.receiptOrderNo}</p>
            <p className="text-xs font-bold font-mono truncate mt-0.5" style={{ color: "var(--gc-charcoal)" }}>#{order.id}</p>
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--gc-cream-2)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--gc-muted)" }}>{t.receiptDate}</p>
            <p className="text-xs font-bold truncate mt-0.5" style={{ color: "var(--gc-charcoal)" }}>{formatDate(order.date, lang)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {order.items.map((it, idx) => {
            const cStyle = CAT_STYLE[it.category] || CAT_STYLE.sabzavot;
            const Icon = CAT_ICON[it.category] || CAT_ICON.sabzavot;
            const product = products.find((p) => p.id === it.productId);
            return (
              <div key={idx} className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 shrink-0">
                  <div
                    className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: cStyle.bg }}
                  >
                    {product?.image ? (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon size={16} color={cStyle.fg} strokeWidth={1.6} />
                    )}
                  </div>
                  <span
                    className="absolute -right-2 -bottom-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: "var(--gc-forest)", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
                  >
                    {it.qty}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{product ? product.name[lang] : it.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--gc-muted)" }}>{it.optionLabel}</p>
                </div>
                <span className="text-xs font-bold font-mono shrink-0" style={{ color: "var(--gc-charcoal)" }}>
                  {formatMoney(it.unitPrice * it.qty, lang, t)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: "var(--gc-cream-2)" }}>
          <div className="flex justify-between text-xs" style={{ color: "var(--gc-muted-dark)" }}>
            <span>{t.subtotal}</span>
            <span className="font-mono">{formatMoney(order.subtotal ?? order.total, lang, t)}</span>
          </div>
          {order.pointsDiscount > 0 && (
            <div className="flex justify-between text-xs" style={{ color: "var(--gc-leaf)" }}>
              <span>{t.pointsDiscount}</span>
              <span className="font-mono">-{formatMoney(order.pointsDiscount, lang, t)}</span>
            </div>
          )}
          <div
            className="flex justify-between text-base font-bold mt-1 pt-2"
            style={{ color: "var(--gc-charcoal)", borderTop: "1px dashed var(--gc-border)" }}
          >
            <span>{t.total}</span>
            <span className="font-mono">{formatMoney(order.total, lang, t)}</span>
          </div>
        </div>

        <div
          className="h-5 mt-4"
          aria-hidden="true"
          style={{
            background: "repeating-linear-gradient(90deg, var(--gc-charcoal) 0 2px, transparent 2px 5px)",
            opacity: 0.55,
          }}
        />

        <button
          type="button"
          onClick={() => printReceipt(order, t, lang, products)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white transition active:scale-[0.98]"
          style={{ background: "var(--gc-forest)" }}
        >
          <Printer size={15} /> {t.printReceipt}
        </button>
      </div>
    </div>
  );
}

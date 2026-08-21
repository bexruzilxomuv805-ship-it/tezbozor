import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CAT_STYLE, CAT_ICON } from "../../data/categories";

export default function StockAlerts({ products, lang, t }) {
  const outOfStock = products.filter((p) => p.stock === 0).sort((a, b) => a.name[lang].localeCompare(b.name[lang]));
  const lowStock = products
    .filter((p) => p.stock > 0 && p.stock <= 10)
    .sort((a, b) => a.stock - b.stock);
  const alerts = [...outOfStock, ...lowStock];

  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-white" style={{ border: "1px solid var(--gc-border)" }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-base font-semibold" style={{ color: "var(--gc-charcoal)" }}>
          {t.admin.stockAlerts}
        </h3>
        {alerts.length > 0 && (
          <Link to="/admin/mahsulotlar" className="text-xs font-bold shrink-0" style={{ color: "var(--gc-leaf)" }}>
            {t.viewAll}
          </Link>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2.5 py-4">
          <CheckCircle2 size={18} color="var(--gc-leaf)" />
          <p className="text-sm" style={{ color: "#6B6455" }}>{t.admin.stockAlertsEmpty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 6).map((p) => {
            const isOut = p.stock === 0;
            const style = CAT_STYLE[p.category] || CAT_STYLE.sabzavot;
            const Icon = CAT_ICON[p.category] || CAT_ICON.sabzavot;
            return (
              <div key={p.id} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: "var(--gc-cream-2)" }}>
                <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon size={16} color={style.fg} strokeWidth={1.6} />
                  )}
                </div>
                <p className="flex-1 min-w-0 text-xs font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>
                  {p.name[lang]}
                </p>
                <span
                  className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: isOut ? "#FBE6DE" : "#FDF1DC",
                    color: isOut ? "var(--gc-tomato-dark)" : "var(--gc-mango-dark)",
                  }}
                >
                  <AlertTriangle size={11} />
                  {isOut ? t.outOfStock : `${t.admin.lowStockBadge} · ${p.stock}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Package, ClipboardList, Wallet, AlertTriangle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatMoney } from "../../utils/units";
import SalesChart from "../../components/admin/SalesChart";
import StockAlerts from "../../components/admin/StockAlerts";

export default function AdminDashboard() {
  const { t, lang, products, orders } = useApp();

  const totalRevenue = orders.filter((o) => (o.status || "new") !== "cancelled").reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;

  const stats = [
    { icon: Package, label: t.admin.totalProducts, value: products.length, bg: "var(--cat-sabzavot-bg)", fg: "var(--cat-sabzavot-fg)" },
    { icon: ClipboardList, label: t.admin.totalOrders, value: orders.length, bg: "var(--gc-danger-soft)", fg: "var(--gc-tomato-dark)" },
    { icon: Wallet, label: t.admin.totalRevenue, value: formatMoney(totalRevenue, lang, t), bg: "var(--cat-sut-bg)", fg: "var(--gc-mango-dark)" },
    { icon: AlertTriangle, label: t.admin.lowStockCount, value: lowStock, bg: "var(--cat-non-bg)", fg: "var(--cat-non-fg)" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl p-5 flex items-center gap-4 bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon size={20} color={s.fg} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--gc-muted)" }}>{s.label}</p>
              <p className="font-display text-xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <SalesChart orders={orders} lang={lang} t={t} />
      <StockAlerts products={products} lang={lang} t={t} />
    </div>
  );
}

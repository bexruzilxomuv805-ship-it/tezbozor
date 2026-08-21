import { NavLink, Outlet, Link, Navigate } from "react-router-dom";
import { LayoutGrid, Package, ClipboardList, ArrowLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function AdminLayout() {
  const { t, currentUser, newOrdersCount } = useApp();

  // redirect non-admins
  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabStyle = (isActive) => ({
    background: isActive ? "var(--gc-forest)" : "transparent",
    color: isActive ? "#fff" : "var(--gc-muted-dark)",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>
            {t.admin.title}
          </h1>
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold mt-1" style={{ color: "var(--gc-leaf)" }}>
            <ArrowLeft size={12} /> {t.admin.backToSite}
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-full p-1 min-w-0 w-full sm:w-auto" style={{ background: "var(--gc-cream-2)" }}>
          <NavLink to="/admin" end style={({ isActive }) => tabStyle(isActive)} className="px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0">
            <LayoutGrid size={13} /> {t.admin.dashboard}
          </NavLink>
          <NavLink to="/admin/mahsulotlar" style={({ isActive }) => tabStyle(isActive)} className="px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0">
            <Package size={13} /> {t.admin.products}
          </NavLink>
          <NavLink to="/admin/buyurtmalar" style={({ isActive }) => tabStyle(isActive)} className="relative px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0">
            <ClipboardList size={13} /> {t.admin.orders}
            {newOrdersCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--gc-tomato)" }}
              >
                {newOrdersCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/foydalanuvchilar" style={({ isActive }) => tabStyle(isActive)} className="px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0">
            <LayoutGrid size={13} /> {t.admin.users || 'Users'}
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}

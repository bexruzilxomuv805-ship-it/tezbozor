import { Home, ShoppingBag, ShoppingCart, UserCircle2, LayoutGrid, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function BottomTabBar() {
  const { cartCount, currentUser, t, newOrdersCount, wishlist } = useApp();

  const profileTab = !currentUser
    ? { to: "/login", label: t.login, Icon: UserCircle2 }
    : currentUser.role === "admin"
      ? { to: "/admin", label: t.navAdmin, Icon: LayoutGrid, badge: newOrdersCount }
      : { to: "/profil", label: t.profile, Icon: UserCircle2 };

  const items = [
    { to: "/", label: t.navHome, Icon: Home },
    { to: "/dokon", label: t.navShop, Icon: ShoppingBag },
    { to: "/sevimlilar", label: t.wishlist, Icon: Heart, badge: wishlist.length },
    { to: "/savat", label: t.cart, Icon: ShoppingCart, badge: cartCount },
    profileTab,
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-(--gc-surface-alt)/95 backdrop-blur-md shadow-[0_-10px_30px_rgba(16,36,28,0.08)] lg:hidden" style={{ borderColor: "rgba(43,38,32,0.08)" }}>
      <div className="mx-auto flex max-w-2xl items-center justify-between px-3 pb-[max(env(safe-area-inset-bottom),0.7rem)] pt-2">
        {items.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition"
            style={({ isActive }) => ({
              color: isActive ? "var(--gc-forest)" : "var(--gc-muted-dark)",
            })}
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full transition" style={{ background: "rgba(27,77,62,0.08)" }}>
              <Icon size={18} strokeWidth={2.1} />
              {typeof badge === "number" && badge > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: "var(--gc-tomato)" }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, Globe, LayoutGrid, Store, ClipboardList, LogOut, Heart, UserCircle2, Sun, Moon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { LANGS } from "../i18n/translations";

export default function Header() {
  const { lang, setLang, t, theme, toggleTheme, cartCount, currentUser, logout, newOrdersCount, wishlist } = useApp();
  const navigate = useNavigate();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const navLinkClass = ({ isActive }) =>
    "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition " +
    (isActive ? "bg-(--gc-forest-light) text-white" : "text-white/85 hover:bg-white/10");

  return (
    <>
    <header className="sticky top-0 z-40" style={{ background: "var(--gc-forest)" }}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-8 sm:h-9 w-auto" />
          <span className="font-display text-base font-bold text-white sm:text-lg">{t.appName}</span>
        </Link>

        <div className="hidden items-center gap-1.5 lg:flex">
          <NavLink to="/" end className={navLinkClass}>
            <Store size={12} /> {t.navHome}
          </NavLink>
          <NavLink to="/dokon" className={navLinkClass}>
            <Store size={12} /> {t.navShop}
          </NavLink>
          {currentUser && currentUser.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>
              <LayoutGrid size={12} /> {t.navAdmin}
              {newOrdersCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ background: "var(--gc-tomato)" }}
                >
                  {newOrdersCount}
                </span>
              )}
            </NavLink>
          )}
          {currentUser && currentUser.role !== 'admin' && (
            <NavLink to="/buyurtmalarim" className={navLinkClass}>
              <ClipboardList size={12} /> {t.myOrders}
            </NavLink>
          )}
          {currentUser && (
            <NavLink to="/profil" className={navLinkClass}>
              <UserCircle2 size={12} /> {t.profile}
            </NavLink>
          )}
        </div>

        {/* desktop header search removed per request (search kept on page-level) */}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center shrink-0 overflow-hidden rounded-full" style={{ background: "var(--gc-forest-light)" }}>
            <Globe size={13} color="#8FB8A8" className="ml-1 sm:ml-2.5" />
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-1 py-1.5 text-[10px] font-bold uppercase sm:px-2 sm:text-[11px]"
                style={{ color: lang === l ? "var(--gc-mango)" : "#B9D6C9" }}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.lightMode : t.darkMode}
            title={theme === "dark" ? t.lightMode : t.darkMode}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-90 sm:h-9 sm:w-9"
            style={{ background: "var(--gc-forest-light)" }}
          >
            {theme === "dark" ? (
              <Sun key="sun" size={15} className="animate-icon-pop" color="var(--gc-mango)" />
            ) : (
              <Moon key="moon" size={15} className="animate-icon-pop" color="#B9D6C9" />
            )}
          </button>

          {/* Admins land on /admin from the bottom tab bar on mobile, so unlike regular users
              they have no other route to their own profile there — give them a compact icon here. */}
          {currentUser && currentUser.role === 'admin' && (
            <Link
              to="/profil"
              title={t.profile}
              aria-label={t.profile}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full lg:hidden"
              style={{ background: "var(--gc-forest-light)" }}
            >
              <UserCircle2 size={16} color="#fff" />
            </Link>
          )}

          {/* Account controls (profile/login/register/logout) live in the bottom tab bar +
              Profile page on phone/tablet — keeping them here too caused the header to overflow
              on narrow screens, so they're desktop-only here. */}
          <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
            {currentUser ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white shadow-sm sm:px-2.5 sm:text-xs">
                  <span className="truncate max-w-10 sm:max-w-32.5 uppercase">{currentUser.name || currentUser.email || 'BEXRUZ_ADMIN'}</span>
                </div>

                <button
                  onClick={() => setConfirmingLogout(true)}
                  className="shrink-0 rounded-full px-2 py-1.5 text-[10px] font-bold text-white/90 transition hover:bg-white/10 sm:px-2.5 sm:text-xs"
                >
                  {t.logout || 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-2.5 py-1.5 text-[10px] font-bold text-white/90 transition hover:bg-white/10 sm:text-xs">
                  {t.login || 'Login'}
                </Link>
                <Link to="/register" className="rounded-full px-2.5 py-1.5 text-[10px] font-bold text-white/90 transition hover:bg-white/10 sm:text-xs">
                  {t.register || 'Register'}
                </Link>
              </>
            )}
          </div>

          <Link
            to="/sevimlilar"
            className="relative hidden h-9 w-9 items-center justify-center rounded-full lg:flex"
            style={{ background: "var(--gc-forest-light)" }}
            aria-label={t.wishlist}
          >
            <Heart size={16} color="#fff" />
            {wishlist.length > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--gc-tomato)" }}
              >
                {wishlist.length}
              </span>
            )}
          </Link>

          <Link
            to="/savat"
            className="relative hidden h-9 w-9 items-center justify-center rounded-full lg:flex"
            style={{ background: "var(--gc-forest-light)" }}
            aria-label={t.cart}
          >
            <ShoppingCart size={16} color="#fff" />
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--gc-tomato)" }}
              >
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

    </header>

    {confirmingLogout && (
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4" style={{ background: "rgba(43,38,32,0.45)" }} onClick={() => setConfirmingLogout(false)}>
        <div
          className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
          style={{ border: "1px solid var(--gc-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gc-danger-soft)" }}>
            <LogOut size={19} color="var(--gc-tomato-dark)" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>
            {t.logoutConfirmTitle}
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--gc-muted-dark)" }}>
            {t.logoutConfirmBody}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingLogout(false)}
              className="flex-1 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
            >
              {t.logoutConfirmCancel}
            </button>
            <button
              onClick={() => {
                logout();
                setConfirmingLogout(false);
                navigate('/');
              }}
              className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: "var(--gc-tomato-dark)" }}
            >
              {t.logoutConfirmYes}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

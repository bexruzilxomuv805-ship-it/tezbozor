import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { UserCircle2, Gift, MapPin, Heart, ClipboardList, X, LogOut } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Profile() {
  const { t, currentUser, updateProfileName, showToast, loyaltyPoints, savedAddresses, deleteSavedAddress, wishlist, logout } = useApp();
  const [name, setName] = useState(currentUser?.name || "");
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const navigate = useNavigate();

  if (!currentUser) return <Navigate to="/login" replace />;

  const canSave = name.trim().length > 0 && name.trim() !== currentUser.name;

  const saveName = () => {
    if (!canSave) return;
    updateProfileName(name.trim());
    showToast(t.profileNameUpdated, "info");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.profile}</h1>

      <div className="rounded-2xl p-4 bg-white flex flex-col gap-3" style={{ border: "1px solid var(--gc-border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--gc-cream-2)" }}>
            <UserCircle2 size={26} color="var(--gc-forest)" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{currentUser.name}</p>
            <p className="text-xs truncate" style={{ color: "#8A8271" }}>{currentUser.email}</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: "#8A8271", fontWeight: 700 }}>{t.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
          />
        </label>
        <button
          type="button"
          onClick={saveName}
          disabled={!canSave}
          className="self-start px-5 py-2 rounded-full text-sm font-bold text-white transition active:scale-[0.98]"
          style={{ background: canSave ? "var(--gc-forest)" : "var(--gc-border)", color: canSave ? "#fff" : "#A39D8C", cursor: canSave ? "pointer" : "not-allowed" }}
        >
          {t.admin.save}
        </button>
      </div>

      <div className="rounded-2xl p-4 bg-white flex items-center justify-between" style={{ border: "1px solid var(--gc-border)" }}>
        <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>
          <Gift size={16} color="var(--gc-mango-dark)" /> {t.loyaltyPoints}
        </p>
        <span className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{loyaltyPoints}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/sevimlilar"
          className="rounded-2xl p-4 bg-white flex items-center gap-2.5 transition hover:-translate-y-0.5"
          style={{ border: "1px solid var(--gc-border)" }}
        >
          <Heart size={16} color="var(--gc-tomato)" />
          <span className="text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{t.wishlist} · {wishlist.length}</span>
        </Link>
        <Link
          to="/buyurtmalarim"
          className="rounded-2xl p-4 bg-white flex items-center gap-2.5 transition hover:-translate-y-0.5"
          style={{ border: "1px solid var(--gc-border)" }}
        >
          <ClipboardList size={16} color="var(--gc-forest)" />
          <span className="text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{t.myOrders}</span>
        </Link>
      </div>

      <div className="rounded-2xl p-4 bg-white flex flex-col gap-3" style={{ border: "1px solid var(--gc-border)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{t.savedAddresses}</p>
        {savedAddresses.length === 0 ? (
          <p className="text-sm" style={{ color: "#8A8271" }}>{t.noSavedAddresses}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {savedAddresses.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-xl p-3"
                style={{ background: "var(--gc-cream-2)" }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{a.fullName}</p>
                  <p className="text-[11px] truncate" style={{ color: "#8A8271" }}>{a.phone}</p>
                  <p className="flex items-start gap-1 text-[11px] mt-0.5" style={{ color: "#6B6455" }}>
                    <MapPin size={11} className="shrink-0 mt-0.5" /> {a.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSavedAddress(a.id)}
                  aria-label={t.remove}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5 transition"
                >
                  <X size={13} color="#8A8271" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setConfirmingLogout(true)}
        className="flex items-center justify-center gap-2 rounded-2xl p-4 bg-white text-sm font-bold transition hover:bg-black/2"
        style={{ border: "1px solid var(--gc-border)", color: "var(--gc-tomato-dark)" }}
      >
        <LogOut size={16} /> {t.logout}
      </button>

      {confirmingLogout && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4" style={{ background: "rgba(43,38,32,0.45)" }} onClick={() => setConfirmingLogout(false)}>
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-white"
            style={{ border: "1px solid var(--gc-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "#FBE6DE" }}>
              <LogOut size={19} color="var(--gc-tomato-dark)" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>
              {t.logoutConfirmTitle}
            </h3>
            <p className="text-sm mb-5" style={{ color: "#6B6455" }}>
              {t.logoutConfirmBody}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingLogout(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "#6B6455" }}
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
    </div>
  );
}

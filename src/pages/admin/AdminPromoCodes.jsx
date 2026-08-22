import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatMoney } from "../../utils/units";
import PromoCodeEditor from "../../components/admin/PromoCodeEditor";

export default function AdminPromoCodes() {
  const { t, lang, promoCodes, addPromoCode, updatePromoCode, deletePromoCode, showToast } = useApp();
  const [editing, setEditing] = useState(null); // promo | "new" | null
  const [pendingDelete, setPendingDelete] = useState(null); // { id, code }

  const handleSave = (form) => {
    if (form.id) {
      updatePromoCode(form);
      showToast(t.admin.promoCodeUpdated, "info");
    } else {
      addPromoCode(form);
      showToast(t.admin.promoCodeAdded, "info");
    }
    setEditing(null);
  };

  const describeValue = (p) => (p.type === "percent" ? `${p.value}%` : formatMoney(p.value, lang, t));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs" style={{ color: "var(--gc-muted)" }}>{t.admin.promoCodesCount(promoCodes.length)}</p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--gc-leaf)" }}
        >
          <Plus size={14} /> {t.admin.addPromoCode}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.promoCodeLabel}</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.promoValue}</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.promoUsedHeader}</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.promoActive}</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm" style={{ color: "var(--gc-muted)" }}>
                    {t.admin.noPromoCodesFound}
                  </td>
                </tr>
              ) : (
                promoCodes.map((p) => {
                  const expired = p.expiresAt && new Date(p.expiresAt) < new Date();
                  const limitReached = p.usageLimit > 0 && (p.usedCount || 0) >= p.usageLimit;
                  return (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--gc-border)" }}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold font-mono" style={{ color: "var(--gc-charcoal)" }}>{p.code}</div>
                        {(expired || limitReached) && (
                          <div className="text-[11px] font-bold" style={{ color: "var(--gc-tomato-dark)" }}>
                            {expired ? t.admin.promoExpiredLabel : t.admin.promoErrorLimitReached}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: "var(--gc-muted-dark)" }}>{describeValue(p)}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--gc-muted-dark)" }}>{t.admin.promoUsedCount(p.usedCount || 0)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{
                            background: p.active ? "var(--cat-sabzavot-bg)" : "var(--gc-border)",
                            color: p.active ? "var(--cat-sabzavot-fg)" : "var(--gc-muted-dark)",
                          }}
                        >
                          {p.active ? t.admin.promoStatusActive : t.admin.promoStatusInactive}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setEditing(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
                            style={{ border: "1px solid var(--gc-border)", color: "var(--gc-muted-dark)" }}
                          >
                            <Pencil size={12} /> {t.admin.edit}
                          </button>
                          <button
                            onClick={() => setPendingDelete({ id: p.id, code: p.code })}
                            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
                            style={{ background: "var(--gc-danger-soft)" }}
                            aria-label={t.admin.delete}
                          >
                            <Trash2 size={14} color="var(--gc-tomato-dark)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <PromoCodeEditor
          promo={editing === "new" ? null : editing}
          t={t}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(43,38,32,0.45)" }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
            style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gc-danger-soft)" }}>
              <Trash2 size={19} color="var(--gc-tomato-dark)" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>{t.admin.confirmDelete}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--gc-muted-dark)" }}>{t.admin.confirmDeletePromoCode(pendingDelete.code)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
              >
                {t.admin.confirmNo}
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePromoCode(pendingDelete.id);
                  showToast(t.admin.promoCodeDeleted, "info");
                  setPendingDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--gc-tomato-dark)" }}
              >
                {t.admin.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

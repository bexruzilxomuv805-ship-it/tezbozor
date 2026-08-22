import { useState } from "react";
import { X, Plus } from "lucide-react";
import { normalizePromoCode } from "../../utils/promo";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span style={{ color: "var(--gc-muted)", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

export default function PromoCodeEditor({ promo, t, onSave, onClose }) {
  const [form, setForm] = useState(
    promo
      ? { ...promo }
      : {
          id: null,
          code: "",
          type: "percent",
          value: 10,
          minOrderAmount: 0,
          maxDiscount: 0,
          usageLimit: 0,
          perUserOnce: true,
          expiresAt: "",
          active: true,
        }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSave = normalizePromoCode(form.code).length > 0 && form.value > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...form,
      code: normalizePromoCode(form.code),
      value: Number(form.value),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscount: Number(form.maxDiscount) || 0,
      usageLimit: Number(form.usageLimit) || 0,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(43,38,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--gc-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--gc-cream-2)" }}>
              <Plus size={18} color="var(--gc-leaf)" />
            </div>
            <h3 className="font-display text-lg font-semibold leading-tight" style={{ color: "var(--gc-charcoal)" }}>
              {promo ? t.admin.edit : t.admin.addPromoCode}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label={t.admin.promoCodeLabel}>
            <input
              className="admin-input"
              placeholder={t.admin.promoCodePlaceholderAdmin}
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.admin.promoType}>
              <select className="admin-input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="percent">{t.admin.promoTypePercent}</option>
                <option value="fixed">{t.admin.promoTypeFixed}</option>
              </select>
            </Field>
            <Field label={t.admin.promoValue}>
              <input
                type="number"
                min="0"
                className="admin-input"
                value={form.value}
                onChange={(e) => set("value", Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.admin.promoMinOrder}>
              <input
                type="number"
                min="0"
                className="admin-input"
                value={form.minOrderAmount}
                onChange={(e) => set("minOrderAmount", Number(e.target.value))}
              />
            </Field>
            {form.type === "percent" && (
              <Field label={t.admin.promoMaxDiscount}>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", Number(e.target.value))}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t.admin.promoUsageLimit}>
              <input
                type="number"
                min="0"
                className="admin-input"
                value={form.usageLimit}
                onChange={(e) => set("usageLimit", Number(e.target.value))}
              />
            </Field>
            <Field label={t.admin.promoExpiresAt}>
              <input
                type="date"
                className="admin-input"
                value={form.expiresAt ? String(form.expiresAt).slice(0, 10) : ""}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: "var(--gc-muted-dark)" }}>
            <input
              type="checkbox"
              checked={form.perUserOnce}
              onChange={(e) => set("perUserOnce", e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: "var(--gc-forest)" }}
            />
            {t.admin.promoPerUserOnce}
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: "var(--gc-muted-dark)" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: "var(--gc-forest)" }}
            />
            {t.admin.promoActive}
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
          >
            {t.admin.cancel}
          </button>
          <button
            disabled={!canSave}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: canSave ? "var(--gc-forest)" : "var(--gc-disabled)", cursor: canSave ? "pointer" : "not-allowed" }}
          >
            {t.admin.save}
          </button>
        </div>
      </div>

      <style>{`
        .admin-input {
          border: 1px solid var(--gc-border);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          background: var(--gc-surface);
          color: var(--gc-charcoal);
          outline: none;
        }
        .admin-input:focus { border-color: var(--gc-leaf); }
      `}</style>
    </div>
  );
}

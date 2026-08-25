import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-bold" style={{ color: "var(--gc-charcoal)" }}>{label}</span>
      {children}
      <span className="text-xs" style={{ color: "var(--gc-muted)" }}>{hint}</span>
    </label>
  );
}

export default function AdminSettings() {
  const { t, settings, updateSettings, showToast } = useApp();
  const [form, setForm] = useState({
    deliveryFee: settings.deliveryFee || 0,
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
    minOrderAmount: settings.minOrderAmount || 0,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateSettings({
      deliveryFee: Math.max(0, Number(form.deliveryFee) || 0),
      freeDeliveryThreshold: Math.max(0, Number(form.freeDeliveryThreshold) || 0),
      minOrderAmount: Math.max(0, Number(form.minOrderAmount) || 0),
    });
    showToast(t.admin.settingsSaved, "info");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--gc-cream-2)" }}>
          <SettingsIcon size={18} color="var(--gc-leaf)" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.admin.settingsPageTitle}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--gc-muted)" }}>{t.admin.settingsPageSubtitle}</p>
        </div>
      </div>

      <div className="rounded-2xl p-5 bg-(--gc-surface) flex flex-col gap-4 max-w-md" style={{ border: "1px solid var(--gc-border)" }}>
        <Field label={t.admin.deliveryFeeLabel} hint={t.admin.deliveryFeeHint}>
          <input
            type="number"
            min="0"
            className="admin-input"
            value={form.deliveryFee}
            onChange={(e) => set("deliveryFee", e.target.value)}
          />
        </Field>

        <Field label={t.admin.freeDeliveryThresholdLabel} hint={t.admin.freeDeliveryThresholdHint}>
          <input
            type="number"
            min="0"
            className="admin-input"
            value={form.freeDeliveryThreshold}
            onChange={(e) => set("freeDeliveryThreshold", e.target.value)}
          />
        </Field>

        <Field label={t.admin.minOrderAmountLabel} hint={t.admin.minOrderAmountHint}>
          <input
            type="number"
            min="0"
            className="admin-input"
            value={form.minOrderAmount}
            onChange={(e) => set("minOrderAmount", e.target.value)}
          />
        </Field>

        <button
          type="button"
          onClick={save}
          className="self-start px-5 py-2.5 rounded-full text-sm font-bold text-white transition active:scale-[0.98]"
          style={{ background: "var(--gc-forest)" }}
        >
          {t.admin.save}
        </button>
      </div>

      <style>{`
        .admin-input {
          border: 1px solid var(--gc-border);
          border-radius: 8px;
          padding: 8px 11px;
          font-size: 14px;
          background: var(--gc-cream);
          color: var(--gc-charcoal);
          outline: none;
        }
        .admin-input:focus { border-color: var(--gc-leaf); }
      `}</style>
    </div>
  );
}

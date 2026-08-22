import { useState } from "react";
import { Download, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

// Purely optional nudge toward the PWA install that's already built into this app (see
// vite.config.js) — never blocks the site. Closing it hides it only for this browser session
// (sessionStorage, not localStorage), so it's back next time the site is opened rather than
// gone for good — the Profile page also carries a permanent entry point for the same install.
export default function InstallAppBanner() {
  const { t } = useApp();
  const { standalone, isIos, canPromptInstall, installAvailable, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("installBannerDismissed") === "true"; } catch (e) { return false; }
  });

  if (standalone || dismissed || !installAvailable) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem("installBannerDismissed", "true"); } catch (e) {}
  };

  const handleInstall = async () => {
    await install();
    dismiss();
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ background: "var(--gc-cream-2)", borderBottom: "1px solid var(--gc-border)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gc-forest)" }}>
        <Download size={16} color="#fff" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{t.installAppTitle}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--gc-muted)" }}>
          {isIos && !canPromptInstall ? t.installAppIosHint : t.installAppBody}
        </p>
      </div>
      {canPromptInstall && (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--gc-forest)" }}
        >
          {t.installAppButton}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.close}
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 transition"
      >
        <X size={14} color="var(--gc-muted-dark)" />
      </button>
    </div>
  );
}

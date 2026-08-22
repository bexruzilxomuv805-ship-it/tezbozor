import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useApp } from "../context/AppContext";

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch (e) {
    return false;
  }
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Purely optional, dismissible nudge toward the PWA install that's already built into this
// app (see vite.config.js) — never blocks the site, never reappears once closed.
export default function InstallAppBanner() {
  const { t } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // "android" | "ios"

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem("installBannerDismissed") === "true") return;
    } catch (e) {}

    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);

    // iOS Safari never fires beforeinstallprompt — show the manual "Add to Home Screen" hint instead.
    if (isIos()) {
      setPlatform("ios");
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem("installBannerDismissed", "true"); } catch (e) {}
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible) return null;

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
          {platform === "ios" ? t.installAppIosHint : t.installAppBody}
        </p>
      </div>
      {platform === "android" && (
        <button
          type="button"
          onClick={install}
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

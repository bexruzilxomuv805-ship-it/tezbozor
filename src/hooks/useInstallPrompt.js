import { useCallback, useEffect, useState } from "react";

function detectIsIos() {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ Safari reports itself as "MacIntel" in its default desktop-mode UA — a real
  // Mac never has touch points, so that's what tells an iPad apart from an actual Mac here.
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

function detectStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  } catch (e) {
    return false;
  }
}

// Shared PWA-install state so the dismissible banner and the always-available Profile entry
// both trigger the same captured browser prompt (Android/Chrome/Edge), and agree on when to
// show iOS's manual "Add to Home Screen" case instead.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone] = useState(detectStandalone);
  const [isIos] = useState(detectIsIos);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return {
    standalone,
    isIos,
    canPromptInstall: !!deferredPrompt,
    installAvailable: !standalone && (!!deferredPrompt || isIos),
    install,
  };
}

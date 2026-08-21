import { useApp } from "../context/AppContext";

export default function Footer() {
  const { t } = useApp();
  return (
    <footer className="mt-10 hidden py-8 lg:block" style={{ background: "var(--gc-forest)" }}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-7 w-auto" />
          <span className="font-display text-white font-semibold text-sm">{t.appName}</span>
        </div>
        <p className="text-xs text-center" style={{ color: "#8FB8A8" }}>
          © {new Date().getFullYear()} {t.appName} · {t.tagline}
        </p>
      </div>
    </footer>
  );
}

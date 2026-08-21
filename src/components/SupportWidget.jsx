import { useState } from "react";
import { Headset, Send, Megaphone, Phone, X } from "lucide-react";
import { useApp } from "../context/AppContext";

const TELEGRAM_USER = "https://t.me/FRONT_END16";
const TELEGRAM_CHANNEL = "https://t.me/Front_End_pro16";
const PHONE_NUMBER = "+998958341545";

function SupportLink({ href, icon, iconBg, iconColor, label, sublabel }) {
  return (
    <a
      href={href}
      target={href.startsWith("tel:") ? undefined : "_blank"}
      rel={href.startsWith("tel:") ? undefined : "noopener noreferrer"}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition hover:bg-(--gc-cream-2)"
      style={{ color: "var(--gc-charcoal)" }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight min-w-0">
        <span className="truncate">{label}</span>
        {sublabel && (
          <span className="text-[11px] font-normal truncate" style={{ color: "var(--gc-muted)" }}>
            {sublabel}
          </span>
        )}
      </span>
    </a>
  );
}

export default function SupportWidget() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed z-60 bottom-24 right-4 lg:bottom-6 lg:right-6">
      {open && (
        <div
          className="absolute bottom-16 right-0 w-60 rounded-2xl bg-(--gc-surface) p-3 flex flex-col gap-1"
          style={{
            border: "1px solid var(--gc-border)",
            boxShadow: "0 16px 32px rgba(27,77,62,0.18)",
            animation: "modalPop 0.2s ease-out",
          }}
        >
          <div className="flex items-center justify-between px-1 pb-1.5 mb-0.5" style={{ borderBottom: "1px solid var(--gc-border)" }}>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--gc-muted)" }}>
              {t.support}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="w-6 h-6 flex items-center justify-center rounded-full transition hover:bg-black/5"
            >
              <X size={13} />
            </button>
          </div>

          <SupportLink
            href={TELEGRAM_USER}
            icon={<Send size={15} />}
            iconBg="var(--gc-telegram-soft)"
            iconColor="var(--gc-telegram-fg)"
            label={t.supportTelegram}
            sublabel="@FRONT_END16"
          />
          <SupportLink
            href={TELEGRAM_CHANNEL}
            icon={<Megaphone size={15} />}
            iconBg="var(--gc-telegram-soft)"
            iconColor="var(--gc-telegram-fg)"
            label={t.supportChannel}
            sublabel="Front_End_pro16"
          />
          <SupportLink
            href={`tel:${PHONE_NUMBER}`}
            icon={<Phone size={15} />}
            iconBg="var(--gc-cream-2)"
            iconColor="var(--gc-leaf)"
            label={t.supportCall}
            sublabel={PHONE_NUMBER}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.support}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white transition active:scale-95"
        style={{ background: "var(--gc-forest)", boxShadow: "0 12px 24px rgba(27,77,62,0.35)" }}
      >
        {!open && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-support-ping"
            style={{ background: "var(--gc-leaf)" }}
          />
        )}
        <span className="relative">{open ? <X size={22} /> : <Headset size={22} />}</span>
      </button>
    </div>
  );
}

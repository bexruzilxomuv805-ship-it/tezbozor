import { Plus, Minus } from "lucide-react";

export default function Stepper({ value, onChange, min = 1, max = 99, disabled = false }) {
  const dec = () => {
    if (disabled) return;
    onChange(Math.max(min, value - 1));
  };

  const inc = () => {
    if (disabled) return;
    onChange(Math.min(max, value + 1));
  };

  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-full transition " + (disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-black/5 active:scale-95");

  return (
    <div
      className={`flex items-center overflow-hidden rounded-full border bg-[#f8f6f0] shadow-sm ${disabled ? 'opacity-80' : ''}`}
      style={{ borderColor: "var(--gc-border)" }}
    >
      <button type="button" onClick={dec} className={btnClass} aria-label="minus" disabled={disabled}>
        <Minus size={13} strokeWidth={2.2} />
      </button>
      <span className="min-w-6 text-center text-sm font-bold leading-none text-[#2b2620]">{value}</span>
      <button type="button" onClick={inc} className={btnClass} aria-label="plus" disabled={disabled}>
        <Plus size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
}

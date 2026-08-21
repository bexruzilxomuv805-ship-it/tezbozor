export default function CategoryChip({ active, onClick, label, Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0"
      style={{
        background: active ? "var(--gc-forest)" : "var(--gc-cream-2)",
        color: active ? "#fff" : "#6B6455",
        border: active ? "1px solid var(--gc-forest)" : "1px solid var(--gc-border)",
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

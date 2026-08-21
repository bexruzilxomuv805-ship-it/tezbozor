import { useMemo, useState } from "react";
import { formatMoney, formatShortDate, formatWeekday } from "../../utils/units";

const DAILY_COUNT = 7;
const WEEKLY_COUNT = 8;

const W = 640;
const H = 240;
const BASELINE_Y = 172;
const TOP_PAD = 40;
const BAR_MAX_H = BASELINE_Y - TOP_PAD;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}

// Rounded top, square baseline — per mark spec (never rx on all four corners of a bar).
function roundedTopRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, Math.max(height, 0.01));
  return `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
}

export default function SalesChart({ orders, lang, t }) {
  const [mode, setMode] = useState("daily"); // daily | weekly
  const [hoverIdx, setHoverIdx] = useState(null);

  const buckets = useMemo(() => {
    const count = mode === "daily" ? DAILY_COUNT : WEEKLY_COUNT;
    const spanDays = mode === "daily" ? 1 : 7;
    const starts = [];
    if (mode === "daily") {
      for (let i = count - 1; i >= 0; i--) {
        const d = startOfDay(new Date());
        d.setDate(d.getDate() - i);
        starts.push(d);
      }
    } else {
      const base = startOfWeek(new Date());
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(d.getDate() - i * 7);
        starts.push(d);
      }
    }
    const validOrders = orders.filter((o) => (o.status || "new") !== "cancelled");
    return starts.map((start) => {
      const end = new Date(start);
      end.setDate(end.getDate() + spanDays);
      const total = validOrders
        .filter((o) => {
          const d = new Date(o.date);
          return d >= start && d < end;
        })
        .reduce((s, o) => s + o.total, 0);
      return { start, total };
    });
  }, [orders, mode]);

  const max = Math.max(1, ...buckets.map((b) => b.total));
  const peakIdx = buckets.reduce((best, b, i) => (b.total > buckets[best].total ? i : best), 0);
  const hasAnySales = buckets.some((b) => b.total > 0);

  const slot = W / buckets.length;
  const barWidth = Math.min(24, slot * 0.5);

  const hovered = hoverIdx !== null ? buckets[hoverIdx] : null;

  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-white" style={{ border: "1px solid var(--gc-border)" }}>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h3 className="font-display text-base font-semibold" style={{ color: "var(--gc-charcoal)" }}>
          {t.admin.salesChart}
        </h3>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--gc-cream-2)" }}>
          {["daily", "weekly"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setHoverIdx(null); }}
              className="px-3 py-1 rounded-full text-xs font-bold transition"
              style={{ background: mode === m ? "var(--gc-forest)" : "transparent", color: mode === m ? "#fff" : "#6B6455" }}
            >
              {m === "daily" ? t.admin.daily : t.admin.weekly}
            </button>
          ))}
        </div>
      </div>

      {!hasAnySales ? (
        <p className="text-sm text-center py-10" style={{ color: "#8A8271" }}>{t.admin.noSalesYet}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t.admin.salesChart}>
          <line x1={0} y1={BASELINE_Y} x2={W} y2={BASELINE_Y} stroke="var(--gc-border)" strokeWidth={1} />

          {buckets.map((b, i) => {
            const barH = max > 0 ? (b.total / max) * BAR_MAX_H : 0;
            const cx = slot * i + slot / 2;
            const x = cx - barWidth / 2;
            const y = BASELINE_Y - barH;
            const isHover = hoverIdx === i;
            const isPeak = i === peakIdx && b.total > 0;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                onClick={() => setHoverIdx((prev) => (prev === i ? null : i))}
                tabIndex={0}
                style={{ cursor: "pointer", outline: "none" }}
              >
                {/* generous invisible hit area, wider than the painted bar */}
                <rect x={cx - slot / 2} y={TOP_PAD} width={slot} height={BAR_MAX_H} fill="transparent" />
                <path
                  d={roundedTopRectPath(x, y, barWidth, Math.max(barH, 1.5), 4)}
                  fill={isHover ? "var(--gc-leaf)" : "var(--gc-forest)"}
                />
                {isPeak && (
                  <text x={cx} y={y - 10} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--gc-charcoal)">
                    {formatMoney(b.total, lang, t)}
                  </text>
                )}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="16" fontWeight="600" fill="#6B6455">
                  {mode === "daily" ? formatWeekday(b.start, lang) : formatShortDate(b.start, lang)}
                </text>
              </g>
            );
          })}

          {hovered && (() => {
            const i = hoverIdx;
            const barH = max > 0 ? (hovered.total / max) * BAR_MAX_H : 0;
            const cx = slot * i + slot / 2;
            const label = mode === "daily" ? formatShortDate(hovered.start, lang) : formatShortDate(hovered.start, lang);
            const valueStr = formatMoney(hovered.total, lang, t);
            const boxW = Math.max(90, valueStr.length * 9 + 24);
            const boxH = 44;
            let boxX = cx - boxW / 2;
            boxX = Math.max(2, Math.min(W - boxW - 2, boxX));
            const boxY = Math.max(2, BASELINE_Y - barH - boxH - 10);
            return (
              <g pointerEvents="none">
                <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={9} fill="var(--gc-charcoal)" opacity={0.95} />
                <text x={boxX + boxW / 2} y={boxY + 18} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">
                  {valueStr}
                </text>
                <text x={boxX + boxW / 2} y={boxY + 34} textAnchor="middle" fontSize="12" fill="#D8D2C2">
                  {label}
                </text>
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}

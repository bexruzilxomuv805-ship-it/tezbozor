import { useMemo, useState } from "react";
import { Send, CheckCircle2, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../utils/units";

function lastMessageOf(ticket) {
  return ticket.messages[ticket.messages.length - 1];
}

export default function AdminSupport() {
  const { t, lang, supportTickets, sendSupportReply, closeSupportTicket } = useApp();
  const [filter, setFilter] = useState("all"); // all | open | closed
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? supportTickets : supportTickets.filter((tk) => tk.status === filter);
    return [...filtered].sort((a, b) => {
      const aNeedsReply = a.status === "open" && lastMessageOf(a)?.from === "user";
      const bNeedsReply = b.status === "open" && lastMessageOf(b)?.from === "user";
      if (aNeedsReply !== bNeedsReply) return aNeedsReply ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }, [supportTickets, filter]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setReplyText("");
  };

  const submitReply = (id) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    sendSupportReply(id, trimmed);
    setReplyText("");
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.admin.supportPageTitle}</h2>
          <p className="text-xs mt-1" style={{ color: "var(--gc-muted)" }}>{t.admin.supportPageSubtitle}</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}>
          {t.admin.supportTicketsCount(supportTickets.length)}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 rounded-full p-1 min-w-0" style={{ background: "var(--gc-cream-2)" }}>
        {["all", "open", "closed"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0"
            style={{ background: filter === f ? "var(--gc-forest)" : "transparent", color: filter === f ? "#fff" : "var(--gc-muted-dark)" }}
          >
            {f === "all" ? t.all : f === "open" ? t.admin.ticketStatusOpen : t.admin.ticketStatusClosed}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
        {sorted.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--gc-muted)" }}>{t.admin.supportEmpty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((tk) => {
              const last = lastMessageOf(tk);
              const needsReply = tk.status === "open" && last?.from === "user";
              const expanded = expandedId === tk.id;
              return (
                <div key={tk.id} className="rounded-xl p-3.5" style={{ background: "var(--gc-cream-2)" }}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(tk.id)}
                    className="w-full flex items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--gc-charcoal)" }}>{tk.userName}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--gc-muted)" }}>{tk.userEmail}</p>
                      {last && (
                        <p className="text-xs mt-1 truncate" style={{ color: "var(--gc-muted-dark)" }}>
                          {last.from === "admin" ? "→ " : ""}{last.text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {needsReply && (
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: "var(--gc-danger-soft)", color: "var(--gc-tomato-dark)" }}
                        >
                          {t.admin.supportNeedsReply}
                        </span>
                      )}
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: tk.status === "open" ? "var(--cat-sabzavot-bg)" : "var(--gc-border)",
                          color: tk.status === "open" ? "var(--cat-sabzavot-fg)" : "var(--gc-muted-dark)",
                        }}
                      >
                        {tk.status === "open" ? t.admin.ticketStatusOpen : t.admin.ticketStatusClosed}
                      </span>
                      <ChevronDown size={16} color="var(--gc-muted)" style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 pt-3 flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--gc-border)" }}>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                        {tk.messages.map((m, i) => {
                          const mine = m.from === "admin";
                          return (
                            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className="max-w-[80%] rounded-xl px-3 py-2"
                                style={{ background: mine ? "var(--gc-forest)" : "var(--gc-surface)", color: mine ? "#fff" : "var(--gc-charcoal)" }}
                              >
                                <p className="text-xs whitespace-pre-wrap wrap-break-word">{m.text}</p>
                                <p className="text-[10px] mt-1" style={{ color: mine ? "rgba(255,255,255,0.65)" : "var(--gc-muted)" }}>
                                  {formatDate(m.date, lang)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitReply(tk.id); } }}
                          placeholder={t.admin.supportReplyPlaceholder}
                          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm outline-none"
                          style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)" }}
                        />
                        <button
                          type="button"
                          onClick={() => submitReply(tk.id)}
                          disabled={!replyText.trim()}
                          aria-label={t.admin.supportReplySend}
                          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full transition"
                          style={{ background: replyText.trim() ? "var(--gc-forest)" : "var(--gc-border)" }}
                        >
                          <Send size={14} color="#fff" />
                        </button>
                        {tk.status === "open" && (
                          <button
                            type="button"
                            onClick={() => closeSupportTicket(tk.id)}
                            title={t.admin.supportCloseTicket}
                            aria-label={t.admin.supportCloseTicket}
                            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
                            style={{ background: "var(--gc-danger-soft)" }}
                          >
                            <CheckCircle2 size={16} color="var(--gc-tomato-dark)" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

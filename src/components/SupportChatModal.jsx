import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Trash2, Pencil, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/units";

export default function SupportChatModal({ onClose }) {
  const { t, lang, myTicket, sendSupportMessage, markMySupportTicketSeen, deleteSupportMessage, editSupportMessage, deleteSupportTicket } = useApp();
  const [text, setText] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    markMySupportTicketSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [myTicket?.messages?.length]);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendSupportMessage(trimmed);
    setText("");
  };

  const messages = myTicket?.messages || [];

  const clearChat = () => {
    if (myTicket) deleteSupportTicket(myTicket.id);
    setConfirmingClear(false);
    onClose();
  };

  const startEdit = (i, currentText) => {
    setEditingIndex(i);
    setEditingText(currentText);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    editSupportMessage(myTicket.id, editingIndex, editingText);
    setEditingIndex(null);
    setEditingText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      style={{ background: "rgba(43,38,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md h-[min(600px,85vh)] flex flex-col rounded-2xl bg-(--gc-surface) overflow-hidden"
        style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--gc-border)" }}>
          <h3 className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.supportChatTitle}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                aria-label={t.clearChat}
                title={t.clearChat}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 transition"
              >
                <Trash2 size={15} color="var(--gc-tomato-dark)" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 transition"
            >
              <X size={16} color="var(--gc-muted-dark)" />
            </button>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--gc-muted)" }}>{t.supportChatEmpty}</p>
          ) : (
            messages.map((m, i) => {
              const mine = m.from === "user";
              const isEditing = editingIndex === i;

              if (isEditing) {
                return (
                  <div key={i} className="flex items-center gap-1.5 justify-end">
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--gc-cream-2)", border: "1.5px solid var(--gc-forest)" }}
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      aria-label={t.saveEdit}
                      className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "var(--gc-forest)" }}
                    >
                      <Check size={15} color="#fff" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      aria-label={t.cancelEdit}
                      className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ background: "var(--gc-cream-2)" }}
                    >
                      <X size={15} color="var(--gc-muted-dark)" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: mine ? "var(--gc-forest)" : "var(--gc-cream-2)",
                      color: mine ? "#fff" : "var(--gc-charcoal)",
                      borderBottomRightRadius: mine ? 4 : undefined,
                      borderBottomLeftRadius: mine ? undefined : 4,
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap wrap-break-word">{m.text}</p>
                    <p className="text-[10px] mt-1" style={{ color: mine ? "rgba(255,255,255,0.65)" : "var(--gc-muted)" }}>
                      {formatDate(m.date, lang)}{m.editedAt ? ` · ${t.editedLabel}` : ""}
                    </p>
                  </div>
                  {mine && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(i, m.text)}
                        aria-label={t.editMessage}
                        title={t.editMessage}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 transition"
                      >
                        <Pencil size={13} color="var(--gc-muted)" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSupportMessage(myTicket.id, i)}
                        aria-label={t.deleteMessage}
                        title={t.deleteMessage}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 transition"
                      >
                        <Trash2 size={13} color="var(--gc-muted)" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {myTicket?.status === "closed" && (
          <p className="px-4 pb-2 text-[11px] text-center shrink-0" style={{ color: "var(--gc-muted)" }}>{t.supportChatClosedHint}</p>
        )}

        <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--gc-border)" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.supportChatPlaceholder}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm outline-none"
            style={{ background: "var(--gc-cream-2)", border: "1px solid var(--gc-border)" }}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label={t.supportChatSend}
            className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition active:scale-95"
            style={{ background: text.trim() ? "var(--gc-forest)" : "var(--gc-border)" }}
          >
            <Send size={16} color="#fff" />
          </button>
        </form>

        {confirmingClear && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center p-4"
            style={{ background: "rgba(43,38,32,0.45)" }}
            onClick={() => setConfirmingClear(false)}
          >
            <div
              className="w-full max-w-xs rounded-2xl p-5 bg-(--gc-surface)"
              style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm mb-4" style={{ color: "var(--gc-muted-dark)" }}>{t.clearChatBody}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingClear(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold"
                  style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
                >
                  {t.clearChatCancel}
                </button>
                <button
                  onClick={clearChat}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: "var(--gc-tomato-dark)" }}
                >
                  {t.clearChatYes}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

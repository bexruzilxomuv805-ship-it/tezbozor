import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import Receipt from "./Receipt";

export default function ReceiptModal({ order, onClose }) {
  const { t } = useApp();

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      style={{ background: "rgba(43,38,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col gap-3"
        style={{ animation: "modalPop 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Receipt order={order} />
        <button
          type="button"
          onClick={onClose}
          className="w-full shrink-0 py-2.5 rounded-full text-sm font-bold transition active:scale-[0.98]"
          style={{ background: "var(--gc-surface)", color: "var(--gc-charcoal)", border: "1px solid var(--gc-border)" }}
        >
          {t.close}
        </button>
      </div>
    </div>,
    document.body
  );
}

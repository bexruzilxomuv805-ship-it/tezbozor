import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/units";
import StarRating from "./StarRating";

export default function ReviewsModal({ productId, productName, onClose }) {
  const { t, lang, reviews, currentUser, addOrUpdateReview, showToast } = useApp();

  const productReviews = reviews
    .filter((r) => r.productId === String(productId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const myUserId = currentUser ? currentUser.email : null;
  const myReview = productReviews.find((r) => r.userId === myUserId);

  const [rating, setRating] = useState(myReview?.rating || 0);
  const [comment, setComment] = useState(myReview?.comment || "");

  const submit = () => {
    if (!currentUser) {
      showToast(t.reviewLoginRequired, "error");
      return;
    }
    if (rating <= 0) return;
    addOrUpdateReview({ productId, rating, comment: comment.trim() });
    showToast(t.reviewSaved, "info");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      style={{ background: "rgba(43,38,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5"
        style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{t.reviews}</h3>
            <p className="text-xs truncate" style={{ color: "#8A8271" }}>{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 transition"
          >
            <X size={16} color="#6B6455" />
          </button>
        </div>

        <div className="mt-4 rounded-xl p-3.5" style={{ background: "var(--gc-cream-2)" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "var(--gc-charcoal)" }}>{t.yourReview}</p>
          <StarRating value={rating} onChange={setRating} size={22} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.reviewPlaceholder}
            rows={3}
            className="mt-2.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ background: "#fff", border: "1px solid var(--gc-border)" }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={rating <= 0}
            className="mt-2.5 w-full py-2.5 rounded-full text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ background: rating <= 0 ? "var(--gc-border)" : "var(--gc-forest)", color: rating <= 0 ? "#A39D8C" : "#fff" }}
          >
            {t.submitReview}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <p className="text-xs font-bold" style={{ color: "var(--gc-charcoal)" }}>{t.reviewsCount(productReviews.length)}</p>
          {productReviews.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#8A8271" }}>{t.noReviews}</p>
          ) : (
            productReviews.map((r) => (
              <div key={r.id} className="rounded-xl p-3" style={{ border: "1px solid var(--gc-border)" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--gc-charcoal)" }}>{r.userName}</span>
                  <span className="text-[11px] shrink-0" style={{ color: "#8A8271" }}>{formatDate(r.date, lang)}</span>
                </div>
                <StarRating value={r.rating} readOnly size={13} />
                {r.comment && (
                  <p className="text-sm mt-1.5" style={{ color: "#6B6455" }}>{r.comment}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

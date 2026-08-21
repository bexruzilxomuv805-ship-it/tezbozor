import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, size = 16, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const interactive = !readOnly && typeof onChange === "function";

  return (
    <div className={`inline-flex items-center gap-0.5 ${interactive ? "cursor-pointer" : ""}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "transition active:scale-90" : ""}
          style={{ lineHeight: 0, cursor: interactive ? "pointer" : "default" }}
          aria-label={`${n} star`}
        >
          <Star
            size={size}
            strokeWidth={1.6}
            color={n <= display ? "var(--gc-mango)" : "var(--gc-border)"}
            fill={n <= display ? "var(--gc-mango)" : "transparent"}
          />
        </button>
      ))}
    </div>
  );
}

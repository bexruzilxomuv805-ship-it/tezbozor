import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-28 px-6">
      <p className="font-display text-5xl font-semibold mb-3" style={{ color: "var(--gc-charcoal)" }}>404</p>
      <p className="text-sm mb-6" style={{ color: "#8A8271" }}>Sahifa topilmadi</p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
        style={{ background: "var(--gc-leaf)" }}
      >
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}

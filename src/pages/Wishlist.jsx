import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ProductCard";

export default function Wishlist() {
  const { t, products, wishlist } = useApp();
  const items = products.filter((p) => wishlist.includes(p.id));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--gc-cream-2)" }}>
          <Heart size={26} color="#8A8271" />
        </div>
        <p className="font-display text-lg font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.wishlistEmptyTitle}</p>
        <p className="text-sm mt-1 mb-5" style={{ color: "#8A8271" }}>{t.wishlistEmptyBody}</p>
        <Link to="/dokon" className="px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "var(--gc-leaf)" }}>
          {t.goShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-semibold mb-4" style={{ color: "var(--gc-charcoal)" }}>
        {t.wishlist} <span style={{ color: "#8A8271", fontSize: 15 }}>· {t.itemsCount(items.length)}</span>
      </h1>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

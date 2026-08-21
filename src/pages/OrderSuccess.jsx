import { Link, useParams } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { useApp } from "../context/AppContext";
import Receipt from "../components/Receipt";

export default function OrderSuccess() {
  const { t, orders } = useApp();
  const { orderId } = useParams();
  const order = orders.find((o) => o.id === orderId);

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--cat-sabzavot-bg)" }}>
        <PartyPopper size={28} color="var(--cat-sabzavot-fg)" />
      </div>
      <p className="font-display text-xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>{t.orderPlacedTitle}</p>
      <p className="text-sm mt-1 mb-6 max-w-xs" style={{ color: "var(--gc-muted)" }}>{t.orderPlacedBody(orderId)}</p>

      {order && <Receipt order={order} />}

      <Link
        to="/dokon"
        className="mt-6 px-5 py-2.5 rounded-full text-sm font-bold text-white"
        style={{ background: "var(--gc-leaf)" }}
      >
        {t.continueShopping}
      </Link>
    </div>
  );
}

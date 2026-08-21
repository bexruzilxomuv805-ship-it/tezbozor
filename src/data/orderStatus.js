import { Clock, ChefHat, Truck, CheckCircle2, XCircle } from "lucide-react";

export const ORDER_STATUSES = ["new", "preparing", "delivering", "delivered"];

// Colors are CSS custom properties (see src/index.css) so status badges re-theme
// automatically in dark mode, same as CAT_STYLE in data/categories.js.
export const STATUS_STYLE = {
  new: { bg: "var(--status-new-bg)", fg: "var(--gc-muted-dark)", icon: Clock },
  preparing: { bg: "var(--cat-sut-bg)", fg: "var(--gc-mango-dark)", icon: ChefHat },
  delivering: { bg: "var(--gc-telegram-soft)", fg: "var(--gc-telegram-fg)", icon: Truck },
  delivered: { bg: "var(--cat-sabzavot-bg)", fg: "var(--cat-sabzavot-fg)", icon: CheckCircle2 },
  cancelled: { bg: "var(--gc-danger-soft)", fg: "var(--gc-tomato-dark)", icon: XCircle },
};

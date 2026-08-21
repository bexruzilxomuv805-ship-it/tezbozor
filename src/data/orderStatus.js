import { Clock, ChefHat, Truck, CheckCircle2, XCircle } from "lucide-react";

export const ORDER_STATUSES = ["new", "preparing", "delivering", "delivered"];

export const STATUS_STYLE = {
  new: { bg: "#EFEBE0", fg: "#6B6455", icon: Clock },
  preparing: { bg: "#FDF1DC", fg: "#966114", icon: ChefHat },
  delivering: { bg: "#E3EEFB", fg: "#1F5FAE", icon: Truck },
  delivered: { bg: "#E6F0DE", fg: "#2F6B3A", icon: CheckCircle2 },
  cancelled: { bg: "#FBE6DE", fg: "#B23E1D", icon: XCircle },
};

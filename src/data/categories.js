import { Carrot, Apple, Milk, Wheat } from "lucide-react";

export const CATEGORIES = [
  { id: "sabzavot", icon: Carrot, key: "cat_sabzavot" },
  { id: "meva", icon: Apple, key: "cat_meva" },
  { id: "sut", icon: Milk, key: "cat_sut" },
  { id: "non", icon: Wheat, key: "cat_non" },
];

// Colors are CSS custom properties (see src/index.css) so category chips/badges/icons
// re-theme automatically in dark mode without touching every place that reads CAT_STYLE.
export const CAT_STYLE = {
  sabzavot: { bg: "var(--cat-sabzavot-bg)", fg: "var(--cat-sabzavot-fg)", accent: "var(--cat-sabzavot-accent)" },
  meva: { bg: "var(--cat-meva-bg)", fg: "var(--cat-meva-fg)", accent: "var(--cat-meva-accent)" },
  sut: { bg: "var(--cat-sut-bg)", fg: "var(--cat-sut-fg)", accent: "var(--cat-sut-accent)" },
  non: { bg: "var(--cat-non-bg)", fg: "var(--cat-non-fg)", accent: "var(--cat-non-accent)" },
};

export const CAT_ICON = { sabzavot: Carrot, meva: Apple, sut: Milk, non: Wheat };

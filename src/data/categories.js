import { Carrot, Apple, Milk, Wheat } from "lucide-react";

export const CATEGORIES = [
  { id: "sabzavot", icon: Carrot, key: "cat_sabzavot" },
  { id: "meva", icon: Apple, key: "cat_meva" },
  { id: "sut", icon: Milk, key: "cat_sut" },
  { id: "non", icon: Wheat, key: "cat_non" },
];

export const CAT_STYLE = {
  sabzavot: { bg: "#E6F0DE", fg: "#2F6B3A", accent: "#3F8355" },
  meva: { bg: "#FBE6DE", fg: "#B23E1D", accent: "#E8532E" },
  sut: { bg: "#FDF1DC", fg: "#966114", accent: "#F2A93B" },
  non: { bg: "#F3E9D8", fg: "#7A5A24", accent: "#C9922E" },
};

export const CAT_ICON = { sabzavot: Carrot, meva: Apple, sut: Milk, non: Wheat };

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Search, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/categories";
import CategoryChip from "../components/CategoryChip";
import ProductCard from "../components/ProductCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export default function Shop() {
  const { t, products, lang } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("kategoriya") || "all";
  const query = searchParams.get("q") || "";
  const debouncedQuery = useDebouncedValue(query, 400);
  const searching = query !== debouncedQuery;

  const setCategory = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === "all") next.delete("kategoriya");
    else next.set("kategoriya", id);
    setSearchParams(next);
  };

  const setQuery = (val) => {
    const next = new URLSearchParams(searchParams);
    if (!val) next.delete("q");
    else next.set("q", val);
    setSearchParams(next);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = category === "all" || p.category === category;
      const matchQuery = debouncedQuery.trim() === "" || p.name[lang].toLowerCase().includes(debouncedQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, category, debouncedQuery, lang]);

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--gc-charcoal)" }}>
          {t.navShop}
        </h1>
        <p className="text-sm mt-1 max-w-lg" style={{ color: "#6B6455" }}>{t.tagline}</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-3">
        <div className="relative max-w-sm">
          {searching ? (
            <Loader2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" color="#8A8271" />
          ) : (
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" color="#8A8271" />
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-full text-sm outline-none"
            style={{ background: "#fff", border: "1px solid var(--gc-border)" }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
        <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label={t.all} Icon={Package} />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={t[c.key]}
            Icon={c.icon}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {filtered.length === 0 ? (
          <p className="text-sm text-center py-16" style={{ color: "#8A8271" }}>—</p>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

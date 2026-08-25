import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CATEGORIES, CAT_STYLE, CAT_ICON } from "../../data/categories";
import ProductEditor from "../../components/ProductEditor";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { productImages } from "../../utils/units";

const PAGE_SIZE = 8;

export default function AdminProducts() {
  const { t, lang, products, updateProduct, deleteProduct, addProduct, showToast } = useApp();
  const [editing, setEditing] = useState(null); // product | "new" | null
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | outOfStock
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 400);
  const searching = query !== debouncedQuery;

  const handleSave = (form) => {
    if (form.id) {
      updateProduct(form);
      showToast(t.admin.productUpdated, "info");
    } else {
      addProduct(form);
      showToast(t.admin.productAdded, "info");
    }
    setEditing(null);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchQuery = debouncedQuery.trim() === "" || p.name[lang].toLowerCase().includes(debouncedQuery.trim().toLowerCase());
      const matchStatus = filter === "all" || p.stock === 0;
      return matchQuery && matchStatus;
    });
  }, [products, debouncedQuery, filter, lang]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [debouncedQuery, filter]);

  const onFilterChange = (v) => setFilter(v);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs" style={{ color: "var(--gc-muted)" }}>{t.admin.productsCount(products.length)}</p>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white"
          style={{ background: "var(--gc-leaf)" }}
        >
          <Plus size={14} /> {t.admin.addProduct}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-sm">
          {searching ? (
            <Loader2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" color="var(--gc-muted)" />
          ) : (
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" color="var(--gc-muted)" />
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-full text-sm outline-none"
            style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)" }}
          />
        </div>
        <div className="flex gap-2 rounded-full p-1 shrink-0" style={{ background: "var(--gc-cream-2)" }}>
          <button
            onClick={() => onFilterChange("all")}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition"
            style={{ background: filter === "all" ? "var(--gc-forest)" : "transparent", color: filter === "all" ? "#fff" : "var(--gc-muted-dark)" }}
          >
            {t.admin.allProducts}
          </button>
          <button
            onClick={() => onFilterChange("outOfStock")}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition"
            style={{ background: filter === "outOfStock" ? "var(--gc-tomato-dark)" : "transparent", color: filter === "outOfStock" ? "#fff" : "var(--gc-muted-dark)" }}
          >
            {t.admin.outOfStockOnly}
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-(--gc-surface)" style={{ border: "1px solid var(--gc-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}>
                <th className="text-left px-3 py-2.5 font-bold text-xs">ID</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.name}</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.category}</th>
                <th className="text-left px-3 py-2.5 font-bold text-xs">{t.admin.unit}</th>
                <th className="text-right px-3 py-2.5 font-bold text-xs">{t.admin.price}</th>
                <th className="text-right px-3 py-2.5 font-bold text-xs">{t.admin.stock}</th>
                <th className="text-center px-3 py-2.5 font-bold text-xs">{t.admin.image}</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm" style={{ color: "var(--gc-muted)" }}>
                    {t.admin.noProductsFound}
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => {
                  const low = p.stock > 0 && p.stock <= 10;
                  const zero = p.stock === 0;
                  const style = CAT_STYLE[p.category] || CAT_STYLE.sabzavot;
                  const Icon = CAT_ICON[p.category] || CAT_ICON.sabzavot;
                  return (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--gc-border)" }}>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "var(--gc-muted-light)" }}>{p.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold" style={{ color: "var(--gc-charcoal)" }}>{p.name[lang]}</div>
                        <div className="text-xs" style={{ color: "var(--gc-muted-light)" }}>{p.brand}</div>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: "var(--gc-muted-dark)" }}>
                        {t[(CATEGORIES.find((c) => c.id === p.category) || CATEGORIES[0]).key]}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: "var(--gc-muted-dark)" }}>{t.unit[p.baseUnit]}</td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={p.price}
                          onChange={(e) => updateProduct({ ...p, price: Math.max(0, Number(e.target.value) || 0) })}
                          className="admin-input text-right"
                          style={{ width: 90 }}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={p.stock}
                            onChange={(e) => updateProduct({ ...p, stock: Math.max(0, Number(e.target.value) || 0) })}
                            className="admin-input text-right"
                            style={{
                              width: 64,
                              color: zero ? "var(--gc-tomato-dark)" : low ? "var(--gc-mango-dark)" : "var(--gc-charcoal)",
                              fontWeight: zero || low ? 700 : 400,
                            }}
                          />
                          <span className="text-xs font-bold shrink-0" style={{ color: "var(--gc-muted)" }}>{t.unit[p.baseUnit]}</span>
                        </div>
                        {zero && p.notifyRequests?.length > 0 && (
                          <div className="text-[10px] font-bold text-right mt-0.5" style={{ color: "var(--gc-mango-dark)" }}>
                            {t.admin.notifyWaitingCount(p.notifyRequests.length)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-center">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                            <Icon size={18} color={style.fg} strokeWidth={1.6} />
                            {productImages(p)[0] && (
                              <img src={productImages(p)[0]} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setEditing(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
                            style={{ border: "1px solid var(--gc-border)", color: "var(--gc-muted-dark)" }}
                          >
                            <Pencil size={12} /> {t.admin.edit}
                          </button>
                          <button
                            onClick={() => setPendingDelete({ id: p.id, name: p.name[lang] })}
                            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
                            style={{ background: "var(--gc-danger-soft)" }}
                            aria-label={t.admin.delete}
                          >
                            <Trash2 size={14} color="var(--gc-tomato-dark)" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderTop: "1px solid var(--gc-border)", background: "var(--gc-cream-2)" }}>
          <span className="text-xs font-bold" style={{ color: "var(--gc-muted-dark)" }}>{t.admin.pageOf(safePage, totalPages)}</span>
          <div className="flex gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)", color: safePage <= 1 ? "var(--gc-muted-light)" : "var(--gc-muted-dark)", cursor: safePage <= 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={13} /> {t.admin.prevPage}
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)", color: safePage >= totalPages ? "var(--gc-muted-light)" : "var(--gc-muted-dark)", cursor: safePage >= totalPages ? "not-allowed" : "pointer" }}
            >
              {t.admin.nextPage} <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          t={t}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          style={{ background: "rgba(43,38,32,0.45)" }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 bg-(--gc-surface)"
            style={{ border: "1px solid var(--gc-border)", animation: "modalPop 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gc-danger-soft)" }}>
              <Trash2 size={19} color="var(--gc-tomato-dark)" />
            </div>
            <h3 className="font-display text-lg font-semibold mb-1" style={{ color: "var(--gc-charcoal)" }}>{t.admin.confirmDelete}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--gc-muted-dark)" }}>{t.admin.confirmDeleteProduct(pendingDelete.name)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-bold"
                style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
              >
                {t.admin.confirmNo}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(pendingDelete.id);
                  showToast(t.admin.productDeleted, "info");
                  setPendingDelete(null);
                }}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: "var(--gc-tomato-dark)" }}
              >
                {t.admin.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-input {
          border: 1px solid var(--gc-border);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          background: var(--gc-cream);
          color: var(--gc-charcoal);
          outline: none;
        }
        .admin-input:focus { border-color: var(--gc-leaf); }
      `}</style>
    </div>
  );
}

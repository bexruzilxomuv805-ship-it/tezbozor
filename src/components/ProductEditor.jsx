import { useEffect, useRef, useState } from "react";
import { X, Plus, ImageUp, Loader2 } from "lucide-react";
import { CATEGORIES } from "../data/categories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { translateText } from "../utils/translate";

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span style={{ color: "var(--gc-muted)", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const UPLOAD_BASE = import.meta.env.VITE_UPLOAD_BASE || (import.meta.env.DEV ? "http://localhost:4102" : "/api");

export default function ProductEditor({ product, t, onSave, onClose }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(
    product
      ? { ...product, name: { ...product.name } }
      : {
          id: null,
          name: { uz: "", ru: "", en: "" },
          category: "sabzavot",
          baseUnit: "kg",
          price: 0,
          stock: 0,
          brand: "",
          image: "",
        }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setName = (langKey, v) => setForm((f) => ({ ...f, name: { ...f.name, [langKey]: v } }));

  // Auto-fill ru/en from the uz name via machine translation, so the admin only has to
  // type the name once. A field is (re)translated whenever it's empty, still just a copy
  // of the uz text (covers legacy products saved before this existed, e.g. name.ru === name.uz),
  // or still holds our own last auto-fill — a manual edit that differs from all of those wins
  // and is left alone.
  const [translating, setTranslating] = useState(false);
  const lastAutoRef = useRef({ ru: "", en: "" });
  const debouncedUzName = useDebouncedValue(form.name.uz, 500);

  useEffect(() => {
    const uzName = debouncedUzName.trim();
    if (!uzName) return;
    const needsRu = [uzName, "", lastAutoRef.current.ru].includes(form.name.ru.trim());
    const needsEn = [uzName, "", lastAutoRef.current.en].includes(form.name.en.trim());
    if (!needsRu && !needsEn) return;
    let cancelled = false;
    (async () => {
      setTranslating(true);
      const [ru, en] = await Promise.all([
        needsRu ? translateText(uzName, "uz", "ru") : Promise.resolve(null),
        needsEn ? translateText(uzName, "uz", "en") : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setForm((f) => ({
        ...f,
        name: {
          ...f.name,
          ru: needsRu && ru ? ru : f.name.ru,
          en: needsEn && en ? en : f.name.en,
        },
      }));
      lastAutoRef.current = { ru: needsRu && ru ? ru : lastAutoRef.current.ru, en: needsEn && en ? en : lastAutoRef.current.en };
      setTranslating(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUzName]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const res = await fetch(`${UPLOAD_BASE}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.uz || file.name, dataUrl: reader.result }),
        });
        const data = await res.json();
        // Serve freshly-uploaded images from the upload server itself: Vite's dev-server
        // public-dir passthrough only picks up files present at startup, so a relative
        // "/uploads/..." path can 404 there for a file written just now.
        set("image", data.url ? `${UPLOAD_BASE}${data.url}` : reader.result);
      } catch (err) {
        // upload server unavailable: fall back to storing the image inline
        set("image", reader.result);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const canSave = form.name.uz.trim().length > 0 && form.price >= 0 && form.stock >= 0 && !uploading;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(43,38,32,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--gc-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--gc-cream-2)" }}>
              <Plus size={18} color="var(--gc-leaf)" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight" style={{ color: "var(--gc-charcoal)" }}>
                {product ? t.admin.edit : t.admin.addProduct}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--gc-muted)" }}>{t.admin.productFormSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label={t.admin.nameUz}>
              <input className="admin-input" placeholder={t.admin.namePlaceholder} value={form.name.uz} onChange={(e) => setName("uz", e.target.value)} />
            </Field>
            <Field label={<span className="flex items-center gap-1">{t.admin.nameRu}{translating && <Loader2 size={11} className="animate-spin" />}</span>}>
              <input className="admin-input" placeholder={t.admin.namePlaceholder} value={form.name.ru} onChange={(e) => setName("ru", e.target.value)} />
            </Field>
            <Field label={<span className="flex items-center gap-1">{t.admin.nameEn}{translating && <Loader2 size={11} className="animate-spin" />}</span>}>
              <input className="admin-input" placeholder={t.admin.namePlaceholder} value={form.name.en} onChange={(e) => setName("en", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t.admin.price}>
              <input
                type="number"
                min="0"
                className="admin-input"
                placeholder={t.admin.pricePlaceholder}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </Field>
            <Field label={t.admin.category}>
              <select className="admin-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{t[c.key]}</option>
                ))}
              </select>
            </Field>
            <Field label={t.admin.unit}>
              <select className="admin-input" value={form.baseUnit} onChange={(e) => set("baseUnit", e.target.value)}>
                <option value="kg">{t.unit.kg}</option>
                <option value="l">{t.unit.l}</option>
                <option value="dona">{t.unit.dona}</option>
              </select>
            </Field>
          </div>

          <Field label={t.admin.uploadImage}>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0"
                style={{ background: "var(--gc-surface)", border: "1px solid var(--gc-border)", color: "var(--gc-muted-dark)" }}
              >
                <ImageUp size={14} /> {t.admin.chooseFile}
              </button>
              {uploading ? (
                <span className="text-xs truncate" style={{ color: "var(--gc-muted-light)" }}>{t.admin.uploading}</span>
              ) : form.image ? (
                <img src={form.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border: "1px solid var(--gc-border)" }} />
              ) : (
                <span className="text-xs truncate" style={{ color: "var(--gc-muted-light)" }}>{t.admin.noFileChosen}</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </Field>

          <Field label={t.admin.stock}>
            <input
              type="number"
              min="0"
              className="admin-input"
              placeholder={t.admin.stockPlaceholder}
              value={form.stock}
              onChange={(e) => set("stock", Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "var(--gc-cream-2)", color: "var(--gc-muted-dark)" }}
          >
            {t.admin.cancel}
          </button>
          <button
            disabled={!canSave}
            onClick={() => canSave && onSave(form)}
            className="flex-1 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: canSave ? "var(--gc-forest)" : "var(--gc-disabled)", cursor: canSave ? "pointer" : "not-allowed" }}
          >
            {t.admin.save}
          </button>
        </div>
      </div>

      <style>{`
        .admin-input {
          border: 1px solid var(--gc-border);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 13px;
          background: var(--gc-surface);
          color: var(--gc-charcoal);
          outline: none;
        }
        .admin-input:focus { border-color: var(--gc-leaf); }
      `}</style>
    </div>
  );
}

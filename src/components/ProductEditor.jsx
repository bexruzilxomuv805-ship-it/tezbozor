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

// Downscales one uploaded file to a compressed JPEG data URI — kept as a plain module function
// (not a component method) since it has no dependency on component state, just the file itself.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 900;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductEditor({ product, t, onSave, onClose }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(
    product
      ? { ...product, name: { ...product.name }, images: product.images?.length ? [...product.images] : product.image ? [product.image] : [] }
      : {
          id: null,
          name: { uz: "", ru: "", en: "" },
          category: "sabzavot",
          baseUnit: "kg",
          price: 0,
          stock: 0,
          brand: "",
          images: [],
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

  // Stored directly on the product record (in MongoDB) as compressed data URIs, rather than
  // uploaded to a separate file server — that server's disk is wiped on every Render restart,
  // which is exactly what silently broke product photos before. Downscaling first keeps the
  // resulting document small and pages fast, since phone photos are far bigger than a product
  // thumbnail needs. Any number of photos can be added — they append to the existing list
  // rather than replacing it, so admins build up a gallery a few files at a time if they want.
  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again later (e.g. after removing it)
    if (files.length === 0) return;
    setUploading(true);
    Promise.all(files.map(fileToDataUrl))
      .then((dataUrls) => {
        setForm((f) => ({ ...f, images: [...f.images, ...dataUrls] }));
      })
      .catch(() => {})
      .finally(() => setUploading(false));
  };

  const removeImage = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

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
            <div className="flex flex-wrap items-center gap-2">
              {form.images.map((src, idx) => (
                <div key={idx} className="relative w-14 h-14 shrink-0">
                  <img src={src} alt="" className="w-full h-full rounded-lg object-cover" style={{ border: "1px solid var(--gc-border)" }} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    aria-label={t.admin.removeImage}
                    title={t.admin.removeImage}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--gc-tomato-dark)" }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-14 h-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-bold"
                style={{ background: "var(--gc-surface)", border: "1px dashed var(--gc-border)", color: "var(--gc-muted-dark)" }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
                {uploading ? t.admin.uploading : t.admin.chooseFile}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
            {form.images.length === 0 && !uploading && (
              <span className="text-xs mt-1 block" style={{ color: "var(--gc-muted-light)" }}>{t.admin.noFileChosen}</span>
            )}
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
            onClick={() => canSave && onSave({ ...form, image: form.images[0] || "" })}
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

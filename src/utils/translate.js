const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

// MyMemory sometimes returns oddly-cased results for short product names (all-caps "NOK",
// all-lowercase "ananas") — normalize to Title-first-letter to match how every product
// name in this app is cased (see data/products.js).
function normalizeCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

// Free, keyless machine-translation API (CORS-open) used to auto-fill a product's
// ru/en name from its uz name in the admin editor. Best-effort only: on any failure
// (offline, rate limit, unsupported phrase) callers should just leave the field blank
// for the admin to fill in by hand, same as every other network call in this app.
export async function translateText(text, from, to) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  try {
    const res = await fetch(`${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(trimmed)}&langpair=${from}|${to}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || "";
    return /invalid|please select/i.test(translated) ? "" : normalizeCase(translated);
  } catch (e) {
    return "";
  }
}

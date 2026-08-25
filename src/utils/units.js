/* Unit options per base unit, mirroring an S/M/L/XL-style size chooser
   but for grocery weights/quantities. */
export function unitOptions(baseUnit) {
  if (baseUnit === "kg") return [{ qty: 1, unit: "kg" }, { qty: 500, unit: "g" }, { qty: 250, unit: "g" }];
  if (baseUnit === "l") return [{ qty: 1, unit: "l" }, { qty: 0.5, unit: "l" }];
  return [{ qty: 1, unit: "dona" }, { qty: 5, unit: "dona" }, { qty: 10, unit: "dona" }];
}

export function optionFactor(product, option) {
  if (product.baseUnit === "kg") return option.unit === "kg" ? option.qty : option.qty / 1000;
  if (product.baseUnit === "l") return option.qty;
  return option.qty;
}

// Stock is one shared pool per product, but each unit option (1kg, 500g, 250g...) is a
// separate cart line (see ProductCard.jsx's `key`). Without this, adding the full stock via
// one option (e.g. all 36kg as "1kg" lines) left every other option's line still computing its
// own limit against the untouched product.stock, letting the customer add far more than exists.
// Sum in base units (factor * qty) across every line for this product, regardless of option.
export function cartReservedQty(cart, productId) {
  return cart
    .filter((it) => it.productId === productId)
    .reduce((s, it) => s + (it.factor || 1) * it.qty, 0);
}

export function optionLabel(option, lang, t) {
  const u = t.unit[option.unit];
  if (option.unit === "dona") return `${option.qty} ${u}`;
  return `${option.qty}${u}`;
}

// Cart/order line items store the product name resolved to a plain string at add-to-cart
// time, in whatever language was active then — so a language switch afterward left old cart
// lines and every past order stuck showing that original language. Re-resolve by productId
// against the live product list (which is always fully translated) whenever it's available.
export function resolveItemName(item, products, lang) {
  const product = products.find((p) => p.id === item.productId);
  return product ? product.name[lang] : item.name;
}

export function formatMoney(n, lang, t) {
  const rounded = Math.round(n);
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";
  const str = rounded.toLocaleString(locale);
  return `${str} ${t.currency}`;
}

// Some browsers' ICU data lacks short month names for uz-UZ and silently falls back to
// a "M08"-style placeholder via Intl. Format manually so the month name is always correct.
const MONTH_ABBR = {
  uz: ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"],
  ru: ["янв", "февр", "мар", "апр", "мая", "июн", "июл", "авг", "сент", "окт", "нояб", "дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export function formatDate(iso, lang) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = (MONTH_ABBR[lang] || MONTH_ABBR.uz)[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month} ${year}, ${hour}:${minute}`;
}

// Day/month only, no year/time — for chart axis ticks and tooltips.
export function formatShortDate(date, lang) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = (MONTH_ABBR[lang] || MONTH_ABBR.uz)[d.getMonth()];
  return `${day}-${month}`;
}

const WEEKDAY_ABBR = {
  uz: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"],
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export function formatWeekday(date, lang) {
  const d = new Date(date);
  return (WEEKDAY_ABBR[lang] || WEEKDAY_ABBR.uz)[d.getDay()];
}

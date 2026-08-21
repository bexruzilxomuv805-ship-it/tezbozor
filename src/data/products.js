// Ids are strings to match json-server's convention (db.json stores "id" as a string) —
// keeping this fallback numeric caused productId mismatches (e.g. duplicate reviews)
// whenever the app briefly ran on this data before the server fetch resolved.
export const INITIAL_PRODUCTS = [
  { id: "1", name: { uz: "Pomidor", ru: "Помидор", en: "Tomato" }, category: "sabzavot", baseUnit: "kg", price: 12000, stock: 50, brand: "Fermer bozori" },
  { id: "2", name: { uz: "Bodring", ru: "Огурец", en: "Cucumber" }, category: "sabzavot", baseUnit: "kg", price: 9000, stock: 40, brand: "Fermer bozori" },
  { id: "3", name: { uz: "Kartoshka", ru: "Картофель", en: "Potato" }, category: "sabzavot", baseUnit: "kg", price: 6000, stock: 120, brand: "Andijon dehqon" },
  { id: "4", name: { uz: "Piyoz", ru: "Лук", en: "Onion" }, category: "sabzavot", baseUnit: "kg", price: 5000, stock: 90, brand: "Andijon dehqon" },
  { id: "5", name: { uz: "Sabzi", ru: "Морковь", en: "Carrot" }, category: "sabzavot", baseUnit: "kg", price: 6500, stock: 8, brand: "Fermer bozori" },
  { id: "6", name: { uz: "Olma", ru: "Яблоко", en: "Apple" }, category: "meva", baseUnit: "kg", price: 15000, stock: 60, brand: "Bog'dor" },
  { id: "7", name: { uz: "Banan", ru: "Банан", en: "Banana" }, category: "meva", baseUnit: "kg", price: 22000, stock: 45, brand: "Import Fresh" },
  { id: "8", name: { uz: "Uzum", ru: "Виноград", en: "Grape" }, category: "meva", baseUnit: "kg", price: 28000, stock: 30, brand: "Bog'dor" },
  { id: "9", name: { uz: "Anor", ru: "Гранат", en: "Pomegranate" }, category: "meva", baseUnit: "kg", price: 25000, stock: 6, brand: "Bog'dor" },
  { id: "10", name: { uz: "Sut", ru: "Молоко", en: "Milk" }, category: "sut", baseUnit: "l", price: 12000, stock: 40, brand: "Andijon Sut" },
  { id: "11", name: { uz: "Tvorog", ru: "Творог", en: "Cottage cheese" }, category: "sut", baseUnit: "kg", price: 35000, stock: 20, brand: "Andijon Sut" },
  { id: "12", name: { uz: "Qatiq", ru: "Катык", en: "Yogurt" }, category: "sut", baseUnit: "dona", price: 8000, stock: 55, brand: "Andijon Sut" },
  { id: "13", name: { uz: "Sariyog'", ru: "Сливочное масло", en: "Butter" }, category: "sut", baseUnit: "kg", price: 45000, stock: 15, brand: "Prezident" },
  { id: "14", name: { uz: "Non", ru: "Лепёшка", en: "Flatbread" }, category: "non", baseUnit: "dona", price: 4000, stock: 100, brand: "Non Savdo" },
  { id: "15", name: { uz: "Baget", ru: "Багет", en: "Baguette" }, category: "non", baseUnit: "dona", price: 9000, stock: 30, brand: "Non Savdo" },
  { id: "16", name: { uz: "Bulochka", ru: "Булочка", en: "Bun" }, category: "non", baseUnit: "dona", price: 3000, stock: 0, brand: "Shirin Non" },
];

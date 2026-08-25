import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { T, LANGS } from "../i18n/translations";
import { INITIAL_PRODUCTS } from "../data/products";
import { earnedPoints, discountForPoints, POINT_VALUE } from "../utils/loyalty";
import { normalizePromoCode, validatePromoCode, computePromoDiscount } from "../utils/promo";

const AppContext = createContext(null);

let nextProductId = 100;
let nextPromoId = 100;

// Retries a persistence call once after a short delay before giving up — covers a single
// transient blip (e.g. Render's free tier waking from sleep) that a bare `.catch(() => {})`
// would otherwise swallow silently, leaving the change looking "saved" in this tab while the
// server never actually got it.
async function fetchWithRetry(url, options) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (e) {}
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

// Guards against corrupted/partial product records (e.g. a failed write) ever reaching the UI and crashing it.
function isValidProduct(p) {
  return (
    p &&
    typeof p.id !== "undefined" &&
    p.name && typeof p.name.uz === "string" &&
    typeof p.category === "string" &&
    typeof p.baseUnit === "string" &&
    typeof p.price === "number" &&
    typeof p.stock === "number"
  );
}

export function AppProvider({ children }) {
  // Single local JSON Server (db.json: products, users, orders). For production set VITE_API_BASE in .env.
  const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:4000" : "/api");

  const [lang, setLang] = useState(() => {
    try {
      const s = localStorage.getItem("lang");
      return s && LANGS.includes(s) ? s : "uz";
    } catch (e) {
      return "uz";
    }
  });
  // The inline script in index.html already stamps documentElement's data-theme before
  // React mounts (avoids a light/dark flash) — read that back here rather than re-deciding,
  // so this state and the DOM never briefly disagree.
  const [theme, setTheme] = useState(() => {
    try {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  });
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);
  const [products, setProducts] = useState(() => {
    try {
      const s = localStorage.getItem("products");
      const parsed = s ? JSON.parse(s).filter(isValidProduct) : INITIAL_PRODUCTS;
      return parsed.length > 0 ? parsed : INITIAL_PRODUCTS;
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  });
  const [cart, setCart] = useState(() => {
    try {
      const s = localStorage.getItem("cart");
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });
  const [orders, setOrders] = useState(() => {
    try {
      const s = localStorage.getItem("orders");
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });
  const [lastOrderId, setLastOrderId] = useState(null);
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);

  // Helper: check if two orders are equivalent (same items and total)
  const ordersAreEqual = useCallback((a, b) => {
    if (!a || !b) return false;
    if ((a.items || []).length !== (b.items || []).length) return false;
    if (a.total !== b.total) return false;
    // Compare items by productId and qty (order-independent)
    const norm = (items) => items.map((it) => `${it.productId}:${it.qty}`).sort().join("|");
    return norm(a.items || []) === norm(b.items || []);
  }, []);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = localStorage.getItem("currentUser"); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      const s = localStorage.getItem("wishlist");
      const parsed = s ? JSON.parse(s) : [];
      // Normalize + dedupe: a legacy bug stored some ids as numbers (see products.js) —
      // String(1) and "1" must collapse to one entry, not two.
      return Array.from(new Set(parsed.map((id) => String(id))));
    } catch (e) { return []; }
  });
  const [reviews, setReviews] = useState(() => {
    try {
      const s = localStorage.getItem("reviews");
      const parsed = s ? JSON.parse(s) : [];
      // Same legacy bug, one review per (product, user): keep the most recent if duplicates exist.
      const byKey = new Map();
      for (const r of parsed) {
        const key = `${String(r.productId)}::${r.userId}`;
        const existing = byKey.get(key);
        if (!existing || new Date(r.date) > new Date(existing.date)) {
          byKey.set(key, { ...r, productId: String(r.productId) });
        }
      }
      return Array.from(byKey.values());
    } catch (e) { return []; }
  });
  const [loyaltyPointsMap, setLoyaltyPointsMap] = useState(() => {
    try { const s = localStorage.getItem("loyaltyPoints"); return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
  });
  const [savedAddressesMap, setSavedAddressesMap] = useState(() => {
    try { const s = localStorage.getItem("savedAddresses"); return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
  });
  // One support ticket per customer: a running message thread with the admin team.
  const [supportTickets, setSupportTickets] = useState(() => {
    try { const s = localStorage.getItem("supportTickets"); return s ? JSON.parse(s) : []; } catch (e) { return []; }
  });
  const [promoCodes, setPromoCodes] = useState(() => {
    try { const s = localStorage.getItem("promoCodes"); return s ? JSON.parse(s) : []; } catch (e) { return []; }
  });
  // The promo code currently applied in the cart (the full record, not just its string code) —
  // cleared whenever the cart itself is cleared (checkout, or the customer removes it).
  const [appliedPromoCode, setAppliedPromoCode] = useState(() => {
    try { const s = localStorage.getItem("appliedPromoCode"); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  });
  // Site-wide checkout rules the admin controls (Sozlamalar tab) — delivery fee, the subtotal
  // above which delivery becomes free, and the minimum order subtotal. All default to 0 (no
  // fee, no free-delivery threshold, no minimum) until an admin actually saves a settings
  // record, so a fresh deployment never blocks or silently charges anyone.
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem("settings");
      return s ? JSON.parse(s) : { deliveryFee: 0, freeDeliveryThreshold: 0, minOrderAmount: 0 };
    } catch (e) {
      return { deliveryFee: 0, freeDeliveryThreshold: 0, minOrderAmount: 0 };
    }
  });

  const t = T[lang];

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => setToast(null), 10000);
  }, []);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.key === item.key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
  }, []);

  // Authentication: register / login / logout
  const register = useCallback(async (user) => {
    // user: { name, email, password }
    try {
      const res = await fetch(`${API_BASE}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...user, role: "user" }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error === "Email already registered" ? t.emailTaken : t.registerFailed };
      }
      const created = await res.json();
      setCurrentUser(created);
      return { ok: true, user: created };
    } catch (e) {
      return { ok: false, error: t.registerFailed };
    }
  }, [API_BASE, t.registerFailed, t.emailTaken]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error === "Account blocked" ? t.accountBlocked : t.loginFailed };
      }
      const user = await res.json();
      setCurrentUser(user);
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: t.loginFailed };
    }
  }, [API_BASE, t.loginFailed, t.accountBlocked]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const updateProfileName = useCallback((name) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      fetch(`${API_BASE}/users/${prev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
      return updated;
    });
  }, [API_BASE]);

  const updateCartQty = useCallback((key, qty) => {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }, []);

  const removeFromCart = useCallback((key) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const toggleWishlist = useCallback((productId) => {
    const id = String(productId);
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const addSavedAddress = useCallback(({ fullName, phone, address }) => {
    if (!currentUser) return;
    setSavedAddressesMap((prev) => {
      const list = prev[currentUser.email] || [];
      // skip if an identical entry is already saved
      const exists = list.some((a) => a.fullName === fullName && a.phone === phone && a.address === address);
      if (exists) return prev;
      const entry = { id: `${Date.now()}`, fullName, phone, address };
      return { ...prev, [currentUser.email]: [entry, ...list] };
    });
  }, [currentUser]);

  const deleteSavedAddress = useCallback((id) => {
    if (!currentUser) return;
    setSavedAddressesMap((prev) => ({
      ...prev,
      [currentUser.email]: (prev[currentUser.email] || []).filter((a) => a.id !== id),
    }));
  }, [currentUser]);

  const addOrUpdateReview = useCallback(({ productId, rating, comment }) => {
    if (!currentUser) return { ok: false };
    const pid = String(productId);
    // Email, not id: it's always present and stable, unlike id on some older cached sessions.
    const userId = currentUser.email;
    setReviews((prev) => {
      const idx = prev.findIndex((r) => r.productId === pid && r.userId === userId);
      const entry = {
        id: idx >= 0 ? prev[idx].id : `${pid}-${userId}-${Date.now()}`,
        productId: pid,
        userId,
        userName: currentUser.name || currentUser.email,
        rating,
        comment,
        date: new Date().toISOString(),
      };
      if (idx >= 0) {
        fetch(`${API_BASE}/reviews/${entry.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) }).catch(() => {});
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      // json-server assigns its own id on POST (ignores the one we send), so reconcile
      // afterwards — otherwise a later edit would PUT to our locally-made id, which the
      // server never recognizes, and silently 404.
      fetch(`${API_BASE}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) })
        .then((r) => r.json())
        .then((created) => {
          if (created && created.id && created.id !== entry.id) {
            setReviews((prev2) => prev2.map((r) => (r.id === entry.id ? created : r)));
          }
        })
        .catch(() => {});
      return [...prev, entry];
    });
    return { ok: true };
  }, [currentUser, API_BASE]);

  // Support: one running ticket per customer, rather than a full inbox — matches the
  // scale of a small storefront and keeps the customer-side UI a single chat thread instead
  // of a ticket list. A closed ticket reopens automatically the moment the customer writes again.
  const sendSupportMessage = useCallback((text) => {
    const trimmed = (text || "").trim();
    if (!currentUser || !trimmed) return;
    const message = { from: "user", text: trimmed, date: new Date().toISOString() };
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.userEmail === currentUser.email);
      if (idx >= 0) {
        const updated = { ...prev[idx], messages: [...prev[idx].messages, message], status: "open", updatedAt: message.date };
        fetchWithRetry(`${API_BASE}/supportTickets/${updated.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
          .then((res) => { if (!res) showToast(t.admin.saveFailedRetry, "error"); });
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      const ticket = {
        id: `t-${Date.now()}`,
        userEmail: currentUser.email,
        userName: currentUser.name || currentUser.email,
        status: "open",
        messages: [message],
        userLastSeenAt: message.date,
        createdAt: message.date,
        updatedAt: message.date,
      };
      fetchWithRetry(`${API_BASE}/supportTickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ticket) })
        .then((res) => { if (!res) showToast(t.admin.saveFailedRetry, "error"); });
      return [...prev, ticket];
    });
  }, [API_BASE, currentUser, showToast, t.admin.saveFailedRetry]);

  const sendSupportReply = useCallback((ticketId, text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.id === ticketId);
      if (idx < 0) return prev;
      const message = { from: "admin", text: trimmed, date: new Date().toISOString() };
      const updated = { ...prev[idx], messages: [...prev[idx].messages, message], updatedAt: message.date };
      fetchWithRetry(`${API_BASE}/supportTickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
        .then((res) => { if (!res) showToast(t.admin.saveFailedRetry, "error"); });
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }, [API_BASE, showToast, t.admin.saveFailedRetry]);

  // Edits the text of one message the caller wrote themselves (by its position).
  const editSupportMessage = useCallback((ticketId, messageIndex, newText) => {
    const trimmed = (newText || "").trim();
    if (!trimmed) return;
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.id === ticketId);
      if (idx < 0) return prev;
      const messages = prev[idx].messages.map((m, i) => (i === messageIndex ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m));
      const updated = { ...prev[idx], messages };
      fetch(`${API_BASE}/supportTickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }, [API_BASE]);

  // Removes one message from a ticket's thread (by its position). Used both by the customer,
  // to delete a message they sent, and by the admin, for moderation.
  const deleteSupportMessage = useCallback((ticketId, messageIndex) => {
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.id === ticketId);
      if (idx < 0) return prev;
      const messages = prev[idx].messages.filter((_, i) => i !== messageIndex);
      const updated = { ...prev[idx], messages };
      fetch(`${API_BASE}/supportTickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }, [API_BASE]);

  // Deletes an entire conversation — the customer clearing their own thread, or the admin
  // removing it outright. Sending a new message afterward simply starts a fresh ticket.
  const deleteSupportTicket = useCallback((ticketId) => {
    setSupportTickets((prev) => prev.filter((tk) => tk.id !== ticketId));
    fetch(`${API_BASE}/supportTickets/${ticketId}`, { method: "DELETE" }).catch(() => {});
  }, [API_BASE]);

  const closeSupportTicket = useCallback((ticketId) => {
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.id === ticketId);
      if (idx < 0) return prev;
      const updated = { ...prev[idx], status: "closed" };
      fetch(`${API_BASE}/supportTickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }, [API_BASE]);

  // Marks the customer's own ticket as seen up to now, so the "new reply" badge clears once
  // they've actually opened the chat — called by the chat modal on open.
  const markMySupportTicketSeen = useCallback(() => {
    if (!currentUser) return;
    setSupportTickets((prev) => {
      const idx = prev.findIndex((tk) => tk.userEmail === currentUser.email);
      if (idx < 0) return prev;
      const now = new Date().toISOString();
      const updated = { ...prev[idx], userLastSeenAt: now };
      fetch(`${API_BASE}/supportTickets/${updated.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  }, [API_BASE, currentUser]);

  // Looks up a typed code against the loaded promo list and validates it against the current
  // cart/user. On success, stores the full record — checkout() re-validates and reads the
  // discount from it directly rather than trusting stale state.
  const applyPromoCode = useCallback((codeInput) => {
    const code = normalizePromoCode(codeInput);
    if (!code) return { ok: false, error: "notFound" };
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const promo = promoCodes.find((p) => p.code === code);
    const result = validatePromoCode(promo, { subtotal, userEmail: currentUser?.email });
    if (!result.ok) return result;
    setAppliedPromoCode(promo);
    return { ok: true, promo };
  }, [cart, promoCodes, currentUser]);

  const removePromoCode = useCallback(() => {
    setAppliedPromoCode(null);
  }, []);

  const addPromoCode = useCallback((p) => {
    const local = { ...p, id: String(nextPromoId++), usedCount: 0, usedByEmails: [] };
    setPromoCodes((prev) => [...prev, local]);
    fetch(`${API_BASE}/promoCodes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, usedCount: 0, usedByEmails: [] }) })
      .then((r) => r.json())
      .then((created) => {
        setPromoCodes((prev) => prev.map((x) => (x.id === local.id ? created : x)));
      })
      .catch(() => {});
  }, [API_BASE]);

  const updatePromoCode = useCallback((p) => {
    setPromoCodes((prev) => {
      const updated = prev.map((x) => (x.id === p.id ? p : x));
      fetch(`${API_BASE}/promoCodes/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => {});
      return updated;
    });
  }, [API_BASE]);

  const deletePromoCode = useCallback((id) => {
    setPromoCodes((prev) => prev.filter((x) => x.id !== id));
    fetch(`${API_BASE}/promoCodes/${id}`, { method: "DELETE" }).catch(() => {});
  }, [API_BASE]);

  const updateSettings = useCallback((next) => {
    setSettings((prev) => {
      const updated = { ...prev, ...next };
      fetchWithRetry(`${API_BASE}/settings/main`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "main", ...updated }) })
        .then((res) => { if (!res) showToast(t.admin.saveFailedRetry, "error"); });
      return updated;
    });
  }, [API_BASE, showToast, t.admin.saveFailedRetry]);

  const checkout = useCallback(async ({ fullName, address, phone, pointsToUse = 0 } = {}) => {
    if (checkoutInProgress) return null;
    setCheckoutInProgress(true);
    try {
      const prevCart = cart;
      if (!prevCart || prevCart.length === 0) return null;
      const subtotal = prevCart.reduce((s, i) => s + i.unitPrice * i.qty, 0);

      // Re-check the minimum order amount against the live cart, same reasoning as the promo
      // re-validation just below — Cart.jsx already disables the checkout button under this
      // amount, but this is the one place that can't be bypassed by calling checkout() directly.
      if (settings.minOrderAmount > 0 && subtotal < settings.minOrderAmount) return null;

      // Re-validate the applied promo code against the live cart/user rather than trusting
      // whatever was true when it was applied — e.g. it could have expired or hit its usage
      // limit (from another tab) in the meantime.
      const promoCheck = appliedPromoCode
        ? validatePromoCode(appliedPromoCode, { subtotal, userEmail: currentUser?.email })
        : { ok: false };
      const promoDiscount = promoCheck.ok ? computePromoDiscount(appliedPromoCode, subtotal) : 0;
      const afterPromo = Math.max(0, subtotal - promoDiscount);

      const availablePoints = currentUser ? (loyaltyPointsMap[currentUser.email] || 0) : 0;
      const maxUsablePoints = Math.floor(afterPromo / POINT_VALUE);
      const safePointsToUse = Math.max(0, Math.min(pointsToUse, availablePoints, maxUsablePoints));
      const pointsDiscount = discountForPoints(safePointsToUse);
      const goodsTotal = Math.max(0, afterPromo - pointsDiscount);
      // Delivery fee is waived above the admin-configured free-delivery threshold (0 = never
      // free) and never earns/costs loyalty points — it's a pass-through cost, not a "spend".
      const deliveryFee = settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold
        ? 0
        : (settings.deliveryFee || 0);
      const total = goodsTotal + deliveryFee;
      const pointsEarned = earnedPoints(goodsTotal);
      const id = Date.now().toString();
      const newOrder = {
        id,
        items: prevCart,
        subtotal,
        promoCode: promoCheck.ok ? appliedPromoCode.code : null,
        promoDiscount,
        pointsUsed: safePointsToUse,
        pointsDiscount,
        pointsEarned,
        deliveryFee,
        total,
        date: new Date().toISOString(),
        status: "new",
        customerName: fullName || currentUser?.name || "",
        customerEmail: currentUser?.email || "",
        address: address || "",
        phone: phone || "",
      };

      // if the same customer just submitted this exact order seconds ago (e.g. double-click), avoid duplicate
      const existing = orders.find((o) =>
        o.customerEmail === newOrder.customerEmail &&
        Date.now() - new Date(o.date).getTime() < 15000 &&
        ordersAreEqual(o, newOrder)
      );
      if (existing) {
        // clear cart and return existing id
        setCart([]);
        setAppliedPromoCode(null);
        setLastOrderId(existing.id);
        return existing.id;
      }

      // record this redemption against the promo code (usage cap + per-user-once check)
      if (promoCheck.ok) {
        setPromoCodes((prev) => {
          const idx = prev.findIndex((p) => p.id === appliedPromoCode.id);
          if (idx < 0) return prev;
          const updatedPromo = {
            ...prev[idx],
            usedCount: (prev[idx].usedCount || 0) + 1,
            usedByEmails: currentUser ? [...(prev[idx].usedByEmails || []), currentUser.email] : (prev[idx].usedByEmails || []),
          };
          fetch(`${API_BASE}/promoCodes/${updatedPromo.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPromo) }).catch(() => {});
          const copy = [...prev];
          copy[idx] = updatedPromo;
          return copy;
        });
      }
      setAppliedPromoCode(null);

      // Decrement product stocks based on cart items (qty * factor)
      setProducts((prevProducts) => {
        const updated = prevProducts.map((p) => {
          const itemsForP = prevCart.filter((it) => it.productId === p.id);
          if (itemsForP.length === 0) return p;
          const reduction = itemsForP.reduce((s, it) => s + (it.factor || 1) * it.qty, 0);
          const newStock = Math.max(0, (p.stock || 0) - reduction);
          const changed = newStock !== p.stock;
          const next = { ...p, stock: newStock };
          if (changed) {
            // try to persist the stock change
            fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
          }
          return next;
        });
        return updated;
      });

      // optimistic local add
      setOrders((prevOrders) => [newOrder, ...prevOrders]);
      setLastOrderId(id);
      setCart([]);

      // update loyalty point balance: spend redeemed points, earn new ones on the paid amount
      if (currentUser) {
        setLoyaltyPointsMap((prev) => ({
          ...prev,
          [currentUser.email]: (prev[currentUser.email] || 0) - safePointsToUse + pointsEarned,
        }));
      }

      // persist to orders server and reconcile created id
      try {
        const res = await fetch(`${API_BASE}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newOrder) });
        const created = await res.json();
        // if server returned a different id, replace the optimistic entry
        if (created && created.id && created.id !== id) {
          setOrders((prev) => prev.map((o) => (o.id === id ? created : o)));
          setLastOrderId(created.id);
          return created.id;
        }
      } catch (e) {
        // ignore server errors, local order remains
      }
      return id;
    } finally {
      setCheckoutInProgress(false);
    }
  }, [API_BASE, cart, checkoutInProgress, currentUser, loyaltyPointsMap, orders, ordersAreEqual, appliedPromoCode, settings]);

  // Customers may only cancel while an order is still "new"; admins can cancel at any point
  // before it's delivered (or already cancelled) — see AdminOrders vs MyOrders callers.
  const cancelOrder = useCallback((id, reason) => {
    const order = orders.find((o) => o.id === id);
    if (!order || ["delivered", "cancelled"].includes(order.status || "new")) return;
    const updatedOrder = { ...order, status: "cancelled", cancelReason: reason };
    setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));
    fetch(`${API_BASE}/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedOrder) }).catch(() => {});

    // restore reserved stock back to products
    setProducts((prevProducts) => prevProducts.map((p) => {
      const itemsForP = order.items.filter((it) => it.productId === p.id);
      if (itemsForP.length === 0) return p;
      const restore = itemsForP.reduce((s, it) => s + (it.factor || 1) * it.qty, 0);
      const next = { ...p, stock: (p.stock || 0) + restore };
      fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
      return next;
    }));
  }, [API_BASE, orders]);

  const updateOrderStatus = useCallback((id, status) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, status } : o));
      const order = updated.find((o) => o.id === id);
      if (order) {
        fetch(`${API_BASE}/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) }).catch(() => {});
      }
      return updated;
    });
  }, [API_BASE]);

  const updateProduct = useCallback((p) => {
    setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    fetchWithRetry(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      .then((res) => { if (!res) showToast(t.admin.saveFailedRetry, "error"); });
  }, [API_BASE, showToast, t.admin.saveFailedRetry]);

  // "Notify me" list for an out-of-stock product — stored as an email array directly on the
  // product record (products already exists as a collection everywhere this app is deployed,
  // unlike a brand-new top-level db.json collection, which would need a redeploy to appear).
  const requestStockNotification = useCallback((productId) => {
    if (!currentUser) return;
    setProducts((prev) => prev.map((p) => {
      if (p.id !== productId) return p;
      const list = p.notifyRequests || [];
      if (list.includes(currentUser.email)) return p;
      const next = { ...p, notifyRequests: [...list, currentUser.email] };
      fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
      return next;
    }));
  }, [API_BASE, currentUser]);

  const deleteOrder = useCallback((id) => {
    setOrders((prev) => {
      const updated = prev.filter((o) => o.id !== id);
      // try to remove from orders server if available
      fetch(`${API_BASE}/orders/${id}`, { method: "DELETE" }).catch(() => {});
      // clear lastOrderId if it was the deleted one
      setLastOrderId((prevId) => (prevId === id ? null : prevId));
      return updated;
    });
  }, [API_BASE]);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      fetch(`${API_BASE}/products/${id}`, { method: "DELETE" }).catch(() => {});
      return updated;
    });
  }, [API_BASE]);

  const addProduct = useCallback((p) => {
    // optimistic add, try to persist to server (server will assign id if available)
    const local = { ...p, id: String(nextProductId++) };
    setProducts((prev) => [...prev, local]);
    fetchWithRetry(`${API_BASE}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      .then((res) => {
        if (!res) { showToast(t.admin.saveFailedRetry, "error"); return null; }
        return res.json();
      })
      .then((created) => {
        if (created) setProducts((prev) => prev.map((x) => (x.id === local.id ? created : x)));
      });
  }, [API_BASE, showToast, t.admin.saveFailedRetry]);

  // Count distinct products, not cart lines — the same product added in two
  // different unit variants (e.g. 1kg and 500g) is still one product "type".
  const cartCount = useMemo(() => new Set(cart.map((i) => i.productId)).size, [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.qty, 0), [cart]);
  const newOrdersCount = useMemo(() => orders.filter((o) => (o.status || "new") === "new").length, [orders]);
  const notifyRequestsCount = useMemo(
    () => products.reduce((sum, p) => sum + (p.notifyRequests?.length || 0), 0),
    [products]
  );
  const myTicket = useMemo(
    () => (currentUser ? supportTickets.find((tk) => tk.userEmail === currentUser.email) || null : null),
    [supportTickets, currentUser]
  );
  const myTicketUnread = useMemo(() => {
    if (!myTicket) return false;
    const last = myTicket.messages[myTicket.messages.length - 1];
    return !!last && last.from === "admin" && new Date(last.date) > new Date(myTicket.userLastSeenAt || 0);
  }, [myTicket]);
  const adminUnreadTicketsCount = useMemo(
    () => supportTickets.filter((tk) => {
      const last = tk.messages[tk.messages.length - 1];
      return tk.status === "open" && last?.from === "user";
    }).length,
    [supportTickets]
  );

  // try to load data from backend if available
  useEffect(() => {
    fetch(`${API_BASE}/products`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setProducts(data.filter(isValidProduct));
    }).catch(() => {});
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/promoCodes`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setPromoCodes(data);
    }).catch(() => {});
  }, [API_BASE]);

  // Single-document settings record (see updateSettings) — a 404 just means no admin has
  // saved one yet, so the local zero-defaults from useState above are left in place.
  useEffect(() => {
    fetch(`${API_BASE}/settings/main`).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (data) setSettings((prev) => ({ ...prev, ...data }));
    }).catch(() => {});
  }, [API_BASE]);

  // An admin can block a user, or change their role, while that user's session is still open
  // in the browser (currentUser cached in localStorage) — neither takes effect on its own,
  // since currentUser is only ever set at login. Poll the signed-in user's own record
  // periodically and apply both changes live, so a block signs them out immediately and a
  // role change (e.g. a promotion to admin) unlocks /admin without a manual re-login.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const syncAccountStatus = () => {
      fetch(`${API_BASE}/users/${currentUser.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => {
          if (cancelled || !u) return;
          if (u.blocked) {
            setCurrentUser(null);
            showToast(t.accountBlocked, "error");
            return;
          }
          setCurrentUser((prev) => {
            if (!prev || prev.id !== u.id || (prev.role === u.role && prev.name === u.name)) return prev;
            if (prev.role !== u.role) showToast(t.accountRoleUpdated, "info");
            return { ...prev, role: u.role, name: u.name };
          });
        })
        .catch(() => {});
    };
    syncAccountStatus();
    const interval = window.setInterval(syncAccountStatus, 20000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [currentUser?.id, API_BASE, t.accountBlocked, t.accountRoleUpdated, showToast]);

  // In-app "it's back!" toast for anyone who asked to be notified — no push/service worker
  // involved, this just checks on page load whether a product they're waiting on now has
  // stock, tells them once, then clears their email from that product's wait list.
  useEffect(() => {
    if (!currentUser) return;
    const restocked = products.filter((p) => p.stock > 0 && (p.notifyRequests || []).includes(currentUser.email));
    if (restocked.length === 0) return;
    restocked.forEach((p) => {
      showToast(t.notifyBackInStock(p.name[lang]), "success");
      const next = { ...p, notifyRequests: (p.notifyRequests || []).filter((e) => e !== currentUser.email) };
      setProducts((prev) => prev.map((x) => (x.id === p.id ? next : x)));
      fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
    });
  }, [products, currentUser, API_BASE, lang, t, showToast]);

  // Reviews were localStorage-only before this, so only the browser that wrote one could
  // ever see it — load the shared copy from the backend so every visitor sees every review.
  useEffect(() => {
    fetch(`${API_BASE}/reviews`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setReviews(data);
    }).catch(() => {});
  }, [API_BASE]);

  // One-time migration: reviews saved under a user's id (e.g. "1") and reviews saved under
  // their email are the same person, but were treated as different reviewers before
  // addOrUpdateReview settled on email as the sole key — collapse any such split entries.
  useEffect(() => {
    fetch(`${API_BASE}/users`).then((r) => r.json()).then((users) => {
      if (!Array.isArray(users)) return;
      const idToEmail = new Map(users.map((u) => [String(u.id), u.email]));
      setReviews((prev) => {
        const normalized = prev.map((r) => ({ ...r, userId: idToEmail.get(String(r.userId)) || r.userId }));
        const byKey = new Map();
        for (const r of normalized) {
          const key = `${r.productId}::${r.userId}`;
          const existing = byKey.get(key);
          if (!existing || new Date(r.date) > new Date(existing.date)) byKey.set(key, r);
        }
        return Array.from(byKey.values());
      });
    }).catch(() => {});
  }, [API_BASE]);

  // try to load orders from the backend if available (keep localStorage as fallback)
  // polls periodically so the admin sees newly placed orders without a manual reload
  useEffect(() => {
    const loadOrders = () => {
      fetch(`${API_BASE}/orders`).then((r) => r.json()).then((data) => {
        if (Array.isArray(data)) {
          // dedupe server orders by items+total (keep first occurrence)
          const unique = [];
          for (const o of data) {
            if (!unique.some((u) => ordersAreEqual(u, o))) unique.push(o);
          }
          setOrders(unique);
        }
      }).catch(() => {});
    };
    loadOrders();
    const interval = window.setInterval(loadOrders, 15000);
    return () => window.clearInterval(interval);
  }, [API_BASE]);

  // Same polling pattern as orders: admin sees new customer messages, customer sees new
  // admin replies, without either side needing to refresh.
  useEffect(() => {
    const loadTickets = () => {
      fetch(`${API_BASE}/supportTickets`).then((r) => r.json()).then((data) => {
        if (Array.isArray(data)) setSupportTickets(data);
      }).catch(() => {});
    };
    loadTickets();
    const interval = window.setInterval(loadTickets, 15000);
    return () => window.clearInterval(interval);
  }, [API_BASE]);

  // persist to localStorage whenever data changes
  useEffect(() => {
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }, [lang]);
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    } catch (e) {}
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem("products", JSON.stringify(products)); } catch (e) {}
  }, [products]);
  useEffect(() => {
    try { localStorage.setItem("cart", JSON.stringify(cart)); } catch (e) {}
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem("orders", JSON.stringify(orders)); } catch (e) {}
  }, [orders]);
  useEffect(() => {
    try { if (currentUser) localStorage.setItem("currentUser", JSON.stringify(currentUser)); else localStorage.removeItem("currentUser"); } catch (e) {}
  }, [currentUser]);
  useEffect(() => {
    try { localStorage.setItem("wishlist", JSON.stringify(wishlist)); } catch (e) {}
  }, [wishlist]);
  useEffect(() => {
    try { localStorage.setItem("reviews", JSON.stringify(reviews)); } catch (e) {}
  }, [reviews]);
  useEffect(() => {
    try { localStorage.setItem("loyaltyPoints", JSON.stringify(loyaltyPointsMap)); } catch (e) {}
  }, [loyaltyPointsMap]);
  useEffect(() => {
    try { localStorage.setItem("savedAddresses", JSON.stringify(savedAddressesMap)); } catch (e) {}
  }, [savedAddressesMap]);
  useEffect(() => {
    try { localStorage.setItem("supportTickets", JSON.stringify(supportTickets)); } catch (e) {}
  }, [supportTickets]);
  useEffect(() => {
    try { localStorage.setItem("promoCodes", JSON.stringify(promoCodes)); } catch (e) {}
  }, [promoCodes]);
  useEffect(() => {
    try {
      if (appliedPromoCode) localStorage.setItem("appliedPromoCode", JSON.stringify(appliedPromoCode));
      else localStorage.removeItem("appliedPromoCode");
    } catch (e) {}
  }, [appliedPromoCode]);
  useEffect(() => {
    try { localStorage.setItem("settings", JSON.stringify(settings)); } catch (e) {}
  }, [settings]);

  const loyaltyPoints = currentUser ? (loyaltyPointsMap[currentUser.email] || 0) : 0;
  const savedAddresses = currentUser ? (savedAddressesMap[currentUser.email] || []) : [];

  const value = {
    lang, setLang, t,
    theme, toggleTheme,
    API_BASE,
    products, updateProduct, deleteProduct, addProduct, requestStockNotification,
    cart, addToCart, updateCartQty, removeFromCart, cartCount, cartTotal,
    orders, checkout, checkoutInProgress, lastOrderId, newOrdersCount, notifyRequestsCount,
    deleteOrder, updateOrderStatus, cancelOrder,
    currentUser, register, login, logout, updateProfileName,
    toast, showToast,
    wishlist, toggleWishlist,
    reviews, addOrUpdateReview,
    loyaltyPoints,
    savedAddresses, addSavedAddress, deleteSavedAddress,
    supportTickets, myTicket, myTicketUnread, adminUnreadTicketsCount,
    sendSupportMessage, sendSupportReply, closeSupportTicket, markMySupportTicketSeen,
    deleteSupportMessage, editSupportMessage, deleteSupportTicket,
    promoCodes, appliedPromoCode, applyPromoCode, removePromoCode,
    addPromoCode, updatePromoCode, deletePromoCode,
    settings, updateSettings,
  };

  return (
    <>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
      {toast && (
        <div
          onClick={() => setToast(null)}
          className="fixed right-4 top-20 z-70 max-w-[min(88vw,320px)] cursor-pointer rounded-2xl border border-black/5 bg-[#1f2d28] px-4 py-3 pr-10 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(0,0,0,0.18)] animate-[slideInRight_0.25s_ease-out]"
          style={{
            background: toast.type === "error" ? "#2a2927" : "#1f2d28",
          }}
        >
          {toast.message}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            aria-label="Close notification"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1 text-base font-bold text-white/80 transition hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

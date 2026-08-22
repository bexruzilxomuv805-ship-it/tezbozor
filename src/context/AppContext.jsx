import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { T, LANGS } from "../i18n/translations";
import { INITIAL_PRODUCTS } from "../data/products";
import { earnedPoints, discountForPoints, POINT_VALUE } from "../utils/loyalty";
import { autoSubscribeToPush } from "../utils/push";

const AppContext = createContext(null);

let nextProductId = 100;

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
  // Same server upload-server.js runs on — it also exposes /notify for order-status push notifications.
  const UPLOAD_BASE = import.meta.env.VITE_UPLOAD_BASE || (import.meta.env.DEV ? "http://localhost:4102" : "/api");

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
      const created = await res.json();
      setCurrentUser(created);
      return { ok: true, user: created };
    } catch (e) {
      return { ok: false, error: t.registerFailed };
    }
  }, [API_BASE, t.registerFailed]);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        setCurrentUser(list[0]);
        return { ok: true, user: list[0] };
      }
      return { ok: false, error: t.loginFailed };
    } catch (e) {
      return { ok: false, error: t.loginFailed };
    }
  }, [API_BASE, t.loginFailed]);

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

  const checkout = useCallback(async ({ fullName, address, phone, pointsToUse = 0 } = {}) => {
    if (checkoutInProgress) return null;
    setCheckoutInProgress(true);
    try {
      const prevCart = cart;
      if (!prevCart || prevCart.length === 0) return null;
      const subtotal = prevCart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
      const availablePoints = currentUser ? (loyaltyPointsMap[currentUser.email] || 0) : 0;
      const maxUsablePoints = Math.floor(subtotal / POINT_VALUE);
      const safePointsToUse = Math.max(0, Math.min(pointsToUse, availablePoints, maxUsablePoints));
      const pointsDiscount = discountForPoints(safePointsToUse);
      const total = Math.max(0, subtotal - pointsDiscount);
      const pointsEarned = earnedPoints(total);
      const id = Date.now().toString();
      const newOrder = {
        id,
        items: prevCart,
        subtotal,
        pointsUsed: safePointsToUse,
        pointsDiscount,
        pointsEarned,
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
        setLastOrderId(existing.id);
        return existing.id;
      }

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
  }, [API_BASE, cart, checkoutInProgress, currentUser, loyaltyPointsMap, orders, ordersAreEqual]);

  // Best-effort push notification to the customer when their order's status changes —
  // handled by upload-server.js's /notify route, not json-server (see CLAUDE.md).
  const notifyOrderStatus = useCallback((email, status) => {
    if (!email) return;
    fetch(`${UPLOAD_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, status }),
    }).catch(() => {});
  }, [UPLOAD_BASE]);

  // Customers may only cancel while an order is still "new"; admins can cancel at any point
  // before it's delivered (or already cancelled) — see AdminOrders vs MyOrders callers.
  const cancelOrder = useCallback((id, reason) => {
    const order = orders.find((o) => o.id === id);
    if (!order || ["delivered", "cancelled"].includes(order.status || "new")) return;
    const updatedOrder = { ...order, status: "cancelled", cancelReason: reason };
    setOrders((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)));
    fetch(`${API_BASE}/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedOrder) }).catch(() => {});
    notifyOrderStatus(order.customerEmail, "cancelled");

    // restore reserved stock back to products
    setProducts((prevProducts) => prevProducts.map((p) => {
      const itemsForP = order.items.filter((it) => it.productId === p.id);
      if (itemsForP.length === 0) return p;
      const restore = itemsForP.reduce((s, it) => s + (it.factor || 1) * it.qty, 0);
      const next = { ...p, stock: (p.stock || 0) + restore };
      fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
      return next;
    }));
  }, [API_BASE, orders, notifyOrderStatus]);

  const updateOrderStatus = useCallback((id, status) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, status } : o));
      const order = updated.find((o) => o.id === id);
      if (order) {
        fetch(`${API_BASE}/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) }).catch(() => {});
        notifyOrderStatus(order.customerEmail, status);
      }
      return updated;
    });
  }, [API_BASE, notifyOrderStatus]);

  const updateProduct = useCallback((p) => {
    setProducts((prev) => {
      const updated = prev.map((x) => (x.id === p.id ? p : x));
      // try to persist
      fetch(`${API_BASE}/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => {});
      return updated;
    });
  }, [API_BASE]);

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
    fetch(`${API_BASE}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      .then((r) => r.json())
      .then((created) => {
        setProducts((prev) => prev.map((x) => (x.id === local.id ? created : x)));
      })
      .catch(() => {});
  }, [API_BASE]);

  // Count distinct products, not cart lines — the same product added in two
  // different unit variants (e.g. 1kg and 500g) is still one product "type".
  const cartCount = useMemo(() => new Set(cart.map((i) => i.productId)).size, [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.qty, 0), [cart]);
  const newOrdersCount = useMemo(() => orders.filter((o) => (o.status || "new") === "new").length, [orders]);

  // try to load data from backend if available
  useEffect(() => {
    fetch(`${API_BASE}/products`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setProducts(data.filter(isValidProduct));
    }).catch(() => {});
  }, [API_BASE]);

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
  // Ask for push permission right on login/app-load instead of making the customer find a
  // button in Profile — see src/utils/push.js for why this doesn't re-nag once decided.
  useEffect(() => {
    if (currentUser) autoSubscribeToPush({ email: currentUser.email, apiBase: API_BASE });
  }, [currentUser, API_BASE]);
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

  const loyaltyPoints = currentUser ? (loyaltyPointsMap[currentUser.email] || 0) : 0;
  const savedAddresses = currentUser ? (savedAddressesMap[currentUser.email] || []) : [];

  const value = {
    lang, setLang, t,
    theme, toggleTheme,
    API_BASE,
    products, updateProduct, deleteProduct, addProduct,
    cart, addToCart, updateCartQty, removeFromCart, cartCount, cartTotal,
    orders, checkout, checkoutInProgress, lastOrderId, newOrdersCount,
    deleteOrder, updateOrderStatus, cancelOrder,
    currentUser, register, login, logout, updateProfileName,
    toast, showToast,
    wishlist, toggleWishlist,
    reviews, addOrUpdateReview,
    loyaltyPoints,
    savedAddresses, addSavedAddress, deleteSavedAddress,
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

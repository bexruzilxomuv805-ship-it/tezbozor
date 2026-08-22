export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function findSubscriptionRecord(apiBase, email) {
  const res = await fetch(`${apiBase}/pushSubscriptions?userEmail=${encodeURIComponent(email)}`);
  const list = await res.json();
  return list && list[0];
}

export async function subscribeToPush({ email, apiBase, vapidPublicKey }) {
  if (!isPushSupported()) throw new Error("unsupported");
  if (!vapidPublicKey) throw new Error("missing-key");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const record = { userEmail: email, subscription };
  const existing = await findSubscriptionRecord(apiBase, email).catch(() => null);
  if (existing) {
    await fetch(`${apiBase}/pushSubscriptions/${existing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...existing, ...record }),
    });
  } else {
    await fetch(`${apiBase}/pushSubscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  }
  return subscription;
}

// Called on login/app-load, no button press. Only skips when the browser already has a
// firm answer (a live subscription, or a prior "denied") — otherwise it's the first time
// this device has been asked, so triggering Notification.requestPermission() here is what
// shows the browser's native "Allow notifications?" prompt automatically.
export async function autoSubscribeToPush({ email, apiBase }) {
  if (!email || !isPushSupported() || !VAPID_PUBLIC_KEY) return;
  const existing = await getCurrentPushSubscription().catch(() => null);
  if (existing) return;
  if (Notification.permission === "denied") return;
  await subscribeToPush({ email, apiBase, vapidPublicKey: VAPID_PUBLIC_KEY }).catch(() => {});
}

export async function unsubscribeFromPush({ email, apiBase }) {
  const subscription = await getCurrentPushSubscription();
  if (subscription) await subscription.unsubscribe();
  const existing = await findSubscriptionRecord(apiBase, email).catch(() => null);
  if (existing) {
    await fetch(`${apiBase}/pushSubscriptions/${existing.id}`, { method: "DELETE" }).catch(() => {});
  }
}

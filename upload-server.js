import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Order-status push notifications. Lives here (not json-server, which can't run
// custom logic) so it reuses the one small Node server this project already deploys
// for uploads — see CLAUDE.md and README.md.
const API_BASE = process.env.API_BASE || "http://localhost:4000";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:example@example.com";
const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn("VAPID keys not set — /notify will be a no-op until VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are configured.");
}

const STATUS_TEXT = {
  new: "Buyurtmangiz qabul qilindi",
  preparing: "Buyurtmangiz tayyorlanmoqda",
  delivering: "Buyurtmangiz yo'lda",
  delivered: "Buyurtmangiz yetkazildi",
  cancelled: "Buyurtmangiz bekor qilindi",
};

async function sendOrderStatusPush(email, status) {
  if (!pushConfigured || !email) return;
  const body = STATUS_TEXT[status] || "Buyurtmangiz holati yangilandi";
  let subs = [];
  try {
    const res = await fetch(`${API_BASE}/pushSubscriptions?userEmail=${encodeURIComponent(email)}`);
    subs = await res.json();
  } catch (e) {
    return;
  }
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title: "TezBozor", body, url: "/buyurtmalarim" }));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        fetch(`${API_BASE}/pushSubscriptions/${sub.id}`, { method: "DELETE" }).catch(() => {});
      } else {
        console.error("push send failed:", e.statusCode || e.message);
      }
    }
  }
}

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function slugify(name) {
  const slug = (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "mahsulot";
}

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve uploaded images directly from disk. Vite's dev-server public-dir
  // passthrough only picks up files that existed at startup, so a file the
  // upload handler below just wrote can 404/fall through there — serving it
  // here too means the URL returned from /upload always resolves.
  if (req.method === "GET" && req.url.startsWith("/uploads/")) {
    const filename = decodeURIComponent(req.url.slice("/uploads/".length).split("?")[0]);
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (req.method === "POST" && req.url === "/notify") {
    let notifyBody = "";
    req.on("data", (chunk) => {
      notifyBody += chunk;
      if (notifyBody.length > 64 * 1024) req.destroy();
    });
    req.on("end", async () => {
      try {
        const { email, status } = JSON.parse(notifyBody);
        await sendOrderStatusPush(email, status);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Notify failed" }));
      }
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/upload") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 15 * 1024 * 1024) req.destroy();
  });
  req.on("end", () => {
    try {
      const { name, dataUrl } = JSON.parse(body);
      const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl || "");
      if (!match) throw new Error("Invalid image data");
      const ext = MIME_EXT[match[1]] || "jpg";
      const buffer = Buffer.from(match[2], "base64");
      const filename = `${slugify(name)}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: `/uploads/${filename}` }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Upload failed" }));
    }
  });
});

const PORT = process.env.PORT || 4102;
server.listen(PORT, () => console.log(`Upload server on :${PORT}`));

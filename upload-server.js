import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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

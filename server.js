import express from "express";
import cors from "cors";
import crypto from "crypto";
import dns from "dns";
import { MongoClient } from "mongodb";

// mongodb+srv:// URIs need a DNS resolver that supports SRV record lookups — some local/ISP
// resolvers silently don't, which surfaces as an opaque ECONNREFUSED from the driver. Google's
// public resolver always supports it, so use it specifically for this process's DNS lookups.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set — refusing to start.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();
console.log(`Connected to MongoDB database: ${db.databaseName}`);

const app = express();
app.use(cors());
// Product images are stored inline as data URIs (see ProductEditor.jsx), so a single
// product record can be a few MB — comfortably under MongoDB's 16MB document limit.
app.use(express.json({ limit: "10mb" }));

function generateId() {
  return crypto.randomBytes(8).toString("base64url");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Strip the password (hash, or the legacy plaintext field from before hashing existed)
// before a user document ever goes back over the wire.
function toSafeUser(doc) {
  if (!doc) return doc;
  const { passwordHash, password, ...rest } = doc;
  return toApi(rest);
}

// Every document is stored with _id set to the same string id the frontend already
// works with (not an ObjectId) — these two helpers keep the wire format identical to
// what json-server used to return, so the React app needed zero changes.
function toApi(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function collectionRoutes(name) {
  const col = () => db.collection(name);

  app.get(`/${name}`, async (req, res) => {
    const filter = { ...req.query };
    const docs = await col().find(filter).toArray();
    res.json(docs.map(toApi));
  });

  app.get(`/${name}/:id`, async (req, res) => {
    const doc = await col().findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(toApi(doc));
  });

  app.post(`/${name}`, async (req, res) => {
    const { id, ...fields } = req.body || {};
    const _id = id || generateId();
    const doc = { _id, ...fields };
    await col().insertOne(doc);
    res.json(toApi(doc));
  });

  app.put(`/${name}/:id`, async (req, res) => {
    const { id: _id, ...fields } = req.body || {};
    const doc = { _id: req.params.id, ...fields };
    await col().replaceOne({ _id: req.params.id }, doc, { upsert: true });
    res.json(toApi(doc));
  });

  app.delete(`/${name}/:id`, async (req, res) => {
    await col().deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  });
}

// "settings" is a single-document collection (id "main") holding site-wide checkout rules —
// delivery fee, free-delivery threshold, minimum order amount — editable from the admin panel.
// The generic collectionRoutes() already upserts on PUT, so no dedicated route is needed.
for (const name of ["products", "orders", "reviews", "supportTickets", "promoCodes", "settings"]) {
  collectionRoutes(name);
}

// Users get their own routes instead of collectionRoutes(): passwords must be hashed on
// write and stripped from every response, and registration needs an email-uniqueness check
// that the generic POST handler doesn't do.
const users = () => db.collection("users");

app.get("/users", async (req, res) => {
  const filter = { ...req.query };
  delete filter.password;
  const docs = await users().find(filter).toArray();
  res.json(docs.map(toSafeUser));
});

app.get("/users/:id", async (req, res) => {
  const doc = await users().findOne({ _id: req.params.id });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(toSafeUser(doc));
});

app.post("/users", async (req, res) => {
  const { id, password, ...fields } = req.body || {};
  if (!fields.email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const existing = await users().findOne({ email: fields.email });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const _id = id || generateId();
  const doc = { _id, ...fields, passwordHash: hashPassword(password) };
  await users().insertOne(doc);
  res.json(toSafeUser(doc));
});

app.put("/users/:id", async (req, res) => {
  const { id: _id, password, ...fields } = req.body || {};
  const existing = await users().findOne({ _id: req.params.id });
  const doc = { _id: req.params.id, ...fields };
  if (password) {
    doc.passwordHash = hashPassword(password);
  } else if (existing?.passwordHash) {
    doc.passwordHash = existing.passwordHash;
  } else if (existing?.password) {
    // Account not migrated to a hash yet (see /login) — keep the legacy field intact
    // rather than silently locking the account out on an unrelated edit (e.g. role change).
    doc.password = existing.password;
  }
  await users().replaceOne({ _id: req.params.id }, doc, { upsert: true });
  res.json(toSafeUser(doc));
});

app.delete("/users/:id", async (req, res) => {
  await users().deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const user = await users().findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  let ok = false;
  if (user.passwordHash) {
    ok = verifyPassword(password, user.passwordHash);
  } else if (typeof user.password === "string") {
    // Legacy account created before password hashing existed — verify against the
    // plaintext field once, then migrate it to a hash so this only ever happens the once.
    ok = user.password === password;
    if (ok) {
      const passwordHash = hashPassword(password);
      await users().updateOne({ _id: user._id }, { $set: { passwordHash }, $unset: { password: "" } });
      user.passwordHash = passwordHash;
      delete user.password;
    }
  }
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  if (user.blocked) return res.status(403).json({ error: "Account blocked" });
  res.json(toSafeUser(user));
});

app.get("/", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`API server on :${PORT}`));

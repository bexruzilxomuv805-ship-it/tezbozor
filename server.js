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

for (const name of ["products", "orders", "reviews", "users"]) {
  collectionRoutes(name);
}

app.get("/", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`API server on :${PORT}`));

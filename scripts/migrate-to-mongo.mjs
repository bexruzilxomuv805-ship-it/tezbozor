// One-off migration: copies every product/order/user/review from the still-running old
// json-server API into the new MongoDB database, preserving every id and field exactly.
// Usage: node --env-file=.env.migrate scripts/migrate-to-mongo.mjs
import dns from "dns";
import { MongoClient } from "mongodb";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const SOURCE_API = process.env.SOURCE_API || "https://tezbozor-api.onrender.com";
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();
console.log(`Migrating into MongoDB database: ${db.databaseName}`);

for (const name of ["products", "orders", "users", "reviews"]) {
  const res = await fetch(`${SOURCE_API}/${name}`);
  const records = await res.json();
  if (!Array.isArray(records)) {
    console.log(`${name}: unexpected response, skipping`);
    continue;
  }
  const col = db.collection(name);
  let inserted = 0;
  for (const r of records) {
    const { id, ...fields } = r;
    const doc = { _id: id, ...fields };
    await col.replaceOne({ _id: id }, doc, { upsert: true });
    inserted += 1;
  }
  console.log(`${name}: migrated ${inserted} records`);
}

await client.close();
console.log("Done.");

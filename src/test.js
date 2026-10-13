"use strict";
// Usage: node src/test.js <core module> <edmx file>
const fs = require("fs");
const path = require("path");
const core = require(path.resolve(process.argv[2]));
const xml = fs.readFileSync(process.argv[3], "utf8");

const t0 = Date.now();
const info = core.inspect(xml);
console.log("inspect:", { ...info, entitySets: info.entitySets.length });

const { openapi, messages } = core.toOpenApi(xml, {
  host: "{{host}}",
  basePath: info.basePath,
});
const col = core.toPostman(openapi, {
  name: info.namespace,
  auth: "basic",
  csrf: true,
  top: 50,
  deepInsert: true,
  sapClient: "100",
});
console.log("ms:", Date.now() - t0, "warnings:", messages.length);
console.log("server:", openapi.servers[0].url);
console.log("variables:", col.variable.map((v) => v.key).join(", "));
console.table(core.summarize(col).map((s) => ({ name: s.name, ...s.counts, total: s.total })));

const all = col.item.flatMap((f) => f.item);
const pick = (m, re) => all.find((r) => r.request.method === m && re.test(r.request.url.raw));
const list = pick("GET", /\/A_PurchaseOrder\?/) || all[0];
console.log("\nLIST:", list.name, "\n ", list.request.url.raw);
console.log("  query:", list.request.url.query.map((q) => (q.disabled ? "-" : "+") + q.key + "=" + q.value).join("  "));
const one = pick("PATCH", /A_PurchaseOrder\(/);
if (one) {
  console.log("\nPATCH:", one.name, "\n ", one.request.url.raw, "\n  path:", JSON.stringify(one.request.url.path));
  console.log("  headers:", one.request.header.map((h) => (h.disabled ? "-" : "+") + h.key).join(" "));
  console.log("  body:", one.request.body.raw.replace(/\s+/g, " "), "| desc:", (one.request.description || "").slice(0, 160));
}
const post = pick("POST", /\/A_PurchaseOrder(\?|$)/);
if (post) {
  const body = JSON.parse(post.request.body.raw);
  console.log("\nPOST:", post.name, "keys:", Object.keys(body).length, "bytes:", post.request.body.raw.length);
  for (const [k, v] of Object.entries(body)) {
    if (v && typeof v === "object") console.log("  nested", k, "->", JSON.stringify(v).slice(0, 110));
  }
}
const batch = all.find((r) => /\$batch/.test(r.request.url.raw));
if (batch) console.log("\nBATCH headers:", JSON.stringify(batch.request.header), JSON.stringify(batch.request.body.raw.slice(0, 60)));
console.log("\nCSRF script:\n" + col.event[0].script.exec.join("\n"));
console.log("\ncollection bytes:", JSON.stringify(col).length);
if (process.argv[4]) fs.writeFileSync(process.argv[4], JSON.stringify(col, null, 2));

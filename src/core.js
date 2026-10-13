"use strict";

const { xml2json } = require("odata-csdl");
const { csdl2openapi } = require("odata-openapi");

const METHODS = ["get", "post", "put", "patch", "delete"];
const POSTMAN_SCHEMA =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/**
 * Read the facts the form needs from an EDMX document without converting it.
 */
function inspect(xml) {
  const csdl = xml2json(xml);
  const namespace =
    Object.keys(csdl).find((k) => !k.startsWith("$")) || "Service";
  const container = csdl.$EntityContainer
    ? csdl.$EntityContainer.split(".").reduce((o, k) => (o ? o[k] : o), csdl)
    : null;
  const entitySets = container
    ? Object.keys(container).filter(
        (k) => !k.startsWith("$") && !k.startsWith("@") && container[k].$Collection,
      )
    : [];

  const isSap = /xmlns:sap=/.test(xml);
  let basePath = "";
  const self = xml.match(
    /<(?:atom:)?link\b[^>]*\brel="self"[^>]*\bhref="([^"]+)"/,
  );
  if (self) {
    basePath = self[1]
      .replace(/^[a-z]+:\/\/[^/]+/i, "")
      .replace(/\/\$metadata.*$/, "")
      .replace(/\/+$/, "");
  }
  if (!basePath) {
    basePath = isSap ? "/sap/opu/odata/sap/" + namespace : "/odata";
  }

  return {
    version: csdl.$Version || "4.0",
    namespace,
    entitySets,
    basePath,
    isSap,
  };
}

/**
 * EDMX text -> OpenAPI 3 document. Warnings from the converter are returned,
 * never thrown.
 */
function toOpenApi(xml, opts = {}) {
  const messages = [];
  const csdl = xml2json(xml, { messages });
  const openapi = csdl2openapi(csdl, {
    scheme: opts.scheme || "https",
    host: opts.host || "{{host}}",
    basePath: opts.basePath || "/service-root",
    skipBatchPath: !!opts.skipBatch,
    messages,
  });
  return { openapi, messages: messages.map(String) };
}

function deref(openapi, node) {
  let n = node;
  let guard = 0;
  while (n && n.$ref && guard++ < 20) {
    n = n.$ref
      .replace(/^#\//, "")
      .split("/")
      .reduce((o, k) => (o ? o[k.replace(/~1/g, "/").replace(/~0/g, "~")] : o), openapi);
  }
  return n;
}

/**
 * Build a request-body skeleton from a schema. Nested entities are filled one
 * level deep (enough for a deep insert of items), deeper ones are left out.
 */
function exampleFor(openapi, schema, depth = 0) {
  const s = deref(openapi, schema);
  if (!s) return undefined;
  if (s.example !== undefined) return s.example;
  if (s.allOf) {
    const parts = s.allOf.map((p) => exampleFor(openapi, p, depth));
    const objects = parts.filter((p) => p && typeof p === "object" && !Array.isArray(p));
    return objects.length ? Object.assign({}, ...objects) : parts[0];
  }
  const alt = s.anyOf || s.oneOf;
  if (alt) {
    for (const a of alt) {
      const v = exampleFor(openapi, a, depth);
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }
  if (s.enum) return s.enum[0];
  switch (s.type) {
    case "object": {
      if (depth > 2) return undefined;
      const out = {};
      for (const [name, prop] of Object.entries(s.properties || {})) {
        const p = deref(openapi, prop) || {};
        const nested =
          p.type === "object" || p.type === "array" || p.allOf || p.anyOf || p.oneOf;
        // "results" is the OData V2 collection wrapper, not a level of its own
        const next = name === "results" || name === "d" ? depth : depth + 1;
        if (nested && next > 2) continue;
        const v = exampleFor(openapi, prop, nested ? next : depth);
        if (v !== undefined) out[name] = v;
      }
      return out;
    }
    case "array": {
      const item = exampleFor(openapi, s.items, depth);
      return item === undefined ? [] : [item];
    }
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "string":
      return "";
    default:
      return undefined;
  }
}

/**
 * The converter leaves navigation properties out of "-create" schemas, but a
 * deep insert (header plus items in one POST) is the usual way to create
 * documents on SAP. Add one child skeleton per collection-valued navigation.
 */
function withChildren(openapi, schema, body) {
  const ref = schema && schema.$ref;
  if (!ref || !/-create$/.test(ref) || !body || typeof body !== "object") return body;
  const read = deref(openapi, { $ref: ref.replace(/-create$/, "") });
  for (const [name, prop] of Object.entries((read && read.properties) || {})) {
    const p = deref(openapi, prop) || {};
    const items = p.properties && p.properties.results && p.properties.results.items;
    if (!items || !items.$ref || name in body) continue;
    const create = { $ref: items.$ref + "-create" };
    const child = exampleFor(openapi, deref(openapi, create) ? create : items, 2);
    if (child && typeof child === "object") body[name] = { results: [child] };
  }
  return body;
}

function queryExample(param) {
  if (param.example !== undefined) return String(param.example);
  const s = param.schema || {};
  if (s.example !== undefined) return String(s.example);
  if (typeof s.pattern === "string" && s.pattern.startsWith("^'")) return "''";
  if (s.type === "array" && s.items && s.items.enum) {
    const names = s.items.enum.filter((v) => !/ desc$/.test(v));
    return names.slice(0, param.name === "$select" ? 3 : 1).join(",");
  }
  if (s.enum) return String(s.enum[0]);
  if (s.type === "integer" || s.type === "number") return "0";
  return "";
}

function plain(text) {
  return String(text || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function csrfScript(auth, sapClient) {
  const lines = [
    "// Lấy CSRF token trước mỗi request ghi (POST/PUT/PATCH/DELETE).",
    "// SAP Gateway từ chối request ghi nếu thiếu header x-csrf-token.",
    "if (!['GET', 'HEAD', 'OPTIONS'].includes(pm.request.method)) {",
    "    const headers = { 'x-csrf-token': 'Fetch', 'Accept': 'application/json' };",
  ];
  if (auth === "basic") {
    lines.push(
      "    const user = pm.variables.get('username');",
      "    if (user) {",
      "        headers['Authorization'] = 'Basic ' + btoa(user + ':' + (pm.variables.get('password') || ''));",
      "    }",
    );
  } else if (auth === "bearer") {
    lines.push(
      "    const token = pm.variables.get('token');",
      "    if (token) { headers['Authorization'] = 'Bearer ' + token; }",
    );
  }
  lines.push(
    "    pm.sendRequest({",
    "        url: pm.variables.replaceIn('{{baseUrl}}') + '/" +
      (sapClient ? "?sap-client=" + encodeURIComponent(sapClient) : "") +
      "',",
    "        method: 'GET',",
    "        header: headers",
    "    }, function (err, res) {",
    "        if (err) { console.error('Không lấy được CSRF token', err); return; }",
    "        const csrf = res.headers.get('x-csrf-token');",
    "        if (csrf) { pm.request.headers.upsert({ key: 'x-csrf-token', value: csrf }); }",
    "    });",
    "}",
  );
  return lines;
}

/**
 * OpenAPI 3 document (as produced by toOpenApi) -> Postman Collection v2.1.
 */
function toPostman(openapi, opts = {}) {
  const auth = opts.auth || "basic";
  const sapClient = (opts.sapClient || "").trim();
  const baseUrl = (openapi.servers && openapi.servers[0] && openapi.servers[0].url) || "";
  const pathVars = new Set();
  const folders = new Map();
  const tagInfo = new Map((openapi.tags || []).map((t) => [t.name, t]));
  for (const t of tagInfo.keys()) folders.set(t, []);

  for (const [path, item] of Object.entries(openapi.paths || {})) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const params = [...(item.parameters || []), ...(op.parameters || [])].map((p) =>
        deref(openapi, p),
      );
      const isWrite = method !== "get";
      const isBatch = path === "/$batch";

      const pmPath = path.replace(/\{([^}]+)\}/g, (_, name) => {
        pathVars.add(name);
        return "{{" + name + "}}";
      });

      const query = [];
      if (sapClient) query.push({ key: "sap-client", value: sapClient });
      for (const p of params.filter((x) => x && x.in === "query")) {
        const q = { key: p.name, value: queryExample(p) };
        if (p.description) q.description = plain(p.description);
        const on = p.required || (p.name === "$top" && opts.top);
        if (p.name === "$top" && opts.top) q.value = String(opts.top);
        if (!on) q.disabled = true;
        query.push(q);
      }
      const enabled = query
        .filter((q) => !q.disabled)
        .map((q) => q.key + "=" + q.value)
        .join("&");

      const header = [];
      if (!isBatch) header.push({ key: "Accept", value: "application/json" });
      for (const p of params.filter((x) => x && x.in === "header")) {
        header.push({
          key: p.name,
          value: queryExample(p),
          description: plain(p.description),
          disabled: !p.required,
        });
      }

      const request = { method: method.toUpperCase(), header };
      let description = plain(op.description || "");

      const content = op.requestBody && deref(openapi, op.requestBody).content;
      if (content) {
        const type = Object.keys(content)[0];
        header.push({ key: "Content-Type", value: type });
        if (/json/.test(type)) {
          const schema = content[type].schema;
          const full = exampleFor(openapi, schema);
          let body = full;
          if (method === "post" && opts.deepInsert) {
            body = withChildren(openapi, schema, full);
          }
          if (method === "patch" || method === "put") {
            // An update skeleton full of empty strings would blank real data
            // if sent as is, so the body starts empty and the fields are listed.
            const inner = full && full.d && typeof full.d === "object" ? full.d : full;
            const fields = Object.keys(inner || {});
            body = full && full.d ? { d: {} } : {};
            if (fields.length) {
              description +=
                (description ? "\n\n" : "") +
                "Các field có thể cập nhật: " +
                fields.join(", ");
            }
          }
          request.body = {
            mode: "raw",
            raw: JSON.stringify(body === undefined ? {} : body, null, 2),
            options: { raw: { language: "json" } },
          };
        } else {
          const example = content[type].example;
          request.body = {
            mode: "raw",
            raw: typeof example === "string" ? example.replace(/\r?\n/g, "\r\n") : "",
          };
        }
      }
      if (isWrite && method !== "post" && !isBatch) {
        header.push({
          key: "If-Match",
          value: "*",
          description: "Bật lên nếu entity dùng ETag",
          disabled: true,
        });
      }

      request.url = {
        raw: "{{baseUrl}}" + pmPath + (enabled ? "?" + enabled : ""),
        host: ["{{baseUrl}}"],
        path: pmPath.split("/").filter(Boolean),
      };
      if (query.length) request.url.query = query;
      if (description) request.description = description;

      const tag = (op.tags && op.tags[0]) || "Khác";
      if (!folders.has(tag)) folders.set(tag, []);
      folders.get(tag).push({
        name: plain(op.summary) || method.toUpperCase() + " " + path,
        request,
        response: [],
      });
    }
  }

  const item = [];
  for (const [name, requests] of folders) {
    if (!requests.length) continue;
    const folder = { name, item: requests };
    const t = tagInfo.get(name);
    if (t && t.description) folder.description = plain(t.description);
    item.push(folder);
  }

  const variable = [{ key: "baseUrl", value: baseUrl }];
  const seen = new Set(["baseUrl"]);
  const add = (key, value) => {
    if (!seen.has(key)) {
      seen.add(key);
      variable.push({ key, value });
    }
  };
  for (const m of baseUrl.matchAll(/\{\{([^}]+)\}\}/g)) add(m[1], "");
  if (auth === "basic") {
    add("username", "");
    add("password", "");
  } else if (auth === "bearer") {
    add("token", "");
  }
  for (const name of pathVars) add(name, "");

  const collection = {
    info: {
      name: opts.name || (openapi.info && openapi.info.title) || "OData service",
      description: plain(openapi.info && openapi.info.description),
      schema: POSTMAN_SCHEMA,
    },
    item,
    variable,
  };
  if (auth === "basic") {
    collection.auth = {
      type: "basic",
      basic: [
        { key: "username", value: "{{username}}", type: "string" },
        { key: "password", value: "{{password}}", type: "string" },
      ],
    };
  } else if (auth === "bearer") {
    collection.auth = {
      type: "bearer",
      bearer: [{ key: "token", value: "{{token}}", type: "string" }],
    };
  }
  if (opts.csrf) {
    collection.event = [
      {
        listen: "prerequest",
        script: { type: "text/javascript", exec: csrfScript(auth, sapClient) },
      },
    ];
  }
  return collection;
}

/** Per-folder method counts, for the summary table. */
function summarize(collection) {
  return collection.item.map((folder) => {
    const counts = {};
    for (const r of folder.item) {
      counts[r.request.method] = (counts[r.request.method] || 0) + 1;
    }
    return {
      name: folder.name,
      description: folder.description || "",
      counts,
      total: folder.item.length,
    };
  });
}

module.exports = { inspect, toOpenApi, toPostman, summarize };

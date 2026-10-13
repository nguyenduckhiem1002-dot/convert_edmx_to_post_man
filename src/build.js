"use strict";
// Builds the converter page.
//
//   public/                         static site, one prerendered page per language
//     index.html                    fallback language (see src/i18n.js)
//     <lang>/index.html             every other language
//     assets/app.js                 converter bundle + page script, shared by all pages
//     favicon.svg, robots.txt, sitemap.xml
//   edmx-sang-postman-offline.html  one self-contained file, all languages, opens from disk
//   edmx-sang-postman.html          same page without the <html> shell, for embedding
//
// Absolute URLs (canonical, hreflang, sitemap) need the site address. It is read from
// SITE_URL, or from the production domain Vercel exposes during a build.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const { languages, fallback } = require("./i18n");
const pkg = require("../package.json");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "public");
const REPO = pkg.homepage;
const SITE = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : "")
).replace(/\/+$/, "");
const FONTS =
  "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap";
// The embedded page keeps one stable name wherever it is published.
const EMBED_TITLE = "EDMX sang Postman";
const DEFAULT_VARS = ["host", "username", "password"];

const codes = Object.keys(languages);
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");

// ---- dictionaries ---------------------------------------------------------
for (const code of codes) {
  const missing = Object.keys(languages[fallback]).filter((k) => !(k in languages[code]));
  if (missing.length) {
    throw new Error(`Language "${code}" is missing: ${missing.join(", ")}`);
  }
}
const tr = (code, key) => {
  const v = languages[code][key];
  if (v === undefined) throw new Error(`Unknown text key "${key}"`);
  return v;
};
const escAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const plainText = (html) =>
  String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
// JSON that is safe inside a <script> element
const inlineJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
const pageUrl = (code) => (code === fallback ? "/" : `/${code}/`);

// ---- page pieces ----------------------------------------------------------
esbuild.buildSync({
  entryPoints: [path.join(__dirname, "entry.js")],
  bundle: true,
  minify: true,
  format: "iife",
  globalName: "EdmxTool",
  platform: "browser",
  alias: { stream: path.join(__dirname, "empty.js") },
  outfile: path.join(root, "build", "edmxtool.js"),
});
const bundle = fs.readFileSync(path.join(root, "build", "edmxtool.js"), "utf8");
const pageJs = esbuild.transformSync(read("page.js"), { minify: true }).code;
const css = esbuild.transformSync(read("page.css"), { loader: "css", minify: true }).code;
const template = read("page.body.html");
const sample = read("sample.edmx").trim();
const inlineScript = (js) =>
  "<script>" + js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--") + "</script>";

function switcher(code, mode) {
  return codes
    .map((c) => {
      const current = c === code ? ' aria-current="true"' : "";
      const name = tr(c, "lang.name");
      return mode === "multi"
        ? `<a class="lang" href="${pageUrl(c)}" hreflang="${c}" lang="${c}" data-lang="${c}"${current}>${name}</a>`
        : `<button class="lang" type="button" lang="${c}" data-lang="${c}"${current}>${name}</button>`;
    })
    .join("");
}

function step3(code) {
  const joined = DEFAULT_VARS.map((k, i) => {
    const sep = i === 0 ? "" : i === DEFAULT_VARS.length - 1 ? tr(code, "and") : ", ";
    return `${sep}<code>${k}</code>`;
  }).join("");
  return tr(code, "steps.3").replace("{vars}", joined);
}

/** Fill the template with one language so the page reads complete before any script runs. */
function body(code, mode) {
  let html = template
    .replace(/\[\[langs\]\]/g, () => switcher(code, mode))
    .replace(/\[\[repo\]\]/g, () => escAttr(REPO))
    .replace(/\[\[step3\]\]/g, () => step3(code));
  html = html.replace(
    /(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)(<\/\2>)/g,
    (m, open, tag, key, close) => open + tr(code, key) + close,
  );
  html = html.replace(
    /\bdata-i18n-attr="([a-z-]+):([^"]+)"/g,
    (m, attr, key) => `${m} ${attr}="${escAttr(tr(code, key))}"`,
  );
  const left = html.match(/data-i18n="[^"]+"[^>]*><\//);
  if (left) throw new Error("Unfilled text slot: " + left[0]);
  return html + `\n<script type="text/plain" id="sample-edmx">${sample}</script>\n`;
}

function config(code, mode) {
  const dict = {};
  for (const c of mode === "multi" ? [code] : codes) dict[c] = languages[c];
  return inlineScript("window.EDMX_CONFIG=" + inlineJson({ lang: code, fallback, mode, dict }) + ";");
}

function jsonLd(code) {
  const faq = [];
  for (let i = 1; `faq.q${i}` in languages[code]; i++) {
    faq.push({
      "@type": "Question",
      name: plainText(tr(code, `faq.q${i}`)),
      acceptedAnswer: { "@type": "Answer", text: plainText(tr(code, `faq.a${i}`)) },
    });
  }
  const app = {
    "@type": "WebApplication",
    name: tr(code, "meta.name"),
    description: tr(code, "meta.description"),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: code,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  if (SITE) app.url = SITE + pageUrl(code);
  return inlineJson({
    "@context": "https://schema.org",
    "@graph": [app, { "@type": "FAQPage", inLanguage: code, mainEntity: faq }],
  });
}

function head(code, mode) {
  const title = tr(code, "meta.title");
  const description = tr(code, "meta.description");
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}">`,
    '<meta name="theme-color" content="#f2f5f5" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0d1413" media="(prefers-color-scheme: dark)">',
  ];
  if (mode === "multi") {
    if (SITE) {
      lines.push(`<link rel="canonical" href="${SITE}${pageUrl(code)}">`);
      for (const c of codes) {
        lines.push(`<link rel="alternate" hreflang="${c}" href="${SITE}${pageUrl(c)}">`);
      }
      lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE}${pageUrl(fallback)}">`);
      lines.push(`<meta property="og:url" content="${SITE}${pageUrl(code)}">`);
    }
    lines.push(
      '<meta property="og:type" content="website">',
      `<meta property="og:site_name" content="${escAttr(tr(code, "meta.name"))}">`,
      `<meta property="og:title" content="${escAttr(title)}">`,
      `<meta property="og:description" content="${escAttr(description)}">`,
      `<meta property="og:locale" content="${tr(code, "meta.locale")}">`,
      ...codes
        .filter((c) => c !== code)
        .map((c) => `<meta property="og:locale:alternate" content="${tr(c, "meta.locale")}">`),
      '<meta name="twitter:card" content="summary">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      `<script type="application/ld+json">${jsonLd(code)}</script>`,
    );
    if (code === fallback) {
      // Visitors land on the fallback language. Send them to their own language once,
      // and afterwards to whichever language they picked with the switcher.
      const others = codes.filter((c) => c !== fallback);
      lines.push(
        inlineScript(
          `(function(){try{var k="edmx-lang",o=${JSON.stringify(others)},s=localStorage.getItem(k),` +
            `l=s||String(navigator.language||"").toLowerCase().slice(0,2);` +
            `if(!s)localStorage.setItem(k,o.indexOf(l)<0?${JSON.stringify(fallback)}:l);` +
            `if(o.indexOf(l)>=0)location.replace("/"+l+"/")}catch(e){}})();`,
        ),
      );
    }
  }
  lines.push(
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${FONTS}">`,
    `<style>${css}</style>`,
  );
  return lines.join("\n");
}

const doc = (code, mode, scripts) =>
  `<!doctype html>\n<html lang="${code}">\n<head>\n${head(code, mode)}\n</head>\n<body>\n` +
  `${body(code, mode)}${config(code, mode)}\n${scripts}\n</body>\n</html>\n`;

// ---- static site ----------------------------------------------------------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.writeFileSync(path.join(out, "assets", "app.js"), bundle + "\n" + pageJs);
for (const code of codes) {
  const dir = code === fallback ? out : path.join(out, code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "index.html"),
    doc(code, "multi", '<script src="/assets/app.js" defer></script>'),
  );
}
fs.writeFileSync(
  path.join(out, "favicon.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0b6b63"/>' +
    '<path d="M8 10h9v3H8zM8 19h9v3H8zM19 9l7 7-7 7z" fill="#fff"/></svg>\n',
);
fs.writeFileSync(
  path.join(out, "robots.txt"),
  "User-agent: *\nAllow: /\n" + (SITE ? `\nSitemap: ${SITE}/sitemap.xml\n` : ""),
);
if (SITE) {
  const alternates = codes
    .map((c) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${SITE}${pageUrl(c)}"/>`)
    .join("\n");
  fs.writeFileSync(
    path.join(out, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
      codes
        .map((c) => `  <url>\n    <loc>${SITE}${pageUrl(c)}</loc>\n${alternates}\n  </url>`)
        .join("\n") +
      "\n</urlset>\n",
  );
}

// ---- single-file pages ----------------------------------------------------
const inlineApp = inlineScript(bundle) + "\n" + inlineScript(pageJs);
fs.writeFileSync(path.join(root, "edmx-sang-postman-offline.html"), doc("vi", "single", inlineApp));
fs.writeFileSync(
  path.join(root, "edmx-sang-postman.html"),
  `<title>${EMBED_TITLE}</title>\n<link rel="stylesheet" href="${FONTS}">\n<style>${css}</style>\n` +
    `${body("vi", "single")}${config("vi", "single")}\n${inlineApp}\n`,
);

console.log(
  `built ${codes.length} languages (${codes.join(", ")}), site url: ${SITE || "(not set, no canonical/sitemap)"}`,
);

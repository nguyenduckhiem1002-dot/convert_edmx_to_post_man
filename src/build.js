"use strict";
// Bundles src/core.js for the browser and inlines it into src/page.html.
// Writes the page for publishing and a standalone copy that opens from disk.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
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

const bundle = fs
  .readFileSync(path.join(root, "build", "edmxtool.js"), "utf8")
  .replace(/<\/script/gi, "<\\/script")
  .replace(/<!--/g, "<\\!--");
const page = fs
  .readFileSync(path.join(__dirname, "page.html"), "utf8")
  .replace("/*__BUNDLE__*/", () => bundle);

fs.writeFileSync(path.join(root, "edmx-sang-postman.html"), page);
fs.writeFileSync(
  path.join(root, "edmx-sang-postman-offline.html"),
  '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    "<style>body{margin:0}[hidden]{display:none!important}</style></head><body>" +
    page +
    "</body></html>",
);
console.log("page bytes:", page.length);

"use strict";
// Local preview server for the standalone page.
const http = require("http");
const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "..", "edmx-sang-postman-offline.html");
http
  .createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173"));

(function () {
  "use strict";
  var T = window.EdmxTool;
  // Written by the build: { lang, fallback, mode: "multi" | "single", dict: { <lang>: {...} } }.
  // "multi" pages are prerendered per language and switch by URL; a "single" page carries
  // every language and switches in place.
  var CFG = window.EDMX_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var METHOD_ORDER = ["GET", "POST", "PATCH", "PUT", "DELETE"];
  var LANG_KEY = "edmx-lang";
  var lang = CFG.lang;
  var state = { xml: "", fileName: "", nameKey: "", size: 0, isSample: false, info: null, out: null, open: null };

  function t(key, params) {
    var v = (CFG.dict[lang] || {})[key];
    if (v === undefined) v = (CFG.dict[CFG.fallback] || {})[key];
    if (v === undefined) return key;
    if (Array.isArray(v)) v = v[params && params.n === 1 ? 0 : 1];
    if (!params) return v;
    return v.replace(/\{(\w+)\}/g, function (m, k) { return k in params ? params[k] : m; });
  }

  function remember(code) {
    try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* storage may be blocked */ }
  }

  function applyLang(code) {
    lang = code;
    document.documentElement.lang = code;
    document.title = t("meta.name");
    document.querySelectorAll("[data-i18n]").forEach(function (n) { n.innerHTML = t(n.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (n) {
      var pair = n.getAttribute("data-i18n-attr").split(":");
      n.setAttribute(pair[0], t(pair[1]));
    });
    document.querySelectorAll(".lang").forEach(function (n) {
      if (n.getAttribute("data-lang") === code) n.setAttribute("aria-current", "true");
      else n.removeAttribute("aria-current");
    });
    setStatus("");
    $("fallback").hidden = true;
    showCurrent();
    render();
  }

  // The downloads capability only exists inside the Claude viewer; anywhere else
  // a plain blob link does the job.
  var downloadsReady = window.claude && typeof window.claude.use === "function"
    ? window.claude.use("downloads").catch(function () { return null; })
    : Promise.resolve(null);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function fmtSize(bytes) {
    return bytes < 1024 ? bytes + " B" : Math.round(bytes / 1024).toLocaleString(lang) + " KB";
  }

  function options() {
    var basePath = $("opt-basepath").value.trim().replace(/\/+$/, "");
    if (basePath && basePath[0] !== "/") basePath = "/" + basePath;
    return {
      scheme: $("opt-scheme").value,
      host: $("opt-host").value.trim() || "{{host}}",
      basePath: basePath,
      sapClient: $("opt-client").value.trim(),
      name: $("opt-name").value.trim() || (state.info && state.info.namespace) || "OData service",
      auth: $("opt-auth").value,
      csrf: $("opt-csrf").checked,
      top: $("opt-top").checked ? 50 : 0,
      deepInsert: $("opt-deep").checked,
      skipBatch: $("opt-batch").checked,
      text: {
        other: t("pm.other"), updatable: t("pm.updatable"), ifMatch: t("pm.ifMatch"),
        csrf1: t("pm.csrf1"), csrf2: t("pm.csrf2"), csrfError: t("pm.csrfError")
      }
    };
  }

  function firstLine(e) { return String((e && e.message) || e).split(String.fromCharCode(10))[0]; }

  function showError(message) {
    state.out = null;
    $("error-text").textContent = message;
    $("error").hidden = false;
    $("ok").hidden = true;
  }

  function setStatus(text) { $("status").textContent = text || ""; }

  function showCurrent() {
    $("cur-name").textContent = state.nameKey ? t(state.nameKey) : state.fileName;
    $("cur-size").textContent = fmtSize(state.size);
    $("cur-sample").hidden = !state.isSample;
  }

  // nameKey is set when the name is one of our own labels (pasted text) rather than a file name
  function load(xml, fileName, size, isSample, nameKey) {
    state.xml = xml;
    state.fileName = fileName;
    state.nameKey = nameKey || "";
    state.size = size;
    state.isSample = isSample;
    state.open = null;
    showCurrent();
    $("fallback").hidden = true;
    setStatus("");
    try {
      state.info = T.inspect(xml);
    } catch (e) {
      state.info = null;
      showError(firstLine(e));
      return;
    }
    $("opt-basepath").value = state.info.basePath;
    $("opt-name").value = state.info.namespace;
    render();
  }

  function requestList(folder) {
    var ul = el("ul", "reqs");
    folder.item.forEach(function (r) {
      var li = el("li");
      var method = r.request.method;
      li.append(
        el("span", "mth m-" + method, method),
        el("span", "path", r.request.url.raw.replace("{{baseUrl}}", "")),
        el("span", "rname", r.name)
      );
      ul.append(li);
    });
    return ul;
  }

  function renderFolders(collection) {
    var rows = T.summarize(collection);
    var used = METHOD_ORDER.filter(function (m) {
      return rows.some(function (r) { return r.counts[m]; });
    });
    if (!state.open) state.open = rows.length ? [rows[0].name] : [];

    var list = $("flist");
    list.style.setProperty("--cols", String(used.length));
    list.replaceChildren();

    var head = el("div", "frow fhead");
    head.setAttribute("aria-hidden", "true");
    var headCounts = el("span", "counts");
    used.forEach(function (m) { headCounts.append(el("span", "num mth m-" + m, m)); });
    head.append(el("span"), el("span", "", t("col.folder")), headCounts, el("span", "num", t("col.total")));
    list.append(head);

    rows.forEach(function (r, i) {
      var folder = collection.item[i];
      var d = el("details", "folder");
      var s = el("summary", "frow");
      var chev = el("span", "chev");
      chev.setAttribute("aria-hidden", "true");
      var name = el("span", "fname");
      name.append(el("b", "", r.name));
      if (r.description && r.description !== r.name) name.append(el("span", "", r.description));
      var counts = el("span", "counts");
      used.forEach(function (m) {
        var c = r.counts[m] || 0;
        var cell = el("span", "num cnt " + (c ? "m-" + m : "zero"));
        cell.append(el("span", "lbl", m + " "), String(c));
        counts.append(cell);
      });
      var total = el("span", "num total");
      total.append(el("span", "sr-only", t("col.total") + " "), String(r.total));
      s.append(chev, name, counts, total);
      d.append(s);

      var filled = false;
      var fill = function () {
        if (!filled) { filled = true; d.append(requestList(folder)); }
      };
      if (state.open.indexOf(r.name) >= 0) { d.open = true; fill(); }
      d.addEventListener("toggle", function () {
        var at = state.open.indexOf(r.name);
        if (d.open) { fill(); if (at < 0) state.open.push(r.name); }
        else if (at >= 0) state.open.splice(at, 1);
      });
      list.append(d);
    });
    return rows;
  }

  function varsHtml(collection) {
    var vars = collection.variable
      .map(function (v) { return v.key; })
      .filter(function (k) { return ["host", "username", "password", "token"].indexOf(k) >= 0; });
    if (!vars.length) return t("steps.3none");
    var joined = vars.map(function (k, i) {
      var sep = i === 0 ? "" : i === vars.length - 1 ? t("and") : ", ";
      return sep + "<code>" + k + "</code>";
    }).join("");
    return t("steps.3", { vars: joined });
  }

  function render() {
    if (!state.info) return;
    var o = options();
    var out;
    try {
      var r = T.toOpenApi(state.xml, o);
      out = { openapi: r.openapi, messages: r.messages, collection: T.toPostman(r.openapi, o), name: o.name };
    } catch (e) {
      showError(firstLine(e));
      return;
    }
    state.out = out;
    $("error").hidden = true;
    $("ok").hidden = false;

    var rows = renderFolders(out.collection);
    var total = rows.reduce(function (n, x) { return n + x.total; }, 0);
    $("r-name").textContent = o.name;
    $("r-server").textContent = out.openapi.servers[0].url;
    $("r-meta").replaceChildren(
      el("span", "", "OData V" + String(state.info.version).replace(/\.0$/, "")),
      el("span", "", t("m.sets", { n: state.info.entitySets.length })),
      el("span", "", t("m.folders", { n: rows.length })),
      el("span", "", t("m.requests", { n: total }))
    );

    $("warnings").hidden = out.messages.length === 0;
    $("warn-title").textContent = t("warn.title", { n: out.messages.length });
    var list = $("warn-list");
    list.replaceChildren();
    out.messages.forEach(function (m) { list.append(el("li", "", m)); });

    $("step-vars").innerHTML = varsHtml(out.collection);
  }

  function fileBase() {
    return (state.out.name || "odata").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "odata";
  }

  function save(filename, text) {
    setStatus(t("st.preparing"));
    downloadsReady.then(function (dl) {
      if (dl) {
        return dl.save({ filename: filename, data: text }).then(function () {
          setStatus(t("st.saved", { file: filename }));
        });
      }
      var url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setStatus(t("st.saved", { file: filename }));
    }).catch(function (e) {
      var code = e && e.code;
      if (code === "declined") setStatus(t("st.declined"));
      else if (code === "rate_limited") setStatus(t("st.busy"));
      else showFallback(text, t("st.saveFail", { file: filename }));
    });
  }

  function showFallback(text, label) {
    setStatus("");
    $("fallback-label").textContent = label;
    var ta = $("fallback-text");
    ta.value = text;
    $("fallback").hidden = false;
    ta.focus();
    ta.select();
  }

  $("form").addEventListener("submit", function (e) { e.preventDefault(); });
  $("dl-postman").addEventListener("click", function () {
    if (state.out) save(fileBase() + ".postman_collection.json", JSON.stringify(state.out.collection, null, 2));
  });
  $("dl-openapi").addEventListener("click", function () {
    if (state.out) save(fileBase() + ".openapi3.json", JSON.stringify(state.out.openapi, null, 2));
  });
  $("cp-postman").addEventListener("click", function () {
    if (!state.out) return;
    var text = JSON.stringify(state.out.collection, null, 2);
    var manual = function () { showFallback(text, t("st.copyFail")); };
    if (!navigator.clipboard || !navigator.clipboard.writeText) return manual();
    navigator.clipboard.writeText(text).then(function () { setStatus(t("st.copied")); }, manual);
  });

  function readFile(file) {
    if (!file) return;
    file.text().then(function (text) {
      load(text, file.name, file.size, false);
    }, function () {
      showError(t("err.file", { file: file.name }));
    });
  }
  $("file").addEventListener("change", function (e) {
    readFile(e.target.files[0]);
    e.target.value = "";
  });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (type) {
    drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.add("over"); });
  });
  ["dragleave", "drop"].forEach(function (type) {
    drop.addEventListener(type, function (e) { e.preventDefault(); drop.classList.remove("over"); });
  });
  drop.addEventListener("drop", function (e) {
    readFile(e.dataTransfer && e.dataTransfer.files[0]);
  });
  $("paste-use").addEventListener("click", function () {
    var text = $("paste").value.trim();
    if (!text) { $("paste").focus(); return; }
    load(text, "", new Blob([text]).size, false, "src.pasted");
  });

  var timer = 0;
  function later() { clearTimeout(timer); timer = setTimeout(render, 200); }
  ["opt-host", "opt-basepath", "opt-client", "opt-name"].forEach(function (id) {
    $(id).addEventListener("input", later);
  });
  ["opt-scheme", "opt-auth", "opt-csrf", "opt-top", "opt-deep", "opt-batch"].forEach(function (id) {
    $(id).addEventListener("change", render);
  });

  document.querySelectorAll(".lang").forEach(function (n) {
    n.addEventListener("click", function () {
      var code = n.getAttribute("data-lang");
      remember(code);
      if (CFG.mode === "single") applyLang(code);
    });
  });

  var sample = $("sample-edmx").textContent.trim();
  load(sample, "ZDEMO_PURCHASEORDER_SRV.edmx", new Blob([sample]).size, true);

  if (CFG.mode === "single") {
    var wanted = null;
    try { wanted = localStorage.getItem(LANG_KEY); } catch (e) { /* storage may be blocked */ }
    if (!wanted) wanted = String(navigator.language || "").toLowerCase().slice(0, 2);
    if (CFG.dict[wanted] && wanted !== lang) applyLang(wanted);
  }
})();

"use strict";
// Every visible string of the page, per language.
//
// To add a language: copy the `en` block, change the key to the language code
// (e.g. `de`), translate the values and run `npm run build`. The build fails if
// a key is missing, and the new language gets its own URL (/de/) automatically.
//
// Values may contain inline HTML (<code>, <b>, <a>). A two-item array is
// [singular, plural]. {name} is a placeholder filled in by the page.

module.exports = {
  // Served at the site root and used when a visitor's language is not listed.
  fallback: "en",

  languages: {
    en: {
      "lang.name": "English",
      "meta.locale": "en_US",
      "meta.name": "EDMX to Postman",
      "meta.title": "EDMX to Postman Converter | OData metadata to Postman Collection",
      "meta.description":
        "Free browser tool that converts an OData $metadata (EDMX) file into a Postman Collection and an OpenAPI 3 document. Works with SAP OData V2 and V4. Nothing is uploaded.",

      skip: "Skip to the converter",
      "nav.label": "Language",
      "nav.source": "Source on GitHub",
      h1: "Convert EDMX to a Postman Collection",
      lede: "Turn OData <code>$metadata</code> into a Postman Collection and an OpenAPI 3 file. Nothing leaves your browser.",

      "src.title": "Source file",
      "src.drop": "Choose an .edmx file or drop it here",
      "src.dropHint": "OData V2, V3 and V4 metadata, the response of <code>$metadata</code>.",
      "src.sample": "Sample file",
      "src.paste": "Or paste the XML",
      "src.pasteLabel": "XML content",
      "src.pasteUse": "Use this XML",
      "src.pasted": "Pasted XML",

      "url.title": "Service address",
      "url.scheme": "Scheme",
      "url.host": "Host",
      "url.path": "Service path",
      "url.pathHint":
        "Read from the file when present. Keep the host as <code>{{host}}</code> to set the real host in Postman.",
      "url.client": "sap-client",
      "url.clientPh": "e.g. 100",
      "url.auth": "Authentication",
      "auth.basic": "Basic (user and password)",
      "auth.bearer": "Bearer token",
      "auth.none": "None",
      "url.name": "Collection name",
      "url.nameHint":
        "Credentials are not entered here. The collection uses variables that you fill in Postman.",

      "opt.title": "Collection options",
      "opt.csrf": "Fetch the CSRF token automatically",
      "opt.csrfHint":
        "Adds a script that gets <code>x-csrf-token</code> before every POST, PATCH and DELETE. SAP Gateway requires it.",
      "opt.top": "Turn on <code>$top=50</code>",
      "opt.topHint": "List requests return the first 50 rows instead of the whole table.",
      "opt.deep": "Include child rows in create bodies",
      "opt.deepHint":
        "POST bodies get a skeleton for list navigations (deep insert), such as a header with its items.",
      "opt.batch": "Leave out the <code>$batch</code> request",

      "res.label": "Generated collection",
      "res.dlPostman": "Download Postman Collection",
      "res.dlOpenapi": "Download OpenAPI 3",
      "res.copy": "Copy collection",
      "res.folders": "Folders and requests",
      "col.folder": "Folder",
      "col.total": "Total",
      "m.sets": ["{n} entity set", "{n} entity sets"],
      "m.folders": ["{n} folder", "{n} folders"],
      "m.requests": ["{n} request", "{n} requests"],

      "warn.title": ["{n} warning while reading the file", "{n} warnings while reading the file"],
      "warn.body":
        "These annotations point to elements that are not in the metadata. They were skipped and every request was still generated.",
      "err.title": "This file could not be read",
      "err.hint":
        "Check that it is the content of <code>$metadata</code> and starts with <code>&lt;edmx:Edmx</code>.",
      "err.file": "The browser could not read {file}.",

      "st.preparing": "Preparing the file…",
      "st.saved": "Saved {file}",
      "st.declined": "Save cancelled.",
      "st.busy": "A save dialog is already open. Answer it, then try again.",
      "st.copied": "Collection copied. In Postman choose Import and paste it.",
      "st.saveFail":
        "The file could not be saved in this view. Copy the content below and save it as {file}.",
      "st.copyFail":
        "The browser blocked automatic copying. The text is selected, press Ctrl+C to copy it.",

      "steps.title": "Import into Postman",
      "steps.1":
        "Select <b>Download Postman Collection</b> to save the <code>.postman_collection.json</code> file.",
      "steps.2": "In Postman select <b>Import</b> and drop the file in.",
      "steps.3": "Open the collection's <b>Variables</b> tab and fill in {vars}.",
      "steps.3none":
        "Open the collection's <b>Variables</b> tab and fill in the key variables you need, such as a document number.",
      "steps.4":
        "Run a GET request first. PATCH bodies are empty on purpose: the request description lists the fields you can send.",
      and: " and ",

      "faq.title": "Questions",
      "faq.q1": "What is an EDMX file?",
      "faq.a1":
        "It is the XML document an OData service returns at <code>/$metadata</code>. It describes the entity sets, their properties and keys, navigations and function imports. SAP Gateway services and S/4HANA APIs all expose one.",
      "faq.q2": "Can Postman import EDMX directly?",
      "faq.a2":
        "No. Postman imports OpenAPI, RAML, WSDL, cURL and its own collection format. This converter produces a Postman Collection v2.1 that imports as it is, plus an OpenAPI 3 file for other tools.",
      "faq.q3": "Is my metadata uploaded anywhere?",
      "faq.a3":
        "No. The conversion is JavaScript running on this page. The file is read locally and no request carries its content to a server.",
      "faq.q4": "What is in the generated collection?",
      "faq.a4":
        "One folder per entity set with list, read, create, update and delete requests, plus navigation requests, function imports and <code>$batch</code>. Query options such as <code>$filter</code> and <code>$expand</code> are included and switched off until you need them.",
      "faq.q5": "Why do write requests need a CSRF token?",
      "faq.a5":
        "SAP Gateway rejects POST, PATCH and DELETE calls that lack an <code>x-csrf-token</code> header. The generated collection fetches a token before each write request. Turn the option off for services without CSRF protection.",
      "faq.q6": "Which OData versions are supported?",
      "faq.a6":
        "OData V2, V3 and V4 metadata. For SAP services the <code>sap:label</code> texts become the folder descriptions.",

      foot: "The EDMX to OpenAPI step uses the open-source odata-openapi library from OASIS.",

      // Texts written into the generated Postman collection
      "pm.other": "Other",
      "pm.updatable": "Updatable fields: ",
      "pm.ifMatch": "Enable if the entity uses ETags",
      "pm.csrf1": "Fetch a CSRF token before every write request (POST/PUT/PATCH/DELETE).",
      "pm.csrf2": "SAP Gateway rejects write requests without the x-csrf-token header.",
      "pm.csrfError": "Could not fetch a CSRF token",
    },

    vi: {
      "lang.name": "Tiếng Việt",
      "meta.locale": "vi_VN",
      "meta.name": "EDMX sang Postman",
      "meta.title": "Chuyển EDMX sang Postman | Đổi metadata OData thành Postman Collection",
      "meta.description":
        "Công cụ miễn phí chạy trên trình duyệt, đổi file $metadata (EDMX) của OData thành Postman Collection và OpenAPI 3. Dùng được với SAP OData V2 và V4. Không tải file lên máy chủ.",

      skip: "Đi tới công cụ chuyển đổi",
      "nav.label": "Ngôn ngữ",
      "nav.source": "Mã nguồn trên GitHub",
      h1: "Đổi file EDMX sang Postman Collection",
      lede: "Đổi <code>$metadata</code> của OData thành Postman Collection và file OpenAPI 3. File không rời khỏi trình duyệt của bạn.",

      "src.title": "File nguồn",
      "src.drop": "Chọn file .edmx hoặc kéo thả vào đây",
      "src.dropHint": "Nhận metadata OData V2, V3 và V4, tức nội dung trả về của <code>$metadata</code>.",
      "src.sample": "File mẫu",
      "src.paste": "Hoặc dán nội dung XML",
      "src.pasteLabel": "Nội dung XML",
      "src.pasteUse": "Dùng nội dung này",
      "src.pasted": "Nội dung đã dán",

      "url.title": "Địa chỉ service",
      "url.scheme": "Giao thức",
      "url.host": "Host",
      "url.path": "Đường dẫn service",
      "url.pathHint":
        "Tự lấy từ file khi có. Để host là <code>{{host}}</code> thì bạn điền host thật trong Postman.",
      "url.client": "sap-client",
      "url.clientPh": "ví dụ 100",
      "url.auth": "Xác thực",
      "auth.basic": "Basic (user và password)",
      "auth.bearer": "Bearer token",
      "auth.none": "Không đặt",
      "url.name": "Tên collection",
      "url.nameHint":
        "Tài khoản không nhập ở đây. Collection dùng biến để bạn điền trong Postman.",

      "opt.title": "Tùy chọn collection",
      "opt.csrf": "Tự lấy CSRF token",
      "opt.csrfHint":
        "Thêm script lấy <code>x-csrf-token</code> trước mỗi POST, PATCH và DELETE. SAP Gateway yêu cầu header này.",
      "opt.top": "Bật sẵn <code>$top=50</code>",
      "opt.topHint": "Request đọc danh sách chỉ lấy 50 dòng đầu thay vì cả bảng.",
      "opt.deep": "Body tạo mới kèm dòng con",
      "opt.deepHint":
        "Body của POST có sẵn khung cho các navigation dạng danh sách (deep insert), ví dụ header kèm item.",
      "opt.batch": "Bỏ request <code>$batch</code>",

      "res.label": "Collection sinh ra",
      "res.dlPostman": "Tải Postman Collection",
      "res.dlOpenapi": "Tải OpenAPI 3",
      "res.copy": "Sao chép collection",
      "res.folders": "Thư mục và request",
      "col.folder": "Thư mục",
      "col.total": "Tổng",
      "m.sets": ["{n} entity set", "{n} entity set"],
      "m.folders": ["{n} thư mục", "{n} thư mục"],
      "m.requests": ["{n} request", "{n} request"],

      "warn.title": ["{n} cảnh báo khi đọc file", "{n} cảnh báo khi đọc file"],
      "warn.body":
        "Các annotation này trỏ tới phần tử không có trong metadata. Chúng bị bỏ qua, các request vẫn được sinh đủ.",
      "err.title": "Không đọc được file này",
      "err.hint":
        "Hãy kiểm tra đây có đúng là nội dung của <code>$metadata</code> và bắt đầu bằng <code>&lt;edmx:Edmx</code>.",
      "err.file": "Trình duyệt không đọc được {file}.",

      "st.preparing": "Đang chuẩn bị file…",
      "st.saved": "Đã lưu {file}",
      "st.declined": "Bạn đã hủy lưu file.",
      "st.busy": "Đang có một hộp thoại lưu file mở. Hãy trả lời nó rồi thử lại.",
      "st.copied": "Đã sao chép collection. Trong Postman chọn Import rồi dán vào.",
      "st.saveFail":
        "Không lưu được file ở chế độ xem này. Hãy sao chép nội dung dưới đây và lưu thành {file}.",
      "st.copyFail":
        "Trình duyệt chặn sao chép tự động. Nội dung đã được chọn sẵn, nhấn Ctrl+C để sao chép.",

      "steps.title": "Đưa vào Postman",
      "steps.1":
        "Bấm <b>Tải Postman Collection</b> để lưu file <code>.postman_collection.json</code>.",
      "steps.2": "Trong Postman bấm <b>Import</b> rồi kéo file vừa tải vào.",
      "steps.3": "Mở tab <b>Variables</b> của collection và điền {vars}.",
      "steps.3none":
        "Mở tab <b>Variables</b> của collection và điền các biến khóa bạn cần, ví dụ số chứng từ.",
      "steps.4":
        "Chạy thử một request GET trước. Body của PATCH để trống có chủ ý: danh sách field gửi được nằm trong mô tả request.",
      and: " và ",

      "faq.title": "Câu hỏi thường gặp",
      "faq.q1": "File EDMX là gì?",
      "faq.a1":
        "Đó là tài liệu XML mà một service OData trả về tại <code>/$metadata</code>. Nó mô tả các entity set, thuộc tính và khóa, navigation và function import. Service SAP Gateway và API của S/4HANA đều có.",
      "faq.q2": "Postman có import thẳng file EDMX được không?",
      "faq.a2":
        "Không. Postman nhận OpenAPI, RAML, WSDL, cURL và định dạng collection của chính nó. Công cụ này sinh ra Postman Collection v2.1 import được ngay, kèm file OpenAPI 3 cho các công cụ khác.",
      "faq.q3": "Metadata của tôi có bị tải lên đâu không?",
      "faq.a3":
        "Không. Việc chuyển đổi là JavaScript chạy ngay trên trang này. File được đọc tại máy và không request nào mang nội dung của nó tới máy chủ.",
      "faq.q4": "Collection sinh ra có những gì?",
      "faq.a4":
        "Mỗi entity set một thư mục với request đọc danh sách, đọc một dòng, tạo, sửa và xóa, cùng request navigation, function import và <code>$batch</code>. Các tham số như <code>$filter</code> và <code>$expand</code> có sẵn và tắt cho tới khi bạn cần.",
      "faq.q5": "Vì sao request ghi cần CSRF token?",
      "faq.a5":
        "SAP Gateway từ chối POST, PATCH và DELETE thiếu header <code>x-csrf-token</code>. Collection sinh ra tự lấy token trước mỗi request ghi. Hãy tắt tùy chọn này với service không bật chống CSRF.",
      "faq.q6": "Hỗ trợ những phiên bản OData nào?",
      "faq.a6":
        "Metadata OData V2, V3 và V4. Với service SAP, nội dung <code>sap:label</code> trở thành mô tả của thư mục.",

      foot: "Bước đổi EDMX sang OpenAPI dùng thư viện mã nguồn mở odata-openapi của OASIS.",

      "pm.other": "Khác",
      "pm.updatable": "Các field có thể cập nhật: ",
      "pm.ifMatch": "Bật lên nếu entity dùng ETag",
      "pm.csrf1": "Lấy CSRF token trước mỗi request ghi (POST/PUT/PATCH/DELETE).",
      "pm.csrf2": "SAP Gateway từ chối request ghi nếu thiếu header x-csrf-token.",
      "pm.csrfError": "Không lấy được CSRF token",
    },
  },
};

# convert_edmx_to_post_man

Đổi file metadata OData (`.edmx`, nội dung của `$metadata`) thành **Postman Collection v2.1** và **OpenAPI 3**. Chạy hoàn toàn trong trình duyệt, file không được gửi đi đâu. Nhận OData V2, V3 và V4.

Giao diện có tiếng Anh và tiếng Việt.

## Dùng ngay

Tải [edmx-sang-postman-offline.html](edmx-sang-postman-offline.html) về và mở bằng trình duyệt. Không cần cài gì.

1. Chọn hoặc kéo thả file `.edmx` (hoặc dán XML).
2. Chỉnh host, đường dẫn service, `sap-client`, kiểu xác thực nếu cần.
3. Bấm **Tải Postman Collection**, rồi trong Postman bấm **Import** và kéo file vào.
4. Mở tab **Variables** của collection, điền `host`, `username`, `password`.

## Collection sinh ra có gì

- Một thư mục cho mỗi entity set, cộng function import và `$batch`.
- Biến `{{baseUrl}}`, `{{host}}`, `{{username}}`, `{{password}}` và biến cho từng khóa trong URL (ví dụ `{{PurchaseOrder}}`).
- Script pre-request tự lấy `x-csrf-token` trước mỗi POST/PUT/PATCH/DELETE (cần cho SAP Gateway).
- `$top=50` bật sẵn cho request đọc danh sách; `$filter`, `$select`, `$expand`, `$orderby` có sẵn nhưng tắt.
- Body POST kèm khung dòng con cho các navigation dạng danh sách (deep insert).
- Body PATCH/PUT để trống có chủ ý, danh sách field nằm trong mô tả request. Điền sẵn mọi field bằng chuỗi rỗng thì gửi nhầm sẽ xóa dữ liệu thật.

## Build từ mã nguồn

Cần Node.js.

```bash
npm install
npm run build
```

Lệnh build sinh ra:

| Kết quả | Dùng để |
| --- | --- |
| `public/` | Website tĩnh để triển khai (Vercel: lệnh build `npm run build`, thư mục output `public`) |
| `edmx-sang-postman-offline.html` | Một file duy nhất, đủ mọi ngôn ngữ, mở trực tiếp từ đĩa |
| `edmx-sang-postman.html` | Cùng nội dung nhưng không có khung `<html>`, để nhúng vào trang khác |

Xem thử website tại `http://127.0.0.1:4173`:

```bash
npm run serve
```

Chạy phần lõi với một file EDMX bằng Node:

```bash
node src/test.js src/core.js duong-dan/toi/file.edmx
```

## Ngôn ngữ

Mọi chuỗi hiển thị nằm trong [src/i18n.js](src/i18n.js). Để thêm một ngôn ngữ:

1. Sao chép khối `en` và đổi khóa thành mã ngôn ngữ, ví dụ `de`.
2. Dịch các giá trị. Giữ nguyên thẻ HTML như `<code>` và các chỗ điền như `{file}`.
3. Chạy `npm run build`. Build báo lỗi nếu thiếu khóa nào.

Ngôn ngữ mới tự có trang riêng (`/de/`), tự xuất hiện trong nút chuyển ngôn ngữ, trong thẻ `hreflang` và trong `sitemap.xml`. Ngôn ngữ ở trang gốc `/` là giá trị `fallback` trong file đó.

Trên website, mỗi ngôn ngữ là một trang tĩnh riêng để công cụ tìm kiếm đọc được. Người mở trang gốc lần đầu được chuyển sang ngôn ngữ của trình duyệt nếu có; sau đó trang nhớ ngôn ngữ họ chọn. Bản một file đổi ngôn ngữ ngay tại chỗ.

## SEO

Mỗi trang trong `public/` có sẵn tiêu đề, mô tả, thẻ Open Graph, dữ liệu có cấu trúc (`WebApplication` và `FAQPage`), `favicon.svg` và `robots.txt`.

Thẻ `canonical`, `hreflang` và `sitemap.xml` cần địa chỉ website. Build tự lấy tên miền production khi chạy trên Vercel. Ở nơi khác, đặt biến `SITE_URL`:

```bash
SITE_URL=https://ten-mien-cua-ban.com npm run build
```

Chưa có ảnh xem trước khi chia sẻ link (`og:image`).

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `src/core.js` | Lõi: EDMX → OpenAPI 3 → Postman Collection |
| `src/i18n.js` | Chuỗi hiển thị của từng ngôn ngữ |
| `src/page.body.html` | Khung trang, các chỗ chữ đánh dấu bằng `data-i18n` |
| `src/page.css` | Giao diện |
| `src/page.js` | Hành vi của trang |
| `src/sample.edmx` | File mẫu hiện khi mở trang |
| `src/build.js` | Đóng gói bằng esbuild, dựng trang cho từng ngôn ngữ, sinh thẻ SEO |
| `src/serve.js` | Server xem thử |
| `src/test.js` | Chạy thử lõi bằng Node |

Phần chuyển EDMX sang OpenAPI dùng thư viện [odata-openapi](https://github.com/oasis-tcs/odata-openapi) và [odata-csdl](https://github.com/oasis-tcs/odata-csdl) của OASIS.

# convert_edmx_to_post_man

Đổi file metadata OData (`.edmx`, nội dung của `$metadata`) thành **Postman Collection v2.1** và **OpenAPI 3**. Chạy hoàn toàn trong trình duyệt, file không được gửi đi đâu. Nhận OData V2, V3 và V4.

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

Lệnh build sinh ra hai file ở thư mục gốc:

- `edmx-sang-postman-offline.html`: trang hoàn chỉnh, mở trực tiếp từ đĩa.
- `edmx-sang-postman.html`: cùng nội dung nhưng không có khung `<html>`, dùng để nhúng vào trang khác.

Xem thử qua server cục bộ tại `http://127.0.0.1:4173`:

```bash
npm run serve
```

Chạy phần lõi với một file EDMX bằng Node:

```bash
node src/test.js src/core.js duong-dan/toi/file.edmx
```

## Cấu trúc

| File | Vai trò |
| --- | --- |
| `src/core.js` | Lõi: EDMX → OpenAPI 3 → Postman Collection |
| `src/page.html` | Giao diện |
| `src/build.js` | Đóng gói lõi bằng esbuild và nhúng vào trang |
| `src/serve.js` | Server xem thử |
| `src/test.js` | Chạy thử lõi bằng Node |

Phần chuyển EDMX sang OpenAPI dùng thư viện [odata-openapi](https://github.com/oasis-tcs/odata-openapi) và [odata-csdl](https://github.com/oasis-tcs/odata-csdl) của OASIS.

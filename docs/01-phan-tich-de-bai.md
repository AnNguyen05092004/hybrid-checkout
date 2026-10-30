# Bước 1 — Phân tích đề bài

**Đề tài:** Hệ thống thanh toán tại quầy kết hợp mã vạch và thị giác máy tính
**Sản phẩm:** HybridCheckout

## 1. Bối cảnh

Phần lớn cửa hàng bán lẻ ở Việt Nam thanh toán tại **quầy có thu ngân**: quét mã vạch từng món, phần mềm bán hàng (POS) cộng tiền.

Mã vạch rẻ và chính xác. Điểm yếu là POS chỉ biết **những món đã được quét**. Món bị quét sót, cố ý bỏ qua hoặc quét nhầm mã rẻ hơn thì POS không có dấu vết nào. Camera nhìn được **cả khay**, nên phát hiện được những món này.

## 2. Phân rã vấn đề

```
MỤC TIÊU: giảm thất thoát tại quầy, giữ tốc độ phục vụ
│
├── P1. Thất thoát mà POS không thấy
│   ├── Quét sót do vội, hàng che nhau
│   ├── Cố ý không quét cho người quen ("sweethearting")
│   └── Quét mã món rẻ cho món đắt (tráo mã)
│
├── P2. Chậm giờ cao điểm
│   └── Khay 10–20 món phải quét từng món
│
├── P3. Camera không theo kịp hàng mới
│   ├── Cửa hàng nhập SKU mới theo đợt; model chưa học thì không kiểm tra được
│   └── Train lại từ đầu mỗi đợt tốn GPU và phải giữ mãi ảnh cũ
│
└── P4. Dữ liệu cho mỗi đợt tốn công
    ├── Vẽ tay box trên ảnh khay (có cả hàng cũ lẫn hàng mới) rất lâu
    └── Ảnh ghép thì rẻ nhưng khác ảnh camera thật, không dùng để duyệt model được
```

P1, P2 xảy ra **tại quầy**. P3, P4 là việc **hậu trường**, quyết định camera ở quầy có theo kịp hàng mới không.

## 3. Giải pháp hiện có

| Giải pháp | Ưu điểm | Hạn chế |
|---|---|---|
| Quét mã vạch truyền thống | Rẻ, chính xác | Không thấy món chưa quét; chậm với khay nhiều món |
| Camera theo dõi động tác thu ngân (StopLift…) [1][2] | Bắt được bỏ quét | Chủ yếu hậu kiểm sau giao dịch, khách đã đi |
| Kiosk nhận diện cả khay (Mashgin) [3][4] | Nhanh, giao dịch 15–19 giây | Phần cứng nhiều camera; độ chính xác do hãng tự công bố |
| Cửa hàng không thu ngân (Amazon Just Walk Out) [5][6] | Không cần quầy | Amazon gỡ khỏi chuỗi Fresh (04/2024); báo chí đưa tin nhiều giao dịch cần người xem lại |
| Quầy tự thanh toán | Giảm nhân sự | Thất thoát cao hơn, nhiều chuỗi đã thu hẹp |

Quy mô: thất thoát bán lẻ ở Mỹ năm 2022 khoảng **1,6% doanh thu** (NRF) [7]. Chưa có số liệu công khai cho Việt Nam.

**Rút ra:**
1. Camera **thay** con người chưa đủ tin cậy; camera **hỗ trợ** con người thì đang được dùng thực tế.
2. Cảnh báo phải có **trước khi khách trả tiền**.
3. Chưa giải pháp nào giải quyết chi phí **cập nhật model khi danh mục đổi** (P3, P4).

## 4. Hướng giải pháp

### 4.1 Vì sao giữ mã vạch
Model nhận diện **từng món** rất tốt nhưng đúng **cả khay** thì thấp hơn nhiều, vì sai số cộng dồn: mỗi món đúng 97% thì khay 15 món đúng hết chỉ còn 0,97¹⁵ ≈ 63%. Vì vậy **mã vạch quyết định hóa đơn, camera kiểm tra và tăng tốc**.

### 4.2 Vì sao chỉ làm quầy có thu ngân
- Đây là mô hình phổ biến ở Việt Nam.
- Cổng từ ở cửa ra chỉ báo hàng có gắn tem; snack, nước, mì thường không gắn.
- Có người xử lý cảnh báo ngay tại chỗ, trước khi khách trả tiền.
- Quầy tự thanh toán để làm hướng phát triển.

### 4.3 Ba tính năng AI

| # | Tính năng | Làm gì | Giải quyết |
|---|---|---|---|
| 1 | **Kiểm tra chéo** | Thu ngân quét mã như thường. Trước khi thanh toán, camera chụp khay, hệ thống so với danh sách đã quét và báo *món chưa quét* hoặc *nghi tráo mã* | P1 |
| 2 | **Làn nhanh** | Khách đặt cả khay. Camera tự thêm món chắc chắn; thu ngân chỉ quét món không chắc và hàng mới | P2 |
| 3 | **Trợ lý gán nhãn** | Khi nhập hàng mới: (a) chụp từng sản phẩm, AI cắt nền, hệ thống ghép thành ảnh khay có sẵn box để **huấn luyện**; (b) trên ảnh khay thật từ quầy, model đề xuất box hàng cũ, người chỉ vẽ hàng mới để tạo tập **kiểm tra** cho cổng duyệt | P3, P4 |

```
 TẠI QUẦY                                  HẬU TRƯỜNG
 ┌───────────────────────┐   hàng mới      ┌──────────────────────────────┐
 │ 1. Kiểm tra chéo      │   chưa học      │ 3. Trợ lý gán nhãn           │
 │ 2. Làn nhanh          │ ──────────────► │ → huấn luyện → duyệt → deploy│
 │                       │ ◄────────────── │                              │
 └───────────────────────┘   model mới     └──────────────────────────────┘
```

Mã vạch còn giúp camera: khi khay có **hàng mới model chưa học**, mã vạch báo trước điều đó, nên hệ thống không cảnh báo nhầm ở món ấy.

## 5. Model nhận diện

Hệ thống dùng model nhận diện đang được nghiên cứu: phát hiện và đếm SKU trên ảnh khay chụp từ trên xuống. Model **học thêm SKU mới theo đợt** mà không train lại từ đầu và không cần giữ ảnh của các đợt cũ.

Model học từ **ảnh ghép** (ảnh chụp từng sản phẩm, cắt nền, dán lên nền khay); các chỉ số dưới đây đo trên **ảnh khay thật**. Vì vậy hệ thống cũng lấy ảnh ghép để huấn luyện và ảnh thật để duyệt model.

| Chỉ số (bản mới nhất, 200 SKU) | Giá trị | Hệ quả cho thiết kế |
|---|---|---|
| AP50 (đúng từng món) | 94,9% | Đủ để gắn cờ món lệch |
| cAcc (đúng cả khay) | 43,2% | Chưa đủ để tự tính tiền → giữ mã vạch |
| cAcc khay dễ / vừa / khó | 62 / 41 / 27% | Khay nhiều món dễ sai → làn nhanh cần bước quét bổ sung |
| Độ chính xác đề xuất box hàng cũ | ≥ 98,5% | Trợ lý gán nhãn đáng tin, người chỉ cần lướt duyệt |
| Mức quên hàng cũ sau mỗi đợt | ≈ 0 | Model mới không làm hỏng việc kiểm tra hàng cũ |
| Thời gian huấn luyện một đợt | 5–6 giờ GPU | Huấn luyện phải chạy nền |

Dữ liệu: bộ RPC [8], 200 SKU thuộc 17 nhóm hàng, chia thành 5 đợt (100 + 4 × 25 SKU).

## 6. Mục tiêu đo được

| ID | Mục tiêu | Chỉ tiêu ban đầu | Cách đo |
|---|---|---|---|
| G1 | Bắt món quét sót | ≥ 90% | Trên ảnh test: bỏ ngẫu nhiên 1 món khỏi danh sách quét |
| G2 | Ít báo nhầm khay sạch | ≤ 10% | Cùng thí nghiệm, khay không bỏ món |
| G3 | Phát hiện tráo mã | Đo và báo cáo | Thay 1 món bằng SKU cùng nhóm |
| G4 | Làn nhanh tự nhận món | ≥ 70% món, đúng ≥ 99% | Trên ảnh test |
| G5 | Phản hồi tại quầy | ≤ 3 giây (có GPU) | Đo khi demo |
| G6 | Theo kịp hàng mới | Báo cáo độ phủ SKU và số ngày từ tạo đợt đến deploy | Dashboard |
| G7 | Giảm công gán nhãn | ≥ 90% đề xuất được chấp nhận không sửa | Thống kê trong trợ lý gán nhãn |

Chỉ tiêu ban đầu là giả thuyết, chốt lại sau khi đo. Ngưỡng luôn chọn trên tập val, không chọn trên tập test.

## 7. Phạm vi

**Làm:** quầy thu ngân với Kiểm tra chéo và Làn nhanh · xử lý cảnh báo, xác nhận của quản lý · danh mục SKU · đợt nhập, ảnh mẫu → ảnh ghép, Trợ lý gán nhãn ảnh thật · job huấn luyện, phiên bản model, cổng duyệt, deploy/rollback · dashboard, hậu kiểm, giám sát model · người dùng, quầy/camera, nhật ký, chính sách lưu ảnh.

**Không làm:** quầy tự thanh toán · thanh toán và in hóa đơn thật · kết nối POS/ERP có sẵn · hàng không mã vạch (rau, bánh mì) · theo dõi khách/nhân viên (camera chỉ chụp khay) · huấn luyện thật trong bản demo.

## 8. Người dùng

| Vai trò | Cần gì |
|---|---|
| Thu ngân | Quét nhanh; biết ngay món nào cần quét lại; không bị cảnh báo vô lý |
| Quản lý cửa hàng | Xác nhận cảnh báo tại quầy; xem thất thoát; quản lý danh mục, giá, đợt nhập |
| Kỹ sư ML | Chuẩn bị dữ liệu nhanh (ảnh mẫu, ảnh thật); huấn luyện, so sánh, deploy model an toàn |
| Quản trị viên | Tài khoản, quầy/camera, nhật ký, chính sách dữ liệu |

## 9. Giả định và ràng buộc

| | |
|---|---|
| Dữ liệu | Bộ RPC (ảnh khay từ trên xuống). Ảnh tự chụp hàng khác sẽ không nhận được |
| Giấy phép | RPC: CC BY-NC-SA 4.0, chỉ dùng phi thương mại, không đưa ảnh gốc lên repo |
| Mã vạch, giá | RPC không có; hệ thống tự gán mã dải nội bộ GS1 (tiền tố 200) và giá giả định |
| Phần cứng mỗi quầy | 1 camera trên cao, 1 máy quét, 1 màn hình cảm ứng. Demo giả lập bằng ảnh mẫu |
| Model | Chạy thành dịch vụ riêng (Python/PyTorch); demo dùng checkpoint có sẵn của 5 đợt |
| Quyền riêng tư | Ảnh khay lưu có hạn; ảnh của một đợt nhập bị xóa sau khi model đợt đó được deploy |

## 10. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Suy luận chậm khi không có GPU | Đo sớm; nếu chậm thì dùng GPU thuê hoặc cache kết quả ảnh demo |
| Báo nhầm nhiều, thu ngân bỏ qua cảnh báo | Chỉ cảnh báo khi đủ tự tin; chỉnh ngưỡng theo nhóm; theo dõi tỉ lệ báo nhầm |
| SKU giống nhau bị nhầm, báo tráo mã sai | Hiện ảnh vùng nghi ngờ; hạ mức cảnh báo cho cặp hay nhầm |
| Thu ngân tự tắt cảnh báo của mình | Cảnh báo nghiêm trọng chỉ đóng bằng quét bổ sung hoặc PIN quản lý |
| Deploy model kém hơn | Cổng duyệt và rollback một bước |
| Model tốt trên ảnh ghép nhưng kém ở quầy | Cổng duyệt chỉ đo trên ảnh thật; ảnh khó từ quầy đưa vào hàng đợi gán nhãn đợt sau |

## 11. Quyết định đã chốt

| ID | Quyết định |
|---|---|
| D01 | Mã vạch quyết định hóa đơn; camera kiểm tra và tăng tốc |
| D02 | Chỉ quầy có thu ngân |
| D03 | Ba tính năng AI: Kiểm tra chéo, Làn nhanh, Trợ lý gán nhãn |
| D04 | Bốn vai trò: Thu ngân, Quản lý cửa hàng, Kỹ sư ML, Quản trị viên |
| D05 | Đối chiếu diễn ra trước thanh toán; cảnh báo mức Cao chặn thanh toán |
| D06 | Camera chỉ kiểm tra SKU mà model đang chạy đã học |
| D07 | Model chạy thành dịch vụ riêng, hệ thống không sửa code model |
| D08 | Tài liệu tiếng Việt; prototype giao diện bằng React, dữ liệu giả lập |
| D09 | Ảnh ghép là dữ liệu huấn luyện chính; ảnh thật làm tập kiểm tra. Trộn ảnh thật vào huấn luyện chỉ bật khi thí nghiệm cho thấy có lợi |

## 12. Thuật ngữ

| Từ | Nghĩa |
|---|---|
| SKU | Một mặt hàng cụ thể, ví dụ một loại nước ngọt lon 330 ml |
| Đối chiếu | So danh sách đã quét với danh sách camera nhận diện |
| SKU đã học / chưa học | SKU mà model đang chạy đã / chưa được huấn luyện để nhận diện |
| Đợt nhập | Một lô SKU mới đưa vào cùng lúc; model học thêm theo từng đợt |
| Độ phủ SKU | Tỉ lệ SKU đang bán mà model đã học |
| AP50 | Độ chính xác nhận diện từng món |
| cAcc | Tỉ lệ khay được đếm đúng toàn bộ |
| Cổng duyệt | Điều kiện phiên bản model mới phải đạt trước khi deploy |
| Ảnh mẫu | Ảnh chụp riêng từng sản phẩm, đã cắt nền |
| Ảnh ghép | Ảnh khay tạo bằng cách dán ảnh mẫu lên nền khay; box có sẵn |
| Tập kiểm tra (val) | Ảnh khay thật đã gán nhãn đủ, dùng để duyệt model |

## Nguồn

1. Chain Store Age — *The not-so-sweet side of retail loss*: https://chainstoreage.com/news/not-so-sweet-side-retail-loss
2. Progressive Grocer — *Scan Avoidance Tech Saves 2 Grocers Bundles of Cash*: https://progressivegrocer.com/scan-avoidance-tech-saves-2-grocers-bundles-cash
3. Mashgin — FAQ: https://mashgin.com/faq
4. Supermarket Perimeter — *Mashgin speeds up checkout lines*: https://www.supermarketperimeter.com/articles/12341-mashgin-speeds-up-checkout-lines-with-ai-powered-kiosks
5. CNBC — *Amazon ditches cashierless checkout system at its grocery stores* (04/2024): https://www.cnbc.com/2024/04/03/amazon-ditches-cashierless-checkout-system-at-its-grocery-stores.html
6. Retail Dive — *Amazon removes Just Walk Out tech from Amazon Fresh stores*: https://www.retaildive.com/news/amazon-removes-just-walk-out-tech-amazon-fresh-stores-dash-carts/712150
7. NRF — *National Retail Security Survey 2023*: https://nrf.com/research/national-retail-security-survey-2023
8. Wei et al. — *RPC: A Large-Scale Retail Product Checkout Dataset* (2019): https://rpc-dataset.github.io

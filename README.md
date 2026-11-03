# HybridCheckout

**Thanh toán tại quầy có camera AI hỗ trợ thu ngân: bắt món quét sót, quét nhanh hơn.**

Thu ngân vẫn quét mã vạch để tính tiền. Trước khi khách trả tiền, camera trên quầy chụp khay hàng, hệ thống so với danh sách đã quét và báo **món chưa quét** hoặc **nghi tráo mã**. Khi cửa hàng nhập hàng mới, model nhận diện học thêm SKU mới theo đợt mà không train lại từ đầu.

## 1. Phân tích đề bài

### 1.1 Vấn đề

POS chỉ biết những món **đã được quét**. Món quét sót, cố ý bỏ qua hoặc quét mã món rẻ cho món đắt đều không để lại dấu vết. Thất thoát bán lẻ ở Mỹ khoảng 1,6% doanh thu (NRF, 2022).

| | Vấn đề | Xảy ra ở |
|---|---|---|
| P1 | Thất thoát POS không thấy: quét sót, cố ý không quét, tráo mã | Tại quầy |
| P2 | Chậm giờ cao điểm: khay 10–20 món phải quét từng món | Tại quầy |
| P3 | Camera không theo kịp hàng mới; train lại từ đầu mỗi đợt thì tốn GPU | Hậu trường |
| P4 | Dữ liệu mỗi đợt tốn công: vẽ box tay rất lâu; ảnh ghép thì rẻ nhưng khác ảnh camera thật | Hậu trường |

**Giải pháp hiện có:** camera theo dõi thu ngân (StopLift) chủ yếu hậu kiểm sau khi khách đã đi; kiosk nhận diện cả khay (Mashgin) cần phần cứng nhiều camera; Amazon Just Walk Out đã bị gỡ khỏi chuỗi Fresh (2024). Rút ra: camera **hỗ trợ** người thì đang chạy thực tế, camera **thay** người thì chưa đủ tin cậy. Cảnh báo phải có **trước khi khách trả tiền**.

### 1.2 Hướng giải pháp

- **Mã vạch quyết định hóa đơn, camera kiểm tra và tăng tốc.** Model đúng từng món rất cao nhưng đúng cả khay thấp hơn nhiều vì sai số cộng dồn: mỗi món đúng 97% thì khay 15 món chỉ đúng hết 0,97¹⁵ ≈ 63%.
- **Chỉ làm quầy có thu ngân.** Đây là mô hình phổ biến ở Việt Nam, và có người xử lý cảnh báo ngay tại chỗ.
- **Mã vạch còn giúp camera:** khi khay có hàng model chưa học, mã vạch báo trước nên hệ thống không cảnh báo nhầm ở món đó.

| Tính năng AI | Làm gì | Giải quyết |
|---|---|---|
| **1. Kiểm tra chéo** | Camera tự chụp khay khi khách đặt hàng xuống; thu ngân quét mã và cho vào túi như thường. Bấm Thanh toán thì hệ thống đối chiếu và cảnh báo *món chưa quét*, *nghi tráo mã*. Cảnh báo mức Cao khóa nút Thanh toán | P1 |
| **2. Làn nhanh** | Camera nhận diện cả khay, tự thêm món chắc chắn; thu ngân chỉ quét món không chắc và hàng mới | P2 |
| **3. Trợ lý gán nhãn** | Khi nhập hàng mới: (a) chụp từng sản phẩm, AI cắt nền, hệ thống ghép thành ảnh khay có sẵn box để **huấn luyện**; (b) trên ảnh khay thật, model đề xuất box hàng cũ, người chỉ vẽ hàng mới để tạo tập **kiểm tra** cho cổng duyệt | P3, P4 |

```text
 TẠI QUẦY                               HẬU TRƯỜNG
 ┌────────────────────┐   hàng mới      ┌───────────────────────────────────┐
 │ 1. Kiểm tra chéo   │   chưa học      │ 3. Trợ lý gán nhãn                │
 │ 2. Làn nhanh       │ ──────────────► │ ảnh ghép + ảnh thật → huấn luyện  │
 │                    │ ◄────────────── │ → cổng duyệt → deploy             │
 └────────────────────┘   model mới     └───────────────────────────────────┘
```

### 1.3 Mục tiêu và phạm vi

| ID | Mục tiêu | Chỉ tiêu ban đầu |
|---|---|---|
| G1 | Bắt món quét sót | ≥ 90% |
| G2 | Ít báo nhầm | ≤ 10%: trong 100 khay đã quét đủ và đúng, tối đa 10 khay vẫn bị cảnh báo |
| G3 | Phát hiện tráo mã | Đo và báo cáo |
| G4 | Làn nhanh tự nhận món | ≥ 70% món, đúng ≥ 99% |
| G5 | Phản hồi tại quầy | ≤ 3 giây (có GPU) |
| G6 | Theo kịp hàng mới | Báo cáo độ phủ SKU, số ngày từ tạo đợt đến deploy |
| G7 | Giảm công gán nhãn | ≥ 90% đề xuất được chấp nhận không sửa |

**Làm:** quầy thu ngân (Kiểm tra chéo, Làn nhanh), xử lý cảnh báo và xác nhận của quản lý, danh mục SKU, đợt nhập và Trợ lý gán nhãn, job huấn luyện, phiên bản model, cổng duyệt, deploy/rollback, dashboard, hậu kiểm, giám sát model, người dùng, quầy/camera, nhật ký, chính sách lưu ảnh.

**Không làm:** quầy tự thanh toán, thanh toán thật, kết nối POS/ERP có sẵn, hàng không mã vạch, theo dõi người (camera chỉ chụp khay).

Chi tiết (nguồn tham khảo, rủi ro, giả định, quyết định D01–D09): [Bước 1](docs/01-phan-tich-de-bai.md).

## 2. Yêu cầu: mind map, use case, user story

### 2.1 Product mind map

![Mind map](docs/images/mindmap.png)

### 2.2 Use case

```mermaid
flowchart TB
    subgraph actors[" "]
        direction LR
        cashier(["Thu ngân"])
        manager(["Quản lý cửa hàng"])
        ml(["Kỹ sư ML"])
        admin(["Quản trị viên"])
    end
    subgraph sys["HybridCheckout"]
        direction LR
        c["<b>Tại quầy</b><br/>UC04 Mở / đóng ca<br/>UC05 Thanh toán — Kiểm tra chéo<br/>UC06 Thanh toán — Làn nhanh<br/>UC08 Xử lý cảnh báo<br/>UC09 Hoàn tất thanh toán<br/>UC10 Xóa dòng / hủy giao dịch<br/>UC11 Xem lịch sử ca"]
        m["<b>Vận hành cửa hàng</b><br/>UC12 Xác nhận bằng PIN<br/>UC13 Xem dashboard<br/>UC14 Hậu kiểm cảnh báo<br/>UC15 Quản lý danh mục SKU<br/>UC16 Tạo và theo dõi đợt nhập"]
        l["<b>Vận hành model</b><br/>UC17 Tạo ảnh ghép từ ảnh mẫu<br/>UC18 Gán nhãn ảnh thật có trợ lý<br/>UC19 Gửi huấn luyện<br/>UC20 Theo dõi job<br/>UC21 Duyệt phiên bản model<br/>UC22 Deploy / rollback<br/>UC23 Cấu hình ngưỡng<br/>UC24 Giám sát model"]
        a["<b>Quản trị</b><br/>UC25 Quản lý người dùng<br/>UC26 Quản lý quầy và camera<br/>UC27 Xem nhật ký<br/>UC28 Chính sách lưu dữ liệu"]
    end
    cashier --> c
    manager --> m
    ml --> l
    admin --> a
    classDef actor fill:#475569,color:#fff,stroke:#334155
    classDef box fill:#e7eaeb,stroke:#20272b,color:#181e22,text-align:left
    class cashier,manager,ml,admin actor
    class c,m,l,a box
    style actors fill:none,stroke:none
```

Mọi vai trò dùng chung UC01 Đăng nhập, UC02 Đăng xuất, UC03 Hồ sơ cá nhân. Thiết bị và hệ thống tham gia: máy quét mã vạch, camera quầy, dịch vụ nhận diện, máy GPU huấn luyện. **UC07 Đối chiếu khay** do hệ thống chạy mỗi lần Kiểm tra chéo hoặc Làn nhanh.

**UC07 — Đối chiếu khay** (lõi của tính năng 1, đã cài đặt và có unit test):

1. Chỉ đếm nhận diện có độ tin ≥ ngưỡng cảnh báo.
2. Với từng SKU **đã học**: so số camera thấy với số đã quét.
3. Một SKU thừa và một SKU thiếu cùng nhóm hàng → **Nghi tráo mã**: mức Cao nếu món camera thấy đắt hơn, ngược lại mức Trung bình.
4. Có bao nhiêu món hàng mới chưa học đã quét thì bỏ qua bấy nhiêu món thừa (model có thể đoán hàng mới thành hàng cũ).
5. Món thừa còn lại → **Món chưa quét**, mức Cao.
6. Món thiếu còn lại → **Quét nhưng không thấy**, mức Thấp (có thể đã cho vào túi).
7. Độ tin giữa ngưỡng thấp và ngưỡng cảnh báo → chỉ vẽ khung nét đứt, không cảnh báo.

| Cảnh báo | Mức | Chặn thanh toán | Cách đóng |
|---|---|---|---|
| Món chưa quét | Cao | Có | Quét bổ sung, hoặc thu ngân xác nhận báo nhầm (BR-04) |
| Nghi tráo mã | Cao / Trung bình | Khi mức Cao | Xóa dòng sai và quét đúng, hoặc thu ngân xác nhận báo nhầm (BR-04) |
| Quét nhưng camera không thấy | Thấp | Không | Tự đóng khi thanh toán |
| Không kiểm tra được khay | Trung bình | Có | Thử lại, hoặc quản lý cho bỏ qua |

### 2.3 User story

28 user story, mỗi story ứng với một use case cùng số.

| ID | Là… | Tôi muốn… | Để… |
|---|---|---|---|
| US01–03 | Người dùng | đăng nhập, đăng xuất, sửa hồ sơ (quản lý: đặt PIN) | vào đúng khu vực theo quyền, giữ tài khoản an toàn |
| US04 | Thu ngân | mở ca tại một quầy | giao dịch ghi đúng quầy, đúng người |
| US05 | Thu ngân | quét mã và thấy giỏ cập nhật ngay | thao tác như POS quen thuộc |
| US06 | Thu ngân | camera tự chụp khay khi khách đặt hàng và đối chiếu khi tôi bấm Thanh toán | biết món nào chưa quét hoặc quét sai mà không phải bấm thêm nút |
| US07 | Thu ngân | xử lý cảnh báo bằng quét bổ sung, hoặc tự xác nhận "camera báo nhầm" kèm lý do | không phải chờ quản lý mỗi khi model sai |
| US08 | Quản lý | xác nhận bằng PIN tại quầy cho hủy giao dịch, bỏ qua kiểm tra khay | thao tác nhạy cảm luôn có người chịu trách nhiệm |
| US09 | Thu ngân | camera đề xuất hóa đơn cho cả khay | phục vụ nhanh giờ cao điểm |
| US10 | Thu ngân | biết món nào cần quét xác nhận | không bỏ sót ở làn nhanh |
| US11 | Thu ngân | chọn phương thức thanh toán, xuất hóa đơn | kết thúc giao dịch |
| US12 | Thu ngân | xem giao dịch trong ca và đóng ca | đối soát cuối ca |
| US13 | Quản lý | xem dashboard | nắm doanh thu, cảnh báo, độ phủ SKU |
| US14 | Quản lý | hậu kiểm cảnh báo đã đóng | phát hiện gian lận lặp lại |
| US15 | Quản lý | quản lý SKU, thấy trạng thái nhận diện | danh mục luôn đúng |
| US16 | Quản lý | tạo đợt nhập và theo dõi tiến độ | biết khi nào camera kiểm tra được hàng mới |
| US17 | Kỹ sư ML | duyệt ảnh mẫu đã cắt nền rồi tạo ảnh ghép | có dữ liệu huấn luyện mà không phải vẽ box |
| US18 | Kỹ sư ML | model đề xuất box hàng cũ trên ảnh thật, tôi chỉ vẽ hàng mới | có tập kiểm tra thật nhanh, nhãn đủ cả hàng cũ |
| US19 | Kỹ sư ML | xem tiến độ dữ liệu từng SKU, gửi huấn luyện khi đủ | không huấn luyện với dữ liệu thiếu |
| US20 | Kỹ sư ML | theo dõi trạng thái và log của job | biết job chạy đến đâu, lỗi gì |
| US21 | Kỹ sư ML | so phiên bản mới với bản đang chạy theo cổng duyệt | chỉ deploy model không kém hơn |
| US22 | Kỹ sư ML | deploy hoặc rollback có xác nhận | cập nhật quầy an toàn |
| US23 | Kỹ sư ML | chỉnh ngưỡng và xem trước tác động | cân bằng bắt sót và báo nhầm |
| US24 | Kỹ sư ML | xem chất lượng model ngoài thực tế | biết khi nào cần cải thiện |
| US25–28 | Quản trị viên | quản lý người dùng, quầy/camera, xem nhật ký, cấu hình lưu ảnh | kiểm soát truy cập, quầy sẵn sàng, truy vết, tuân thủ |

**Tiêu chí chấp nhận của các story chính:**

| Story | Tiêu chí chấp nhận |
|---|---|
| US06 | Kết quả ≤ 3 giây (có GPU) · Đúng các cảnh báo theo UC07 · Không cảnh báo cho hàng mới chưa học đã quét · Box luôn có chữ, không chỉ dựa vào màu |
| US07 | Bấm cảnh báo → ảnh làm nổi vùng liên quan · Quét đúng SKU → cảnh báo tự đóng · "Camera báo nhầm": chọn lý do, không cần PIN, không giới hạn số lần, hộp thoại báo rõ sẽ được lưu để hậu kiểm · Không có nút "Bỏ qua" cho cảnh báo Cao |
| US08 | Hộp thoại nêu rõ việc cần xác nhận (hủy giao dịch, bỏ qua kiểm tra) · PIN đúng + lý do → ghi người và thời gian · Sai 3 lần → khóa nhập PIN ở quầy đó 5 phút · Từ chối PIN của người đang đứng quầy |
| US09, US10 | Món đã học có độ tin ≥ ngưỡng tự nhận vào giỏ với nguồn "Camera" · Món không chắc màu cam, có số thứ tự · Còn món cam thì không thanh toán · Phải tích "đã quét hết món ngoài vùng" |
| US14 | Mục "Cần hậu kiểm trước" xếp theo BR-17, ghi rõ vì sao · Bảng theo thu ngân có tỉ lệ báo nhầm, số dòng xóa trên mỗi giao dịch và cờ "Bất thường" · Đánh dấu: Cảnh báo đúng / Báo nhầm thật / Nghi gian lận |
| US17 | Ảnh cắt có trạng thái Chờ duyệt / Cần xem kỹ / Nhận / Loại · Đếm ảnh đã nhận / mục tiêu · "Tạo ảnh ghép" chỉ bật khi mọi SKU đủ ảnh |
| US18 | Đề xuất nét đứt có độ tin · Chấp nhận hàng loạt ≥ 0,7 · Kéo chuột vẽ box · Đề xuất dưới box vẽ tự bị thay · Không lưu khi còn đề xuất chưa duyệt · Hỏi lại khi số box khác số lượng theo mã vạch |
| US19 | Bảng theo SKU: ảnh mẫu đã nhận, box trong tập kiểm tra · "Gửi huấn luyện" chỉ bật khi đạt BR-11 |
| US21, US22 | Bảng điều kiện cổng duyệt: giá trị mới, bản đang chạy, Đạt / Không đạt · Deploy xác nhận lần hai, không đạt thì bắt buộc ghi lý do · Rollback đưa SKU của đợt về Đang học |

**Đánh giá INVEST:**

| Tiêu chí | Nghĩa | Cách đáp ứng |
|---|---|---|
| **I** — Independent | Độc lập | Mỗi story cho ra một kết quả demo được; chỉ phụ thuộc đăng nhập (US01) và dữ liệu có sẵn |
| **N** — Negotiable | Thương lượng được | Bố cục giao diện đổi được; mục tiêu và quyền giữ nguyên |
| **V** — Valuable | Có giá trị | Mỗi story ghi rõ giá trị ở cột "Để…" |
| **E** — Estimable | Ước lượng được | Đầu vào, đầu ra, vai trò và trường hợp lỗi đã nêu trong use case và tiêu chí chấp nhận |
| **S** — Small | Nhỏ gọn | Mỗi story một chức năng. US18 lớn nhất, khi code tách thành 18a (duyệt đề xuất) và 18b (vẽ box) |
| **T** — Testable | Kiểm thử được | Mọi story có tiêu chí chấp nhận quan sát được |

### 2.4 Quy tắc nghiệp vụ chính

| ID | Quy tắc |
|---|---|
| BR-01 | Mã vạch quyết định hóa đơn; camera chỉ đề xuất hoặc cảnh báo |
| BR-02 | Camera chỉ kiểm tra SKU mà model đang chạy đã học; SKU khác bán bằng mã vạch |
| BR-03 | Còn cảnh báo Cao thì không thanh toán được |
| BR-04 | Thu ngân đóng cảnh báo Cao bằng quét bổ sung, hoặc tự xác nhận "camera báo nhầm" kèm lý do. Không cần PIN, không giới hạn số lần; hệ thống lưu ảnh khay, lý do, người và thời gian để hậu kiểm |
| BR-05 | Thu ngân tự xóa dòng, không cần PIN, chọn lý do. Lý do "khách không lấy nữa" thì món được trừ khỏi ảnh khi đối chiếu; lý do khác thì món vẫn tính là trên khay. Hủy giao dịch, bỏ qua kiểm tra khay cần PIN quản lý |
| BR-06 | Mỗi giao dịch lưu danh sách quét, giá lúc bán, ảnh khay, kết quả nhận diện, phiên bản model, cảnh báo và cách xử lý |
| BR-07, 08 | Một phiên bản model chạy tại một thời điểm; deploy phải qua cổng duyệt hoặc ghi lý do; luôn rollback được |
| BR-09 | Cổng duyệt đo trên **ảnh thật**: phiên bản mới không kém bản đang chạy, không làm giảm việc nhận diện hàng cũ · bắt món sót ≥ 90% · báo nhầm ≤ 10% (G2) |
| BR-10 | Ngưỡng chọn trên tập kiểm tra (val), không chọn trên tập test |
| BR-11 | Gửi huấn luyện khi: mỗi SKU mới ≥ 8 ảnh cắt đã nhận · đã tạo ảnh ghép · tập kiểm tra ≥ 50 ảnh thật, mỗi SKU mới ≥ 20 box |
| BR-12 | Box đề xuất chỉ thành nhãn khi người chấp nhận; ảnh thật phải có box cho mọi món, kể cả hàng cũ |
| BR-13 | Ảnh giao dịch giữ 30 ngày; ảnh mẫu và ảnh dùng huấn luyện xóa 14 ngày sau deploy; tập kiểm tra ảnh thật giữ lại để đo các phiên bản sau |
| BR-14, 15 | Chỉ quản lý đổi giá; mã vạch không trùng. Phân quyền kiểm tra ở backend |
| BR-16 | Ảnh thật vào tập kiểm tra trước; chỉ phần vượt mức mới được trộn vào huấn luyện khi kỹ sư ML bật |
| BR-17 | Hậu kiểm báo nhầm theo thứ tự ưu tiên: giá trị ≥ 30.000 ₫ · thu ngân bất thường (≥ 5 cảnh báo và tỉ lệ báo nhầm ≥ 1,5 lần mức chung của cửa hàng) · mẫu ngẫu nhiên 10% số còn lại. Báo nhầm lặp lại trên cùng cặp SKU ở nhiều thu ngân được coi là lỗi model → đưa vào hàng đợi ảnh khó. Xóa dòng hậu kiểm cùng cách: thu ngân có ≥ 5 dòng xóa và số dòng xóa trên mỗi giao dịch ≥ 1,5 lần mức chung bị gắn cờ |

### 2.5 Vai trò và quyền

| Chức năng | Thu ngân | Quản lý | Kỹ sư ML | Quản trị viên |
|---|:-:|:-:|:-:|:-:|
| Bán hàng tại quầy, xử lý cảnh báo (quét bổ sung, báo nhầm) | ✓ | ✓ | | |
| Xác nhận bằng PIN | | ✓ | | |
| Lịch sử giao dịch | Ca của mình | Toàn cửa hàng | | |
| Dashboard, hậu kiểm, danh mục SKU | | ✓ | Xem | |
| Tạo đợt nhập | | ✓ | | |
| Tải ảnh mẫu | | ✓ | ✓ | |
| Duyệt ảnh cắt, tạo ảnh ghép, gán nhãn ảnh thật, gửi huấn luyện | | | ✓ | |
| Job, phiên bản model | | | ✓ | |
| Giám sát model (với Quản lý: Chất lượng camera) | | Xem | ✓ | |
| Deploy / rollback, ngưỡng | | | ✓ | |
| Người dùng, quầy/camera, lưu dữ liệu | | | | ✓ |
| Nhật ký | | Của cửa hàng | | ✓ |

Phân quyền kiểm tra ở backend; ẩn nút trên giao diện chỉ để tiện dùng.

Chi tiết (sơ đồ use case theo khu vực, đặc tả UC05–UC22, trạng thái, toàn bộ tiêu chí chấp nhận): [Bước 2](docs/02-use-case-user-stories.md).

## 3. Kiến trúc thông tin

28 màn hình và hộp thoại. Mã: **S** chung · **P** quầy · **M** cửa hàng · **L** model · **A** quản trị.

```text
S01 Đăng nhập · S03 Không có quyền (khi mở trang ngoài quyền)
├── QUẦY — toàn màn hình, cảm ứng                         Thu ngân, Quản lý
│   ├── P01 Mở ca
│   ├── P02 Quầy — Kiểm tra chéo   ┐  + P04 Hộp thoại PIN quản lý
│   ├── P03 Quầy — Làn nhanh       ┘  + P05 Hộp thoại Thanh toán
│   └── P06 Lịch sử ca & Đóng ca
└── QUẢN TRỊ — sidebar
    ├── Cửa hàng                                            Quản lý (ML xem)
    │   ├── M01 Dashboard
    │   ├── M02 Cảnh báo & Hậu kiểm → M03 Chi tiết giao dịch
    │   ├── M04 Giao dịch → M03
    │   ├── M05 Danh mục SKU → M06 Chi tiết SKU
    │   └── M07 Đợt nhập → M08 Chi tiết đợt nhập
    │                        ├── L01 Ảnh mẫu & ảnh ghép     Kỹ sư ML (QL tải ảnh)
    │                        └── L02 Gán nhãn ảnh thật      Kỹ sư ML
    ├── Model                                               Kỹ sư ML (QL chỉ xem L07, tên menu: Chất lượng camera)
    │   ├── L03 Job
    │   ├── L04 Phiên bản model → L05 Chi tiết & Cổng duyệt
    │   ├── L06 Ngưỡng nhận diện
    │   └── L07 Giám sát model
    ├── Quản trị: A01 Người dùng · A02 Quầy & Camera · A03 Nhật ký · A04 Cài đặt lưu trữ   Quản trị viên
    └── S02 Hồ sơ cá nhân                                   Mọi vai trò
```

| Vai trò | Trang mặc định | Menu |
|---|---|---|
| Thu ngân | P01 Mở ca (P02 nếu đã có ca) | Không có sidebar; thanh trên có Lịch sử ca, Đăng xuất |
| Quản lý | M01 Dashboard | Cửa hàng (gồm Chất lượng camera, chỉ xem) · nút Mở màn quầy |
| Kỹ sư ML | L04 Phiên bản model | Model · Dữ liệu (Đợt nhập, Danh mục SKU, Dashboard) |
| Quản trị viên | A01 Người dùng | Người dùng · Quầy & Camera · Nhật ký · Cài đặt |

Mỗi màn hình được mô tả theo section và quyền từng vai trò (thao tác / chỉ xem / không thấy) ở [Bước 3](docs/03-information-architecture.md).

## 4. UI/UX

**Nguyên tắc:** bước tiếp theo luôn rõ (thanh 3 bước, nút bị khóa luôn kèm lý do) · ô mã vạch luôn giữ con trỏ cho máy quét · cảnh báo Cao khóa thanh toán · mỗi cảnh báo một hành động chính · ảnh khay ít rối (box khớp chỉ có viền xanh, chỉ box cần chú ý hiện tên) · không chỉ dựa vào màu (box có ký hiệu ✓ ! ? ✎ và chữ) · nút lớn cho màn cảm ứng · giỏ hàng ghi rõ nguồn **Camera** hay **Mã vạch**, đề xuất của model nét đứt, box người vẽ nét liền.

**Kiểm tra chéo:** quét sót 1 thanh sô-cô-la → camera đóng khung đỏ đúng món đó, nút Thanh toán khóa kèm lý do.
![Kiểm tra chéo](docs/images/ui/04-pos-verify-alert.png)

**Nghi tráo mã:** quét gói khăn giấy rẻ cho gói đắt hơn cùng nhóm → mức Cao.
![Nghi tráo mã](docs/images/ui/07-pos-swap.png)

**Camera báo nhầm:** thu ngân chọn lý do và đi tiếp ngay, không chờ quản lý, không giới hạn số lần. Hệ thống lưu lại để hậu kiểm.
![Camera báo nhầm](docs/images/ui/08a-false-alarm.png)

**Xóa dòng:** thu ngân tự xóa, chọn lý do, không chờ quản lý, không phải chụp lại. "Khách không lấy nữa" thì món được trừ khỏi ảnh khi đối chiếu.
![Xóa dòng](docs/images/ui/08b-remove-line.png)

**PIN quản lý:** chỉ cho hủy giao dịch, bỏ qua kiểm tra khay.
![PIN quản lý](docs/images/ui/08-manager-pin.png)

**Làn nhanh:** món chắc chắn tự vào giỏ (nguồn Camera); món không chắc màu cam có số, chờ quét.
![Làn nhanh](docs/images/ui/09-fast-lane.png)

**Hậu kiểm:** báo nhầm đáng ngờ được đưa lên trước (giá trị cao, thu ngân có tỉ lệ báo nhầm bất thường); lỗi model lặp lại thì đưa vào hàng đợi ảnh khó.
![Hậu kiểm](docs/images/ui/20-alerts.png)

**Đợt nhập:** tiến trình 5 bước, tiến độ từng SKU theo hai loại dữ liệu; Gửi huấn luyện chỉ bật khi đủ.
![Đợt nhập](docs/images/ui/11-batch5.png)

**Ảnh mẫu → ảnh ghép:** duyệt ảnh đã cắt nền của từng SKU mới, đủ ảnh thì Tạo ảnh ghép.
![Ảnh mẫu](docs/images/ui/11b-samples.png)

**Gán nhãn ảnh thật:** model đề xuất hàng cũ (xanh dương), người vẽ hàng mới (tím) theo danh sách mã vạch.
![Gán nhãn](docs/images/ui/13-labeling-filled.png)

**Cổng duyệt và Dashboard:**
![Cổng duyệt](docs/images/ui/15-model-v5-gate.png)
![Dashboard](docs/images/ui/19-dashboard.png)

Toàn bộ ảnh màn hình, design token, trạng thái giao diện và khả năng tiếp cận: [Bước 4](docs/04-ui-ux.md).

## 5. Dữ liệu (DBML / ER)

PostgreSQL 16, một cửa hàng cho mỗi bản cài đặt: 24 bảng chia 6 nhóm. Ảnh nằm trong object storage, database chỉ lưu key của ảnh. Nguồn chính là [`database/schema.dbml`](database/schema.dbml); file SQL được sinh tự động từ đó và đã chạy thử trên PostgreSQL.

```mermaid
flowchart TB
  subgraph people ["① Người dùng & quầy"]
    U["users<br/><i>tài khoản</i>"]
    C["counters<br/><i>quầy + camera</i>"]
    SH["shifts<br/><i>ca làm</i>"]
  end
  subgraph catalog ["② Danh mục"]
    CA["categories<br/><i>nhóm hàng</i>"]
    S["skus<br/><i>mặt hàng</i>"]
  end
  subgraph checkout ["③ Thanh toán tại quầy"]
    T["transactions<br/><i>giao dịch</i>"]
    TL["transaction_lines<br/><i>dòng hàng đã quét</i>"]
    MA["manager_approvals<br/><i>phiếu PIN quản lý</i>"]
    TC["tray_captures<br/><i>ảnh khay mỗi lần kiểm tra</i>"]
    D["detections<br/><i>box model nhận diện</i>"]
    A["alerts<br/><i>cảnh báo + hậu kiểm</i>"]
  end
  subgraph data ["④ Dữ liệu đợt nhập"]
    B["import_batches<br/><i>đợt nhập SKU mới</i>"]
    SS["sku_samples<br/><i>ảnh mẫu → ảnh cắt nền</i>"]
    LT["label_tasks<br/><i>ảnh thật cần gán nhãn</i>"]
    AN["annotations<br/><i>box đã duyệt</i>"]
  end
  subgraph model ["⑤ Model"]
    J["jobs<br/><i>tạo ảnh ghép, huấn luyện</i>"]
    MV["model_versions<br/><i>phiên bản + cổng duyệt</i>"]
    MX["model_version_skus · model_confusions<br/>model_deployments · threshold_configs"]
  end

  C -->|có| SH
  U -->|đứng| SH
  SH -->|gồm| T
  T --> TL & MA & TC
  TC -->|có| D
  TC -->|sinh ra| A
  A -.->|chỉ vào box| D
  CA --> S
  B -->|đưa SKU mới| S
  S -->|chụp| SS
  TC ==>|ảnh khay thật| LT
  B --> LT
  LT --> AN
  B --> J
  J -->|sinh ra| MV
  MV --> MX
  MV -.->|deploy xong, chạy ở quầy| TC
```

**Cách đọc:** mỗi ô là một bảng (tên bảng, bên dưới là nghĩa). Mũi tên `A → B` nghĩa là một dòng A có nhiều dòng B, và bảng B giữ khóa ngoại trỏ về A. Ví dụ một ca có nhiều giao dịch. Bảng `users` còn được trỏ tới từ rất nhiều cột "người thực hiện" (`*_by`), `skus` từ các dòng hàng, box và cảnh báo; những đường này không vẽ cho đỡ rối.

Đọc theo luồng nghiệp vụ:
1. **Ở quầy (①→③):** thu ngân mở **ca** ở một quầy. Mỗi khách là một **giao dịch** gồm các **dòng hàng** đã quét. Khi khách đặt hàng xuống, camera chụp một **ảnh khay**; model trả về các **box**. Khi bấm Thanh toán, hệ thống so box với dòng hàng và sinh **cảnh báo** (chỉ vào box gây cảnh báo). Thao tác nhạy cảm có **phiếu PIN**. Quản lý hậu kiểm ngay trên dòng cảnh báo.
2. **Hàng mới (②, ④):** quản lý tạo **đợt nhập** và đưa các SKU mới vào đợt. Mỗi SKU mới có **ảnh mẫu**, được cắt nền để tạo ảnh ghép.
3. **Ảnh thật quay về (③→④, mũi tên đậm):** ảnh khay ở quầy (giao dịch có hàng mới, hoặc ảnh khó) thành **việc gán nhãn**; người duyệt box rồi lưu thành **box đã duyệt** của tập kiểm tra.
4. **Model (⑤):** đợt nhập chạy **job** (tạo ảnh ghép, huấn luyện); job sinh ra **phiên bản model** kèm kết quả cổng duyệt. Deploy xong, phiên bản đó nhận diện các ảnh khay mới ở quầy (mũi tên nét đứt), và vòng lặp tiếp tục.

Nhóm ⑥ Hệ thống (`settings`, `audit_logs`) đứng riêng, không có quan hệ nghiệp vụ nên không vẽ.

| Quyết định | Lý do |
|---|---|
| Giao dịch lưu từ lần quét đầu (`OPEN` → `PAID` / `CANCELLED`) | Ảnh khay, dòng bị xóa, giao dịch bị hủy đều còn dấu vết để hậu kiểm; F5 không mất giỏ |
| Không xóa lịch sử: dòng bị xóa chỉ đánh dấu `removed_at` + người xóa + lý do | Thu ngân xóa không cần PIN nhưng vẫn có người chịu trách nhiệm; hậu kiểm theo thu ngân (BR-05, BR-17) |
| Mỗi ảnh khay ghi `model_version_id`; mỗi box của model là một dòng `detections` | Biết model nào ra quyết định nào (BR-06); đo được báo nhầm, cặp hay nhầm |
| Hậu kiểm nằm ngay trên cảnh báo, chỉ cho cảnh báo thu ngân báo nhầm | Thứ tự xem trước (BR-17) là view, tham số nằm trong bảng `settings` |
| `model_version_skus`: bảng lớp của từng phiên bản | "Đã học" = bản đang chạy biết SKU; rollback không phải sửa SKU |
| `label_tasks.split` VAL / TRAIN + trigger | Ảnh của một giao dịch không nằm ở cả hai tập (BR-16) |
| `jobs` chung cho tạo ảnh ghép, huấn luyện, đánh giá | Một hàng đợi, một vòng đời |
| Không lưu thứ tính lại được | Trạng thái học, hàng đợi hậu kiểm, tiền thối, tiền cuối ca là view hoặc phép tính |

Ràng buộc trong database: chỉ một model đang chạy (BR-07) · báo nhầm phải có lý do và người (BR-04) · cảnh báo Cao không tự đóng · PIN chỉ của quản lý và không tự duyệt cho mình · box không vượt khỏi ảnh · ngưỡng đúng thứ tự · nhật ký không sửa / xóa được (US27). `database/test.sql` thử 24 dữ liệu sai, mỗi cái phải bị chặn đúng ràng buộc. Những quy tắc cần dữ liệu nhiều bảng hoặc cần biết người đang đăng nhập (chặn thanh toán, phân quyền) do backend kiểm.

```bash
scripts/build_schema.sh   # schema.dbml + extras.sql → database/schema.sql
scripts/check_schema.sh   # PostgreSQL 16 trong Docker: nạp schema rồi chạy test
scripts/build_diagram.py  # schema.dbml → sơ đồ ER đầy đủ trong docs/05-data-model.md
```

Sơ đồ ER chi tiết từng nhóm, enum, bảng quy tắc ↔ ràng buộc và đối chiếu prototype → bảng: [Bước 5](docs/05-data-model.md).

## 6. API (OpenAPI)

Contract viết trước code (design-first): [`api/openapi.yaml`](api/openapi.yaml), OpenAPI 3.1, 77 thao tác chia 15 nhóm. Backend phải khớp contract, frontend sinh kiểu TypeScript từ đó. Dịch vụ nhận diện có contract nội bộ riêng: [`api/inference.openapi.yaml`](api/inference.openapi.yaml).

| Quy ước | |
|---|---|
| Đường dẫn | `/api/v1`, danh từ số nhiều; thao tác nghiệp vụ là `POST` sub-resource: `/transactions/{id}/pay`, `/alerts/{id}/false-alarm` |
| Tên | path, field, enum tiếng Anh, khớp DB; mô tả tiếng Việt |
| Xác thực | JWT 15 phút + refresh token 12 giờ trong cookie httpOnly. PIN quản lý gửi kèm thao tác cần duyệt, không phải đăng nhập |
| Lỗi | `application/problem+json` (RFC 9457) với `code` ổn định, ví dụ `PAYMENT_BLOCKED` |
| An toàn | Tạo giao dịch và thanh toán bắt buộc `Idempotency-Key`: bấm lại không tính tiền hai lần. Phân quyền kiểm ở backend cho mọi thao tác |
| Việc chạy lâu | Ghép ảnh, huấn luyện trả `202` + job để theo dõi |

Mọi thao tác tại quầy trả về cùng một đối tượng `Checkout` (dòng hàng, box, cảnh báo, `pay_blockers`), nên màn quầy chỉ việc vẽ lại, không tự tính quy tắc. Camera lỗi không làm request lỗi: lần chụp được lưu `FAILED` để đếm, quầy vẫn bán bằng mã vạch.

```bash
scripts/check_api.sh   # lint 2 contract (Redocly) + sinh bảng endpoint trong docs/06-api.md
```

Bảng endpoint theo vai trò, luồng gọi tại quầy, mã lỗi, màn hình → API: [Bước 6](docs/06-api.md).

## 7. Kiến trúc (C4)

```mermaid
flowchart TB
    users["👤 Thu ngân · Quản lý · Kỹ sư ML · Quản trị viên"]
    camera["Camera IP tại quầy"]

    subgraph hc["HybridCheckout"]
        direction TB
        web["<b>Web app</b><br/><small>[React 19, TypeScript, Vite; nginx]</small><br/><small>Màn quầy cảm ứng + khu quản trị</small>"]
        api["<b>Backend API</b><br/><small>[Python 3.12, FastAPI, SQLAlchemy 2]</small><br/><small>Phân quyền, quy tắc nghiệp vụ, đối chiếu khay</small>"]
        worker["<b>Worker</b><br/><small>[Celery, hàng đợi cpu]</small><br/><small>Cắt nền, ghép ảnh, xóa ảnh hết hạn, heartbeat camera</small>"]
        trainer["<b>Trainer</b><br/><small>[Celery, hàng đợi gpu, PyTorch]</small><br/><small>Huấn luyện, đánh giá cổng duyệt</small>"]
        inference["<b>Dịch vụ nhận diện</b><br/><small>[FastAPI, PyTorch, GPU]</small><br/><small>Nhận diện khay, cắt nền; nạp 1 checkpoint</small>"]
        db[("<b>PostgreSQL 16</b><br/><small>Giao dịch, cảnh báo, SKU, đợt,<br/>model, nhật ký</small>")]
        redis[("<b>Redis 7</b><br/><small>Hàng đợi job, refresh token,<br/>idempotency, giới hạn đăng nhập</small>")]
        s3[("<b>Kho ảnh S3</b><br/><small>[MinIO]</small><br/><small>Ảnh khay, ảnh mẫu, tập dữ liệu, checkpoint</small>")]
    end

    users -- "HTTPS" --> web
    web -- "REST JSON /api/v1 [HTTPS]" --> api
    web -. "tải ảnh bằng URL ký sẵn [HTTPS]" .-> s3
    api -- "chụp ảnh khay [HTTP]" --> camera
    api -- "/detect, /model [HTTP nội bộ]" --> inference
    api -- "SQL" --> db
    api -- "xếp job, token [RESP]" --> redis
    api -- "lưu ảnh khay [S3 API]" --> s3
    redis -- "job cpu" --> worker
    redis -- "job gpu" --> trainer
    worker -- "/cutouts [HTTP nội bộ]" --> inference
    worker -- "SQL" --> db
    worker -- "S3 API" --> s3
    trainer -- "SQL" --> db
    trainer -- "tập dữ liệu, checkpoint [S3 API]" --> s3
    inference -- "đọc checkpoint [S3 API]" --> s3

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef focus fill:#1168bd,color:#fff,stroke:#0b4884
    classDef store fill:#3a7bd5,color:#fff,stroke:#2a5ea8
    classDef ext fill:#8a8a8a,color:#fff,stroke:#6b6b6b
    class users person
    class web,api,worker,trainer,inference focus
    class db,redis,s3 store
    class camera ext
```

| Container | Vai trò |
|---|---|
| Backend API | Ranh giới tin cậy duy nhất: phân quyền, mọi quy tắc nghiệp vụ, đối chiếu khay |
| Worker / Trainer | Cùng code với backend, nhận job từ hai hàng đợi: `cpu` (cắt nền, ghép ảnh, xóa ảnh hết hạn) và `gpu` (huấn luyện, đánh giá) |
| Dịch vụ nhận diện | Bọc model nhận diện, giữ model trong GPU; không vào DB, không biết nghiệp vụ. Deploy = nạp checkpoint thành công rồi mới ghi DB |

Quyết định chính: modular monolith (một backend, chia module theo nghiệp vụ) · backend tự chụp camera, trình duyệt không gửi ảnh · đối chiếu khay chạy trong backend dưới dạng code thuần · một máy chủ GPU tại cửa hàng chạy Docker Compose, trainer tách sang máy khác được.

C1 ngữ cảnh, C3 thành phần backend và worker, sơ đồ luồng chụp và đối chiếu khay, đợt nhập → deploy, triển khai, ADR: [Bước 7](docs/07-c4.md).

## 8. Cấu trúc code

```text
api/         contract OpenAPI          backend/   FastAPI + Celery worker (một package)
database/    DBML, SQL, test           inference/ dịch vụ nhận diện
frontend/    React + TypeScript        infra/     nginx
scripts/     sinh và kiểm tra          docker-compose.yml, .env.example, .github/workflows/ci.yml
```

Backend chia module theo nhóm tag của contract (`checkout`, `alerts`, `batches`, `model_registry`, …). Mỗi module có `router → service → repository`. Router không chứa SQL hay quy tắc; module khác chỉ gọi nhau qua service; thư viện ngoài (S3, camera, Celery) nằm sau `integrations/` để test thay bằng bản giả. Mỗi bảng có đúng một module sở hữu.

Khung đã tạo thật, chưa có logic: `uv run pytest` và `ruff` pass, `docker compose config` hợp lệ. Cây thư mục chi tiết, quy tắc phụ thuộc, module ↔ bảng ↔ use case, cấu trúc frontend khi nối API: [Bước 8](docs/08-code-structure.md).

## 9. Chạy prototype

Prototype React + TypeScript + Vite, dữ liệu giả lập trong bộ nhớ, thuật toán đối chiếu là code thật có unit test.

```bash
python3 scripts/prepare_samples.py --data-dir <thư mục ảnh khay ghép từ RPC>   # chép ảnh khay mẫu
cd frontend && npm install
npm run dev      # http://localhost:5173
npm test         # unit test: đối chiếu khay, hậu kiểm, box
npm run lint
```

**Kịch bản demo** (khoảng 7 phút; chọn tài khoản demo trên trang đăng nhập; PIN quản lý `246810`):

1. **Thu ngân** → **Mở ca** ở Quầy 1.
2. **Kiểm tra chéo:** trong khung "Mô phỏng thiết bị" (thay cho khay thật và máy quét), bấm **Khách đặt khay lên quầy** (camera tự chụp; ở quầy thật việc này tự động) → bấm **Quét** cho mọi món trừ một món → **Thanh toán** → hệ thống đối chiếu, báo đỏ "Món chưa quét", nút Thanh toán bị khóa → bấm **Quét** món còn thiếu → cảnh báo tự đóng → **Thanh toán**.
3. **Báo nhầm, xóa dòng và PIN:** ở giao dịch mới, bấm **Tráo** ở một món (quét mã một món rẻ hơn cùng nhóm), quét các món còn lại → **Thanh toán** → cảnh báo "Nghi tráo mã". Giả sử camera sai: **Camera báo nhầm** → chọn lý do → thanh toán được. Ở giao dịch khác, bấm thùng rác ở một dòng giỏ hàng: lý do "Khách không lấy nữa" thì đối chiếu trừ món đó khỏi ảnh, không cảnh báo; lý do "Quét nhầm mã" mà không quét lại thì camera báo "Món chưa quét". Bấm **Hủy giao dịch** để xem hộp thoại PIN quản lý.
4. **Làn nhanh:** chọn tab **Làn nhanh** → chọn khay có ghi "có hàng mới" → **Nhận diện khay**. Món khung xanh tự vào giỏ. Món **khung cam có số thứ tự** là món camera chưa chắc chắn (thường là hàng mới model chưa học): quét từng món này → tích "đã quét hết món ngoài vùng" → **Thanh toán**.
5. **Kỹ sư ML** → Đợt nhập → **Đợt 5** (lô hàng mới mà camera chưa nhận diện được). Cần chuẩn bị hai loại dữ liệu:
   - **Ảnh ghép, để huấn luyện:** **Mở ảnh mẫu** → với các SKU còn thiếu ảnh, nhận những ảnh sản phẩm đã cắt nền sạch → **Tạo ảnh ghép**. Box có sẵn khi ghép nên không phải vẽ.
   - **Ảnh thật, để kiểm tra model:** quay về đợt → **Gán nhãn ảnh thật** → với mỗi ảnh, duyệt khung hàng cũ do model đề xuất và vẽ khung cho hàng mới (bản demo có nút **Điền box mẫu**) → **Lưu & ảnh tiếp** đến hết hàng đợi.

   Đủ cả hai loại dữ liệu thì nút **Gửi huấn luyện** sáng lên.
6. **Gửi huấn luyện** → đợi job chạy xong → **Phiên bản model** → **v5** → xem cổng duyệt → **Deploy**.
7. **Thu ngân** → **Làn nhanh** → chọn lại khay ở bước 4: hàng mới giờ được camera tự nhận, không phải quét nữa.
8. **Quản lý** → **Cảnh báo & Hậu kiểm**: mục "Cần hậu kiểm trước" liệt kê báo nhầm đáng ngờ kèm lý do; bảng theo thu ngân gắn cờ "Bất thường" cho một người, cả về báo nhầm lẫn xóa dòng.

**Giới hạn:** tải lại trang (F5) là mất trạng thái demo · nhận diện và huấn luyện là mô phỏng · ảnh khay là ảnh ghép từ bộ mẫu của model, dùng thay ảnh camera.

## Tài liệu

| Bước | Tài liệu |
|---|---|
| 1 | [Phân tích đề bài](docs/01-phan-tich-de-bai.md) |
| 2 | [Mind map, Use case, User story INVEST](docs/02-use-case-user-stories.md) |
| 3 | [Kiến trúc thông tin](docs/03-information-architecture.md) |
| 4 | [UI/UX](docs/04-ui-ux.md) |
| 5 | [Mô hình dữ liệu (DBML / ER)](docs/05-data-model.md) · [`database/`](database/) |
| 6 | [OpenAPI](docs/06-api.md) · [`api/`](api/) |
| 7 | [Kiến trúc C4](docs/07-c4.md) |
| 8 | [Cấu trúc code](docs/08-code-structure.md) · [`backend/`](backend/) · [`inference/`](inference/) |

## Tiến độ

- [x] Phân tích đề bài
- [x] Mind map, use case, user story INVEST
- [x] Kiến trúc thông tin
- [x] UI/UX và prototype
- [x] DBML / ER
- [x] OpenAPI
- [x] C4
- [x] Cấu trúc code
- [ ] Code

Ảnh khay lấy từ bộ RPC (Wei et al., 2019), CC BY-NC-SA 4.0, không đưa ảnh gốc lên repo. Tên SKU, giá và mã vạch là dữ liệu tự tạo.

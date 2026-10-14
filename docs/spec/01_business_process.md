# Business Process Specification: VXmp3 (`_spec1_business_process`)

> **Module:** Đặc tả Quy trình Nghiệp vụ (Business Workflows & Decision Matrices)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Mục tiêu Nghiệp vụ (Business Objectives)

Quy trình nghiệp vụ của **VXmp3** được thiết kế nhằm chuẩn hóa việc dọn dẹp thư viện âm thanh, giúp người dùng hoàn tất các tác vụ lặp đi lặp lại chỉ trong vài cú click chuột với sự an tâm tuyệt đối về an toàn dữ liệu:

1. **Nạp & Phân loại Siêu tốc:** Quét toàn bộ thư mục âm thanh, trích xuất siêu dữ liệu thẻ và đo đạc âm lượng song song mà không khóa giao diện người dùng.
2. **Chuẩn hóa Thông tin Nhất quán:** Điền thông tin chung cho toàn bộ album/playlist, tự động đánh số thứ tự track, nhúng ảnh bìa gọn nhẹ.
3. **Cân bằng Âm lượng Đồng nhất:** Triệt tiêu hoàn toàn sự chênh lệch âm lượng giữa các bài hát, ngăn chặn nguy cơ vỡ tiếng (clipping) trên thiết bị phát.
4. **Quy đổi Tên tệp Thông minh:** Bóc tách thông tin từ tên tệp hoặc đổi tên tệp theo quy tắc chuẩn mực của hệ thống.
5. **Khả năng Phục hồi Tức thì:** Mọi thay đổi đều được kiểm soát và có thể hoàn tác về trạng thái ban đầu khi cần thiết.

---

## 2. Sơ đồ Luồng Nghiệp vụ Swimlane (Cross-Functional Workflow)

```text
┌──────────────┬──────────────────┬───────────────────────┬────────────────────────┐
│  Người dùng  │ UI Shell (React) │ Audio Core (Rust)     │ Hệ thống Tệp tin (OS)  │
└──────┬───────┴─────────┬────────┴──────────┬────────────┴───────────┬────────────┘
       │                 │                   │                        │
       │ 1. Kéo thả      │                   │                        │
       │    folder nhạc  │                   │                        │
       ├────────────────>│ 2. Gửi lệnh nạp   │                        │
       │                 ├──────────────────>│ 3. Quét tệp & đọc tags │
       │                 │                   │    (qua crate `lofty`) │
       │                 │                   ├───────────────────────>│ Đọc metadata
       │                 │                   │<───────────────────────┤ Trả byte headers
       │                 │<──────────────────┤ 4. Trả danh sách bài   │
       │                 │ 5. Render Virtual │                        │
       │                 │    Table tức thì  │                        │
       │                 │                   │                        │
       │ 6. Bấm Phân tích│ 7. Gửi yêu cầu đo │ 8. Worker Pool         │
       │    âm lượng     ├──────────────────>│    chạy `ebur128`      │
       │                 │                   ├───────────────────────>│ Đọc audio stream
       │                 │<──────────────────┤ 9. Stream tiến độ %    │
       │                 │ 10. Cập nhật dB   │    & kết quả dB        │
       │                 │     & Warning     │                        │
       │                 │                   │                        │
       │ 11. Sửa thẻ     │ 12. Cập nhật state│                        │
       │     & Auto-track│     tạm (Pending) │                        │
       ├────────────────>│                   │                        │
       │                 │                   │                        │
       │ 13. Bấm "Áp     │ 14. Hiển thị bảng │                        │
       │     dụng / Lưu" │     xem trước Diff│                        │
       ├────────────────>│                   │                        │
       │                 │                   │                        │
       │ 15. Xác nhận    │ 16. Gửi lệnh ghi  │ 17. Two-Phase Write:   │
       │     thực thi    │     Two-Phase     │  - Tạo tệp tạm .tmp    │
       ├────────────────>├──────────────────>│  - Ghi tag / mod gain ├───────────┐
       │                 │                   │  - fsync xuống đĩa     │           │
       │                 │                   │  - Kiểm tra hợp lệ     │           │
       │                 │                   │  - Atomic rename ──────┴──────────>│ Ghi đè tệp gốc
       │                 │                   │  - Ghi Operation Log   │           │
       │                 │<──────────────────┤ 18. Báo hoàn tất       │           │
       │                 │ 19. Hiện Toast    │                        │           │
       │                 │     thành công    │                        │           │
       ▼                 ▼                   ▼                        ▼           ▼
```

---

## 3. Các Luồng Nghiệp vụ Cốt lõi (Core Business Processes)

### 3.1. Luồng 1 — Chỉnh sửa Thẻ hàng loạt & Đánh số track (Batch Tagging)
1. **Bước 1 — Chọn danh sách:** Người dùng chọn một bài hát (đơn lẻ) hoặc nhiều bài hát (giữ Shift/Ctrl để chọn dải hoặc nhấn `Cmd/Ctrl + A` để chọn tất cả).
2. **Bước 2 — Nhập thông tin qua Inspector:**
   - Nếu chọn 1 bài: Inspector hiển thị toàn bộ các trường của bài đó (Title, Artist, Album, Track, Year, Genre, Lyrics, Comment).
   - Nếu chọn nhiều bài: Các trường có giá trị khác nhau sẽ hiển thị placeholder `<Nhiều giá trị>`. Người dùng nhập giá trị mới vào ô bất kỳ (ví dụ nhập `Artist: Đen`), giá trị này sẽ được áp dụng cho tất cả bài hát được chọn.
3. **Bước 3 — Đánh số tự động (Auto-track Numbering):**
   - Người dùng bấm nút **Đánh số tự động**.
   - Hộp thoại nhỏ cho phép chọn: Số bắt đầu (mặc định `1`), Định dạng số (`01`, `02`... hoặc `1`, `2`...), và Có điền trường Tổng số track (Total Tracks) hay không.
   - Hệ thống tự động gán số thứ tự tăng dần theo đúng thứ tự các hàng đang sắp xếp trên bảng.
4. **Bước 4 — Ghi nhận trạng thái Pending:** Các bài hát có thay đổi được đánh dấu ký hiệu màu Cyan trên bảng, sẵn sàng cho bước Lưu an toàn.

### 3.2. Luồng 2 — Cân bằng Âm lượng Chuẩn hóa (Loudness Normalization)
1. **Bước 1 — Chọn chế độ chuẩn hóa:**
   - **Chế độ A: Lossless MP3 Direct Frame Gain (Khuyến nghị cho MP3):** Can thiệp trực tiếp vào trường `global_gain` trong MPEG frame, không nén lại âm thanh, tương thích 100% với loa ô tô và máy nghe nhạc cũ.
   - **Chế độ B: ReplayGain Metadata Tagging (Áp dụng cho mọi định dạng):** Ghi các thẻ chuẩn `REPLAYGAIN_TRACK_GAIN` và `REPLAYGAIN_TRACK_PEAK` vào metadata.
2. **Bước 2 — Chọn mức âm lượng mục tiêu (Target Volume):**
   - Mặc định chuẩn: `89.0 dB SPL` (chuẩn ReplayGain / EBU R128 tiêu chuẩn, an toàn tuyệt đối chống vỡ tiếng).
   - Tùy chọn nâng cao: `96.0 dB SPL` (cho người thích nghe nhạc lớn trên loa di động ngoài trời).
3. **Bước 3 — Phân tích và Tính toán Chênh lệch (Gain Calculation):**
   - Hệ thống quét và tính toán độ chênh lệch: `Gain chênh lệch = Mức mục tiêu - Mức hiện tại`.
   - Với MP3 Frame Gain: Giá trị điều chỉnh được làm tròn về bội số gần nhất của `1.5 dB` (ví dụ: cần tăng `+2.8 dB` → làm tròn về `+3.0 dB`, tức tăng 2 nấc `global_gain`).
4. **Bước 4 — Cảnh báo Vỡ tiếng (Clipping Risk Detection):**
   - Nếu mức âm lượng sau khi tăng khiến biên độ đỉnh vượt quá `0.0 dBFS` (True Peak > 1.0), hệ thống đánh dấu biểu tượng cảnh báo màu Amber kèm giá trị `Clipping: Có`.
5. **Bước 5 — Xem trước & Áp dụng:** Người dùng kiểm tra bảng đối chiếu và bấm nút thực thi.

### 3.3. Luồng 3 — Quy đổi Hai chiều Tên tệp ↔ Thẻ nhạc (Filename ↔ Tag Rules)
1. **Quy tắc Tag → Filename (Đổi tên tệp từ thẻ):**
   - Người dùng chọn mẫu định dạng (Pattern template), ví dụ: `%track% - %artist% - %title%`.
   - Hệ thống thay thế các biến bằng giá trị thẻ tương ứng của từng tệp: `01 - Vũ - Anh Nho Ra.mp3`.
   - Bộ lọc an toàn tự động khử ký tự cấm của hệ điều hành (`\ / : * ? " < > |`).
   - Hiển thị bảng xem trước (Preview Diff): Cột Tên hiện tại vs Cột Tên mới.
2. **Quy tắc Filename → Tag (Bóc tách thẻ từ tên tệp):**
   - Người dùng có tệp tên `Son Tung - Chung Ta Cua Tuong Lai.mp3`.
   - Người dùng áp dụng mẫu `%artist% - %title%`.
   - Hệ thống tự động phân tích cú pháp (parse regex) và điền `Artist = "Son Tung"`, `Title = "Chung Ta Cua Tuong Lai"`.

---

## 4. Ma trận Quyết định Nghiệp vụ (Decision Matrices)

### 4.1. Ma trận Lựa chọn Phương pháp Cân bằng Âm lượng

| Định dạng tệp | Thiết bị phát mục tiêu | Phương pháp tối ưu | Lý do kỹ thuật |
|---|---|---|---|
| **MP3** | Loa ô tô, USB, máy nghe nhạc MP3 cũ | **Lossless MP3 Direct Frame Gain** | Phần cứng cũ không đọc thẻ ReplayGain; thay đổi `global_gain` trực tiếp trên frame giúp phát đều âm lượng ở mọi nơi mà không suy hao chất lượng. |
| **MP3** | Máy tính (Foobar2000, Apple Music, Roon) | **ReplayGain Tagging** | Giữ nguyên 100% từng byte dữ liệu âm thanh, trình phát tự điều hòa âm lượng khi phát. |
| **FLAC / M4A / OGG / Opus / WAV** | Mọi thiết bị | **ReplayGain Tagging** | Định dạng không có cấu trúc MPEG `global_gain`; ghi thẻ ReplayGain là phương thức chuẩn mực duy nhất để cân bằng mà không phải re-encode làm mất chất lượng. |

### 4.2. Ma trận Xử lý Nguy cơ Vỡ tiếng (Clipping Prevention Policy)

| Mức True Peak dự kiến sau tăng Gain | Trạng thái hiển thị | Hành vi hệ thống | Quyền quyết định |
|---|---|---|---|
| **≤ 0.0 dBTP** (Không vỡ tiếng) | Xanh (Emerald) | Cho phép áp dụng bình thường | Tự động chấp nhận |
| **> 0.0 dBTP đến +1.5 dBTP** (Nguy cơ méo nhẹ) | Vàng (Amber) | Hiển thị cảnh báo "Nguy cơ vỡ tiếng nhẹ". Đề xuất giảm mức mục tiêu xuống 1 nấc (giảm 1.50515 dB). | Người dùng có thể bỏ qua cảnh báo hoặc chọn tự động hạ delta chung toàn bài về mức an toàn. |
| **> +1.5 dBTP** (Vỡ tiếng nghiêm trọng) | Đỏ (Rose) | Cảnh báo rõ ràng "Vỡ tiếng nghiêm trọng (Severe Clipping)". Khóa nút áp dụng nhanh, yêu cầu xác nhận checkbox "Tôi vẫn muốn ép tăng âm lượng". | Bắt buộc người dùng chủ động xác nhận rủi ro. |

### 4.3. Ma trận Xử lý Xung đột Tên tệp khi Đổi tên (Filename Conflict Policy)

| Tình huống phát sinh | Rủi ro | Giải pháp hệ thống |
|---|---|---|
| Tên mới trùng với một tệp khác đã có sẵn trong cùng thư mục | Ghi đè làm mất tệp cũ | Hệ thống tự động phát hiện trước khi đổi tên; tự động thêm hậu tố số ` (1)`, ` (2)` vào sau tên mới và cảnh báo người dùng. |
| Tên mới chứa ký tự cấm trên Windows (`: * ? " < > \|`) | Lỗi I/O hệ thống | Bộ lọc Sanitizer tự động thay thế `:` thành `-`, xóa bỏ `? * " < > \|` và gọt khoảng trắng thừa ở đầu/cuối. |
| Tên tệp quá dài (vượt quá 255 ký tự trên Windows/macOS) | Không thể ghi tệp | Cắt ngắn trường Title một cách an toàn để tổng chiều dài đường dẫn không vượt ngưỡng giới hạn. |

---

## 5. Mô hình SIPOC (Suppliers - Inputs - Process - Outputs - Customers)

```text
┌──────────────┬────────────────────────┬─────────────────────────┬───────────────────────┬──────────────┐
│ Suppliers    │ Inputs                 │ Process                 │ Outputs               │ Customers    │
├──────────────┼────────────────────────┼─────────────────────────┼───────────────────────┼──────────────┤
│ • Người dùng │ • Thư mục tệp âm thanh │ 1. Quét & parse thẻ     │ • Tệp nhạc có thẻ     │ • Người dùng │
│ • Ổ đĩa máy  │   (MP3, FLAC, M4A...)  │ 2. Đo đạc độ lớn EBU    │   chuẩn xác, có bìa   │   nghe nhạc  │
│   tính cục bộ│ • Tệp ảnh bìa (JPG/PNG)│ 3. Sửa thẻ & đánh số    │ • Âm lượng cân bằng   │ • Dàn âm     │
│              │ • Mẫu quy tắc đổi tên  │ 4. Tính toán chênh lệch │   đồng đều, không rè  │   thanh Hi-Fi│
│              │ • Mức dB mục tiêu      │ 5. Ghi Two-Phase an toàn│ • Tên tệp ngăn nắp    │ • Loa ô tô,  │
│              │                        │ 6. Ghi log Operation    │ • File log hoàn tác   │   máy MP3 USB│
└──────────────┴────────────────────────┴─────────────────────────┴───────────────────────┴──────────────┘
```

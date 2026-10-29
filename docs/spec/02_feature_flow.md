# Feature Flow Specification: VXmp3 (`_spec2_feature_flow`)

> **Module:** Luồng Tính năng Chi tiết, Máy Trạng thái & Thuật toán Cốt lõi (Logic & Algorithms)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Máy Trạng thái Lựa chọn & Quản lý Thay đổi (Selection & State Machine)

Giao diện VXmp3 hoạt động dưới dạng bảng tính tương tác, đòi hỏi sự tách bạch rõ ràng giữa phần tử tiêu điểm và tập hợp các dòng được chọn:

- **Focus Item (`focused_id: string | null`):** Đại diện cho bài hát đang nhận con trỏ tiêu điểm hiện tại. Được dùng để:
  - Bật/tắt nghe thử nhanh qua phím `Space`.
  - Hiển thị đầy đủ chi tiết từng trường trong Inspector Panel (nếu chỉ chọn 1 bài).
  - Điều hướng lên/xuống bằng các phím mũi tên `↑ / ↓`.
- **Selected Set (`selected_ids: Set<string>`):** Tập hợp mã định danh của tất cả các bài hát đang được chọn để thực hiện thao tác hàng loạt (Batch Editing, Auto-numbering, Apply Gain, Rename).
- **Pending Changes Map (`pending_changes: Map<string, TrackTagDiff>`):** Lưu trữ toàn bộ các thay đổi siêu dữ liệu trong bộ nhớ (in-memory) chưa lưu xuống đĩa.

### Sơ đồ Chuyển đổi Trạng thái Lựa chọn (State Diagram)

```text
       ┌────────────────────────────────────────────────────────┐
       │                  Trạng thái Ban đầu                     │
       │       focused_id = null, selected_ids = Empty          │
       └───────────────────────────┬────────────────────────────┘
                                   │
               Click vào 1 hàng    │    Giữ Shift + Click vào hàng B
            (hoặc bấm phím mũi tên)│    (chọn dải từ A đến B)
                                   ▼
       ┌───────────────────────────┴────────────────────────────┐
       │              Một hoặc Nhiều Hàng được Chọn             │
       │           focused_id = B, selected_ids = {A .. B}      │
       └─────────────┬─────────────────────────────┬────────────┘
                     │                             │
        Nhấn Space   │                             │ Sửa trường dữ liệu
        (Nghe thử)   │                             │ trên Inspector / Bảng
                     ▼                             ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│      Mini Player Kích hoạt       │ │     Ghi nhận Pending Change      │
│  - Phát tệp âm thanh qua Web     │ │  - pending_changes.set(id, diff) │
│    Audio / Native Player         │ │  - Hàng đổi màu viền Cyan        │
│  - Hiển thị thanh tiến trình phát│ │  - Nút "Lưu (Cmd+S)" sáng lên    │
└──────────────────────────────────┘ └──────────────────────────────────┘
```

### 1.2. Chu kỳ Tương tác Chỉnh sửa Trực tiếp (Inline Edit Lifecycle — Finder Style)

Để mang lại cảm giác mượt mà và tự nhiên nhất cho người dùng desktop, luồng gõ phím trực tiếp trên bảng được chuẩn hóa:

```text
[Click 1: Chọn dòng] ──(sau ~300ms hoặc bấm F2 / Enter)──► [Kích hoạt Inline Input]
                                                                     │
                 ┌───────────────────────────────────────────────────┼───────────────────────────────────────────────────┐
                 │                                                   │                                                   │
          [Nhấn Tab]                                          [Nhấn Enter]                                        [Nhấn Escape]
                 │                                                   │                                                   │
                 ▼                                                   ▼                                                   ▼
[Lưu giá trị vào In-memory Diff]                    [Lưu giá trị vào In-memory Diff]                    [Hủy gõ, phục hồi giá trị cũ]
[Chuyển sang ô CỘT BÊN PHẢI]                        [Chuyển sang ô HÀNG BÊN DƯỚI]                       [Thoát chế độ Inline Input]
(Shift+Tab: Chuyển sang CỘT BÊN TRÁI)               (Shift+Enter: Chuyển sang HÀNG BÊN TRÊN)
```

- **Quy tắc Lưu Đĩa An toàn (Disk Commit Policy):**
  - **Mặc định (Staged Pending):** Khi người dùng Tab hoặc Enter, giá trị mới chỉ cập nhật vào React State (`pending_changes`) và hiển thị viền Cyan. Tuyệt đối **không mở file và ghi đĩa ngay** nhằm tránh thắt nút cổ chai I/O, cho phép gõ phím sửa liên tục 50 bài với tốc độ 60 FPS không độ trễ.
  - **Commit xuống đĩa:** Người dùng nhấn `Cmd/Ctrl + S` hoặc bấm nút `[💾 Lưu]` trên Controlbar để hệ thống thực hiện một đợt Two-Phase Write hàng loạt an toàn.
  - **Chế độ Auto-Save (Tùy chọn):** Có checkbox cấu hình trong Settings dành cho người dùng thích tự động ghi đĩa khi rời ô.

---

## 2. Thuật toán Biến đổi Khung MP3 Không Suy hao (Lossless MP3 Direct Frame Gain)

Thuật toán can thiệp trực tiếp vào trường `global_gain` trong từng MPEG audio frame mà không giải mã dữ liệu nén Huffman, bảo toàn 100% chất lượng âm thanh:

### 2.1. Cấu trúc MPEG Audio Layer III Frame
Mỗi frame MP3 bao gồm:
1. **Header (4 bytes):** 11 bit sync (`0xFFE`), MPEG Version (MPEG-1 hoặc MPEG-2), Layer (Layer III), Bitrate, Sampling Rate, Padding, Channel Mode (Stereo, Joint Stereo, Dual Channel, Mono).
2. **CRC (2 bytes — tùy chọn):** Nếu cờ Protection Bit = 0.
3. **Side Information (17 hoặc 32 bytes):**
   - Với MPEG-1 Stereo / Joint Stereo: Chiều dài 32 bytes, chứa thông tin cho 2 Granules, mỗi Granule có 2 Channels.
   - Với MPEG-1 Mono: Chiều dài 17 bytes, chứa 2 Granules cho 1 Channel.
   - Với MPEG-2 / MPEG-2.5: Chiều dài 9 bytes (Mono) hoặc 17 bytes (Stereo), chỉ có 1 Granule.
   - **Vị trí `global_gain`:** Nằm trong Side Information của từng Granule và Channel, có kích thước **8-bit không dấu (unsigned integer: 0 đến 255)**.
4. **Main Data:** Dữ liệu âm thanh nén (Scale factors & Huffman codewords).

### 2.2. Các bước Thực thi Thuật toán

```text
[Bắt đầu tệp MP3]
       │
       ▼
1. Quét tìm Frame Sync (0xFFE)
       │
       ├─► Nếu là ID3v2 Tag: Bỏ qua vùng tag, nhảy đến frame đầu tiên
       │
2. Đọc Header & Kiểm tra tính hợp lệ
       │
       ├─► Nếu là Xing / Info / LAME Header:
       │     Giữ nguyên cấu trúc, kiểm tra/bảo toàn LAME Tag CRC và LAME Music CRC
       │
3. Quét Preflight toàn bộ Frame (Boundary Check):
       │  - Đọc trường `global_gain` của tất cả Granules và Channels trong tệp
       │  - Xác định `min_gain` và `max_gain` thực tế (ngưỡng 0 .. 255)
       │
       ▼
4. Tính toán số nấc thay đổi (Delta Steps):
       Mỗi nấc global_gain tương ứng với: 5.0 × log10(2.0) ≈ 1.50515 dB
       delta_steps = round((Mức_dB_mục_tiêu - Mức_dB_đo_được) / 1.50515)
       │
       ▼
5. Kiểm định Biên độ An toàn (Tuyệt đối KHÔNG clamp từng Granule):
       │  - Nếu (min_gain + delta_steps < 0) hoặc (max_gain + delta_steps > 255):
       │      + Tùy chọn A (Mặc định): Điều chỉnh giảm delta_steps về mức an toàn tối đa
       │        để bảo toàn 100% khả năng hoàn tác và không làm méo tương quan kênh/granule.
       │      + Tùy chọn B: Từ chối biến đổi và cảnh báo người dùng.
       │  - new_gain = current_gain + delta_steps (áp dụng đồng bộ cho mọi granule)
       │
       ▼
6. Cập nhật Side Information & Tính toán lại CRC:
       │  - Ghi đè byte `global_gain` mới vào Side Information
       │  - Xử lý 3 loại mã CRC:
       │      a. MPEG Frame CRC (16-bit): Nếu Protection Bit = 0, tính lại CRC-16 (đa thức 0x8005)
       │         cho Header + Side Info + Audio Data theo chuẩn ISO/IEC 11172-3.
       │      b. LAME Tag CRC (16-bit): Giữ nguyên hoặc tính lại nếu có sửa frame LAME.
       │      c. LAME Music CRC (16-bit): Giữ nguyên theo quy ước MP3Gain để tránh hiểu nhầm
       │         rằng audio stream đã bị giải mã/nén lại.
       │
       ▼
7. Sao chép Main Data nguyên vẹn 100% sang bộ đệm tệp tạm
       │
8. Tiếp tục lặp cho đến hết các Frame trong tệp
       │
9. Ghi thẻ APEv2 / ID3v2 lưu thông số hoàn tác chuẩn MP3Gain:
       `MP3GAIN_UNDO = "-002,-002,N"` (Lưu số nấc ĐẢO NGƯỢC: tăng +2 nấc thì lưu -2 để khi undo chỉ cần cộng vào)
       `MP3GAIN_MINMAX = "120,185"` (Lưu biên độ min, max trước khi thay đổi)
       ▼
[Hoàn tất chuyển đổi Lossless]
```

### 2.3. Quy tắc Thực thi 1-Click Cân bằng: Ghi đĩa Trực tiếp (Immediate Batch Execution)

Khác biệt cốt lõi giữa hai loại tác vụ trong ứng dụng:

| Loại tác vụ | Bản chất | Cơ chế cập nhật | Hành vi hoàn tất |
|---|---|---|---|
| **Sửa thẻ Metadata** (Title, Artist, Album...) | Nhập liệu vi mô từng trường | **Staged In-Memory Pending** | Bấm `[💾 Lưu]` hoặc `Cmd/Ctrl+S` để commit xuống đĩa |
| **Cân bằng Âm lượng** (`1-Click Cân bằng`) | Tác vụ lô xử lý hàng loạt | **Ghi đĩa Trực tiếp (Direct Disk Write)** | Chạy xong là tệp trên đĩa đã được cân bằng, **không cần bấm Save** |

- **Tiến trình thực thi:** Khi bấm `[🔊 1-Click Cân bằng]`, app hiển thị thanh tiến trình (Progress Bar 0% → 100%) stream theo thời gian thực. Lõi Rust chạy qua từng tệp, tạo `.tmp_<uuid>`, biến đổi `global_gain`, fsync, ghi journal `PREPARED`, và atomic replace sang `COMMITTED`.
- **Tự động Gộp thẻ Pending (Smart Piggybacking):** Nếu một tệp vừa có thay đổi thẻ đang Pending chưa lưu, vừa được chạy 1-Click Cân bằng, hệ thống sẽ **gộp luôn thẻ mới vào cùng đợt ghi Two-Phase của tệp đó**. Điều này giúp tối ưu hóa ổ đĩa tối đa: chỉ tốn đúng 1 lượt mở tệp và ghi đĩa duy nhất cho cả thẻ và âm lượng.
- **Sau khi hoàn tất:** Cột `dB Gốc` trên bảng cập nhật ngay về mức chuẩn (ví dụ `89.0 dB`), cột `Gain chênh lệch` về `0.0 dB`. Người dùng có thể rút USB hoặc tắt app ngay mà không lo quên lưu.
- **Hoàn tác:** Bất kỳ lúc nào người dùng muốn trả về âm lượng cũ, chỉ cần bấm nút `[Hoàn tác Gain (Undo MP3Gain)]` (hoặc `Cmd/Ctrl+Z`), hệ thống đọc thẻ `MP3GAIN_UNDO` và đảo ngược lại chính xác bitstream ban đầu.

---

## 3. Thuật toán Phân tích Âm lượng EBU R128 (Loudness Measurement Engine)

Hệ thống đo lường độ lớn âm thanh theo tiêu chuẩn quốc tế **ITU-R BS.1770-4 / EBU R128**:

```text
Dòng Tín hiệu Âm thanh (Audio Stream)
       │
       ▼
1. Giải mã thành tín hiệu PCM Float 32-bit (f32) qua crate `symphonia`
   - Giải mã bitstream MP3 thuần Rust, hỗ trợ đa kênh, mẫu PCM f32 không suy hao.
       │
       ▼
2. Tầng lọc Stage 1: Pre-filter (High-shelf filter) qua crate `ebur128`
   - Mô phỏng tác động tiêu âm âm học của đầu người.
   - Tham số: Tần số ~1500 Hz, độ lợi +4.0 dB.
       │
       ▼
3. Tầng lọc Stage 2: RLB Weighting Filter (High-pass filter)
   - Mô phỏng đường cong nhạy cảm của tai người với các dải tần số thấp.
   - Tần số cắt: 100 Hz, độ dốc 12 dB/octave.
       │
       ▼
4. Tính toán Năng lượng Bình phương Trung bình (Mean Square)
   - Chia tín hiệu thành các khối thời gian ngắn (Block 400ms, gối đầu 75% tức 100ms nhảy 1 bước).
   - Tính năng lượng zi cho từng kênh âm thanh.
       │
       ▼
5. Áp dụng Cổng Lọc Hai Tầng (Dual-stage Gating):
   - Cổng 1 (Absolute Gate): Loại bỏ các đoạn năng lượng quá nhỏ (dưới -70 LKFS).
   - Cổng 2 (Relative Gate): Loại bỏ các đoạn im lặng nằm dưới mức trung bình -10 LU.
       │
       ▼
6. Tính toán Độ lớn Tích lũy (Integrated Loudness - LUFS):
   - Kết quả trả về đơn vị LUFS (Loudness Units Full Scale).
   - Quy đổi sang chuẩn ReplayGain dB SPL:
       dB SPL = 107.0 + Integrated_Loudness_LUFS
       (Ví dụ: -18.0 LUFS tương ứng với 89.0 dB SPL).
       │
       ▼
7. Đo lường True Peak (Đỉnh Thực tế - đơn vị dBTP):
   - Áp dụng bộ lọc nội suy lấy mẫu 4x (4x oversampling filter theo ITU-R BS.1770-4).
   - Xác định `measured_true_peak_dbtp`.
   - Tính toán dự báo đỉnh sau khi cân bằng:
       predicted_true_peak_dbtp = measured_true_peak_dbtp + (delta_steps × 1.50515)
   - Nếu `predicted_true_peak_dbtp > 0.0 dBTP`: Gắn cờ cảnh báo Clipping (vỡ tiếng).
```

---

## 4. Quy trình Ghi Two-Phase Atomic Commit & Nhật ký Hoàn tác

Nhằm đảm bảo an toàn dữ liệu tuyệt đối cho người dùng VXUtilities, quy trình ghi tệp tuân thủ các bước sau:

```text
┌────────────────────────────────────────────────────────────────────────┐
│               QUY TRÌNH GHI TỆP TWO-PHASE ATOMIC COMMIT                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    1. Kiểm tra Quyền & Bộ nhớ       │ Kiểm tra quyền ghi (write permission)
       (Pre-flight Check)           │ và dung lượng ổ đĩa còn trống
                                    ▼
    2. Tạo Tệp Tạm thời             │ Tạo đường dẫn:
       (Temporary File Staging)     │ `/path/to/song.mp3.tmp_<uuid>`
                                    ▼
    3. Ghi Dữ liệu vào Tệp Tạm      │ Ghi metadata mới hoặc
                                    │ các frame MP3 đã biến đổi
                                    ▼
    4. Ép Đĩa Vật lý (fsync)        │ Gọi `file.sync_all()` để đảm bảo dữ liệu
                                    │ nằm chắc chắn trên chip nhớ/ổ đĩa
                                    ▼
    5. Kiểm định Toàn vẹn           │ Kiểm tra kích thước tệp tạm > 0 và
       (Integrity Verification)     │ parse lại header kiểm tra tính hợp lệ
                                    ▼
    6. Ghi Nhật ký Phase PREPARED   │ Thêm bản ghi vào `journal.jsonl` với trạng thái PREPARED.
       (Journal Staging)            │ NẾU GHI NHẬT KÝ THẤT BẠI: HỦY BỎ NGAY, KHÔNG THAY THẾ TỆP GỐC!
                                    ▼
    7. Thay thế Nguyên tử           │ Gọi `std::fs::rename(tmp_path, orig_path)`
       (Atomic Rename)              │ Thay thế tức thì, không có trạng thái lỡ dở
                                    ▼
    8. Cập nhật Phase COMMITTED     │ Đánh dấu trạng thái COMMITTED trong nhật ký giao dịch.
                                    │ Bắn sự kiện hoàn tất về Frontend UI
                                    ▼
    9. Dọn dẹp Tệp Tạm Sót Lại      │ Xóa file `.tmp_<uuid>` nếu thao tác lỗi trước đó
```

### Cơ chế Khởi động & Phục hồi Sự cố (Crash Recovery on Startup):
Khi khởi động ứng dụng, lõi Rust quét thư mục lưu nhật ký giao dịch:
- Nếu phát hiện bản ghi ở trạng thái `PREPARED` mà tệp tạm `.tmp_<uuid>` vẫn còn tồn tại: Hệ thống kiểm tra xem tệp gốc đã bị thay thế hay chưa.
  - Nếu tệp gốc chưa bị thay thế: Tự động dọn dẹp xóa tệp tạm, đánh dấu giao dịch `ROLLED_BACK`.
  - Nếu tệp gốc đã bị thay thế thành công trước khi crash: Đánh dấu cập nhật giao dịch thành `COMMITTED`.
- Quét dọn tự động tất cả các tệp mồ côi `.tmp_*` có thời gian tạo quá 24 giờ.

### Luồng Hoàn tác (Undo Flow):
1. Người dùng nhấn `Cmd/Ctrl + Z` hoặc chọn nút **Hoàn tác** trong menu.
2. Hệ thống đọc bản ghi giao dịch gần nhất từ `journal.jsonl`.
3. Nếu là giao dịch **Sửa thẻ / Đổi tên:** Hệ thống phục hồi lại siêu dữ liệu cũ hoặc đổi tên tệp trở về tên ban đầu.
4. Nếu là giao dịch **Lossless MP3 Gain:** Hệ thống thực hiện một lượt biến đổi `global_gain` ngược lại (với `delta_steps = -previous_delta_steps`), đưa toàn bộ frame MP3 về mức âm lượng gốc ban đầu mà không làm sai lệch bitstream âm thanh nén.

---

## 5. Thuật toán Quy đổi Mẫu Tên tệp ↔ Thẻ nhạc (Pattern Substitution Engine)

### 5.1. Bảng Biến Mẫu (Template Placeholders)

| Ký hiệu Mẫu | Ý nghĩa | Ví dụ giá trị |
|---|---|---|
| `%title%` | Tiêu đề bài hát | `Con Mưa Ngang Qua` |
| `%artist%` | Nghệ sĩ trình bày | `Sơn Tùng M-TP` |
| `%album%` | Tên album | `Tuyển Tập 2024` |
| `%track%` | Số thứ tự track (chuẩn hóa 2 chữ số) | `01`, `02`, `12` |
| `%year%` | Năm phát hành | `2024` |
| `%genre%` | Thể loại | `V-Pop` |

### 5.2. Luồng Quy đổi Tag → Filename
1. Nhận chuỗi mẫu từ người dùng, ví dụ: `%track% - %artist% - %title%`.
2. Duyệt qua từng bài hát, thay thế các biến bằng giá trị thẻ tương ứng.
3. Bộ khử ký tự cấm (Sanitizer) lọc bỏ các ký tự nguy hiểm:
   - Trên Windows: Chuyển `:` thành `-`, xóa `/ \ * ? " < > |`.
   - Trên macOS: Chuyển `:` thành `-`, gọt ký tự `/`.
4. So sánh với danh sách tệp hiện hữu để kiểm tra trùng lặp. Nếu trùng, gắn thêm suffix ` (1)`.
5. Tạo danh sách `RenameDiff` và hiển thị trên màn hình xem trước.

### 5.3. Luồng Bóc tách Filename → Tag
1. Người dùng nhập mẫu tương ứng với cấu trúc tên tệp hiện tại, ví dụ: `%track%. %artist% - %title%`.
2. Hệ thống biên dịch chuỗi mẫu thành biểu thức chính quy (Regex):
   `^(?P<track>\d+)\.\s+(?P<artist>.+?)\s+-\s+(?P<title>.+?)$`.
3. Áp dụng Regex lên tên tệp (bỏ phần mở rộng `.mp3`).
4. Trích xuất các nhóm dữ liệu (`Named Groups`) và cập nhật vào `pending_changes`.

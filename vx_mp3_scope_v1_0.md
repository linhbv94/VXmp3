# VXmp3 — Product Scope v1.0

> **Tiện ích desktop xử lý thẻ nhạc hàng loạt và cân bằng âm lượng tự nhiên không suy hao chất lượng.**  
> Nằm trong bộ công cụ cá nhân [VXUtilities](../_summary/master_overview.md).

---

## 1. Định nghĩa sản phẩm (Product Definition)

**VXmp3** là tiện ích desktop đa nền tảng (Windows và macOS) giải quyết trọn vẹn hai vấn đề phiền toái nhất khi quản lý thư viện nhạc cá nhân:
1. **Thẻ nhạc và tên tệp lộn xộn:** Thiếu thông tin nghệ sĩ, album, tên bài hát dính link web quảng cáo, không có ảnh bìa hoặc thiếu số thứ tự track.
2. **Âm lượng không đồng đều (Loudness Jumps):** Các bài hát tải từ nhiều nguồn khác nhau có mức âm lượng chênh lệch lớn (bài quá nhỏ, bài kế tiếp phát giật bắn người).

**Core flow (Luồng chính):**  
1. **Khởi động & Mở thư mục:** Người dùng bấm `[Mở thư mục]` trên Top Controlbar hoặc kéo thả thư mục vào app → Hệ thống quét toàn bộ tệp MP3/âm thanh trong thư mục con.
2. **Bố cục làm việc trực quan:**
   - **Top Controlbar:** Thiết lập mức âm lượng chuẩn (mặc định `89.0 dB SPL`), các nút hành động nhanh (`Đo dB`, `1-Click Cân bằng`, `Lưu`, bộ chuyển đổi chế độ xem).
   - **Left / Main Detail Item List:** Hiển thị danh sách tệp với các cột (File name, Tag version, Title, Artist, Album, Genres, Track, Year, Âm lượng hiện tại dB, Gain, Clipping...).
   - **Right Sidebar (Detail Inspector):** Click vào từng bài bên list sẽ hiển thị toàn bộ thông tin chi tiết dạng text box có thể chỉnh sửa; Cover Art có thể Thay thế (Replace), Gỡ bỏ (Remove) hoặc Thêm mới (Add). Bấm `[Lưu]` hoặc `Cmd/Ctrl+S` để ghi file đĩa.
3. **Chỉnh sửa nhanh hai chế độ:**
   - Sửa qua Right Sidebar cho từng bài hoặc sửa hàng loạt khi chọn nhiều bài.
   - Sửa trực tiếp trên bảng (Inline Edit) theo hành vi chuẩn Finder/Explorer: 1-click chọn, click tiếp theo (hoặc `F2`/`Enter`) để gõ; `Enter/Shift+Enter` xuống/lên hàng; `Tab/Shift+Tab` sang phải/trái; giá trị được stage vào bộ nhớ tạm và bấm `[Lưu]` để commit hàng loạt siêu tốc.
4. **Cân bằng Âm lượng chuẩn MP3Gain:**
   - Nhấn `[Đo dB]` để đo độ lớn EBU R128 và ghi vào cột Âm lượng.
   - Nhấn `[1-Click Cân bằng]`: Tự động áp dụng chuẩn hóa lossless qua MPEG frame `global_gain` (bước 1.5 dB, zero re-encode, có thể hoàn tác).

### Các nguyên tắc cốt lõi
- **Cross-platform là ưu tiên số một:** Trải nghiệm đồng nhất và hoàn hảo trên cả Windows 11+ (x64) và macOS (Apple Silicon & Intel).
- **Offline-first & Không rò rỉ dữ liệu:** Toàn bộ quá trình quét, phân tích và xử lý diễn ra 100% tại máy cục bộ; không telemetry, không yêu cầu kết nối mạng hay tài khoản.
- **Lossless tuyệt đối trong xử lý âm lượng:** 
  - Với tệp MP3: Sử dụng kỹ thuật điều chỉnh trường `global_gain` trong từng MPEG audio frame (bước 1.5 dB). Tuyệt đối **không giải mã PCM và nén lại**; giữ nguyên vẹn 100% chất lượng âm thanh gốc và có thể đảo ngược/hoàn tác (reversible).
  - Với các định dạng khác (FLAC, M4A, OGG, Opus, WAV): Ghi các thẻ chuẩn ReplayGain 2.0 / EBU R128 để trình phát tương thích tự động điều chỉnh mà không đụng chạm đến dòng dữ liệu âm thanh nhị phân.
- **An toàn dữ liệu tuyệt đối (Data Safety First):** Không bao giờ ghi đè trực tiếp khi chưa kiểm chứng; mọi thao tác ghi đều thông qua tệp tạm `.tmp_<uuid>`, kiểm tra tính toàn vẹn và thay thế nguyên tử (atomic rename). Lưu nhật ký thao tác (Operation Journal) để hỗ trợ hoàn tác (Undo).

---

## 2. Tình huống sử dụng thực tế (Use Cases)

### UC-01 — Dọn dẹp thẻ nhạc & Đánh số thứ tự tự động (Batch Tagging & Auto-Numbering)
1. Người dùng tải về một album nhạc hoặc danh sách bài hát từ internet, tên file dính tiền tố rác và tag bị thiếu.
2. Kéo cả thư mục vào VXmp3; danh sách bài hát nạp tức thì trong bảng tính ảo hóa.
3. Người dùng chọn toàn bộ danh sách, nhập chung thông tin: `Artist: Vũ`, `Album: Bảo Tàng Của Nuối Tiếc`, `Year: 2024`, `Genre: Indie Pop`.
4. Nhấn nút **Đánh số tự động (Auto-track Numbering)**: Hệ thống tự điền `Track` từ `01` đến `10` và `Total Tracks: 10`.
5. Kéo thả tệp ảnh bìa `cover.jpg` vào khung ảnh bìa để nhúng vào toàn bộ 10 bài hát.
6. Nhấn `Cmd/Ctrl + S` để lưu thay đổi vào tệp đĩa.

### UC-02 — Cân bằng âm lượng Lossless cho USB nghe nhạc ô tô / Máy MP3 (Lossless MP3 Gain)
1. Người dùng có thư mục 150 bài hát MP3 chuẩn bị cóp vào USB để nghe trên xe hơi hoặc máy nghe nhạc di động cũ (vốn không hỗ trợ đọc thẻ ReplayGain).
2. Nạp thư mục vào VXmp3; bấm **Phân tích âm lượng (Analyze Loudness)**.
3. VXmp3 đo đạc và hiển thị độ lớn thực tế của từng bài (dao động từ 83.2 dB đến 98.6 dB) kèm cảnh báo vỡ tiếng (Clipping Warning màu vàng/đỏ) ở các bài quá lớn.
4. Người dùng chọn mức chuẩn hoá mục tiêu `89.0 dB` (hoặc `96.0 dB`), chọn chế độ **MP3 Direct Frame Gain**.
5. VXmp3 hiển thị bảng xem trước (Gain Diff: `-3.0 dB`, `+4.5 dB`...).
6. Bấm **Áp dụng cân bằng**: Lõi Rust điều chỉnh trường `global_gain` trong MPEG frames chỉ mất vài giây cho cả 150 bài mà không nén lại âm thanh.
7. Cắm USB vào xe hơi: Tất cả bài hát phát ở cùng một mức âm lượng dễ chịu, không cần vặn volume liên tục.

### UC-03 — Chuẩn hoá ReplayGain cho dàn nhạc Hi-Fi / DAP chuyên dụng
1. Người dùng có thư viện nhạc chất lượng cao hỗn hợp (FLAC, M4A, Opus).
2. Người dùng muốn giữ nguyên bản gốc từng bit âm thanh nhưng muốn trình phát (Foobar2000, Apple Music, Roon, Poweramp) phát đều âm lượng.
3. Chọn chế độ **ReplayGain Tagging**; VXmp3 tính toán Track Gain, Track Peak, Album Gain, Album Peak theo chuẩn EBU R128 (ITU-R BS.1770-4) và ghi vào thẻ metadata.

### UC-04 — Đổi tên tệp hàng loạt từ Thẻ và Bóc tách Thẻ từ Tên tệp (Filename ↔ Tag)
1. **Tag → Filename:** Người dùng có danh sách bài hát đã có tag chuẩn, muốn chuẩn hóa tên file trên ổ đĩa theo cấu trúc `%track% - %artist% - %title%.%ext%`. VXmp3 hiển thị bảng xem trước tên cũ → tên mới và đổi tên hàng loạt an toàn.
2. **Filename → Tag:** Người dùng có tệp tên dạng `01. Son Tung MTP - Chung Ta Cua Tuong Lai.mp3` nhưng tag bên trong trống rỗng. Người dùng áp dụng mẫu `%track%. %artist% - %title%` để bóc tách thông tin và điền vào các trường tag tương ứng.

---

## 3. Phạm vi chức năng (Functional Scope)

| Mã | Nhóm | Yêu cầu chức năng | Mức ưu tiên |
|---|---|---|---|
| **F01** | Khởi động & Nạp | Kéo thả thư mục hoặc tệp nhạc vào ứng dụng; mở qua hộp thoại chọn thư mục | P0 |
| **F02** | Bảng hiển thị | Bảng tính ảo hóa (Virtualized Table) hiển thị danh sách bài hát, hỗ trợ cuộn mượt hàng ngàn bài | P0 |
| **F03** | Đọc siêu dữ liệu | Đọc đầy đủ thẻ ID3v1, ID3v2.3/v2.4, Vorbis Comments, MP4/M4A atoms cho MP3, FLAC, M4A, OGG, WAV | P0 |
| **F04** | Sửa thẻ đơn lẻ | Sửa trực tiếp từng ô trên bảng hoặc sửa qua Inspector Panel bên phải | P0 |
| **F05** | Sửa thẻ hàng loạt | Chọn nhiều dòng (Multi-selection) để sửa đồng thời các trường chung: Artist, Album, Year, Genre... | P0 |
| **F06** | Đánh số tự động | Đánh số thứ tự track tự động tăng dần (`01`, `02`...) theo thứ tự sắp xếp hiện tại, có tùy chọn tổng số track | P0 |
| **F07** | Quản lý ảnh bìa | Xem ảnh bìa hiện tại, kéo thả ảnh mới vào để nhúng, trích xuất ảnh bìa ra tệp, xóa ảnh bìa | P0 |
| **F08** | Quy đổi Tag → Tên | Đổi tên tệp theo quy tắc định dạng tùy biến (ví dụ: `%track% - %artist% - %title%`) kèm xem trước an toàn | P0 |
| **F09** | Quy đổi Tên → Tag | Bóc tách thông tin từ cấu trúc tên tệp vào các trường thẻ metadata tương ứng | P0 |
| **F10** | Phân tích âm lượng | Đo lường Integrated Loudness (LUFS) và quy đổi sang dB SPL theo thuật toán EBU R128 / ITU-R BS.1770 | P0 |
| **F11** | Cảnh báo vỡ tiếng | Phát hiện và cảnh báo nguy cơ vỡ tiếng (Clipping Risk) nếu tăng âm lượng vượt ngưỡng True Peak | P0 |
| **F12** | Lossless MP3 Gain | Điều chỉnh trực tiếp trường `global_gain` trong MPEG audio frames của MP3 (bước 1.5 dB), không re-encode | P0 |
| **F13** | ReplayGain Tagging | Ghi các thẻ chuẩn `REPLAYGAIN_TRACK_GAIN`, `REPLAYGAIN_TRACK_PEAK`, `ALBUM_GAIN` cho mọi định dạng | P0 |
| **F14** | Xem trước & An toàn | Bảng so sánh Tag Diff và Gain Diff; cơ chế Two-phase write qua file tạm, kiểm tra toàn vẹn trước khi commit | P0 |
| **F15** | Hoàn tác (Undo) | Hoàn tác thao tác sửa tag hoặc đảo ngược thay đổi `global_gain` của MP3 thông qua Operation Journal | P0 |
| **F16** | Nghe thử (Preview) | Mini Player tích hợp phát bài hát đang chọn qua phím Spacebar; thanh tua (scrubber) và volume | P0 |
| **F17** | Chuẩn hóa chữ | Chuyển đổi định dạng chữ (Title Case, UPPERCASE, lowercase, Sentence case) cho các trường tag | P1 |
| **F18** | Tối ưu ảnh bìa | Tự động resize/nén ảnh bìa nhúng quá lớn (ví dụ giảm từ 5MB xuống JPEG 800x800 ~200KB) để tránh phình tệp | P1 |
| **F19** | So sánh âm thanh A/B | Nút bật/tắt tức thì hiệu ứng gain trong Mini Player để nghe thử sự khác biệt trước và sau khi chuẩn hóa | P1 |
| **F20** | Tra cứu tag online | Tự động tìm kiếm metadata và ảnh bìa từ MusicBrainz / Discogs (kết nối mạng tùy chọn) | P2 |

---

## 4. Mô hình Dữ liệu & Xử lý Âm thanh (Audio & Data Model)

### 4.1. Định dạng tệp tin hỗ trợ trong v1.0
- **Tập trung cao nhất:** `MP3` (`.mp3` — MPEG-1/2 Audio Layer III). Hỗ trợ cả 2 phương thức: Lossless Frame Gain và ReplayGain Tagging.
- **Hỗ trợ ReplayGain Tagging & Tag Editing:** 
  - `FLAC` (`.flac` — Free Lossless Audio Codec)
  - `M4A / AAC` (`.m4a`, `.aac` — MP4 Audio Container)
  - `OGG Vorbis` (`.ogg`)
  - `Opus` (`.opus`)
  - `WAV` (`.wav` — RIFF INFO / ID3 chunk)

### 4.2. Hai cơ chế Chuẩn hóa Âm lượng (Dual-Normalization Architecture)

```text
┌────────────────────────────────────────────────────────────────────────┐
│               HAI PHƯƠNG THỨC CHUẨN HÓA ÂM LƯỢNG TRONG VXMP3           │
├───────────────────────────────────┬────────────────────────────────────┤
│ Phương thức 1: Lossless MP3 Gain  │ Phương thức 2: ReplayGain Tagging  │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Can thiệp trực tiếp bitstream   │ • Chỉ ghi thẻ siêu dữ liệu         │
│   audio frame của tệp MP3.        │   (Metadata Tags) vào tệp.         │
│ • Thay đổi trường `global_gain`   │ • Dòng dữ liệu âm thanh nhị phân   │
│   (8-bit int, mỗi nấc = 1.5 dB).  │   giữ nguyên vẹn 100%.             │
│ • Hoàn toàn KHÔNG giải mã PCM     │ • Áp dụng cho MỌI định dạng:       │
│   và KHÔNG nén lại (Zero Loss).   │   FLAC, M4A, OGG, Opus, WAV, MP3.  │
│ • Tương thích 100% với mọi thiết  │ • Đòi hỏi trình phát có hỗ trợ     │
│   bị phần cứng, máy cũ, loa ô tô. │   ReplayGain (Foobar, Apple Music).│
│ • Có thể hoàn tác (Reversible).   │ • Hoàn tác dễ dàng bằng xóa tag.   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 5. Hành vi ứng dụng & Phím tắt (Application Behavior & Shortcuts)

- **Kéo thả thông minh:** Kéo thả một hoặc nhiều thư mục / tệp âm thanh vào cửa sổ ứng dụng để nạp danh sách.
- **Phím tắt chuẩn Desktop:**
  - `Space`: Phát / Tạm dừng bài hát đang focus trên bảng.
  - `Cmd/Ctrl + S`: Lưu các thay đổi thẻ đang chờ (Pending Tag Changes) vào tệp đĩa.
  - `Cmd/Ctrl + Z`: Hoàn tác thao tác gần nhất (dựa trên Operation Journal).
  - `Cmd/Ctrl + A`: Chọn tất cả các bài hát trong danh sách đang hiển thị.
  - `Delete / Backspace`: Xóa bài hát khỏi danh sách hiển thị trong app (tuyệt đối KHÔNG xóa file trên ổ đĩa).
  - `F2`: Bắt đầu chỉnh sửa trực tiếp (inline edit) ô đang chọn trong bảng.
  - `Tab / Shift + Tab`: Chuyển sang sửa ô kế tiếp / ô trước đó trong cùng hàng.
- **Trạng thái lưu an toàn:** Các ô có thay đổi nhưng chưa bấm Lưu sẽ được đánh dấu viền sáng màu Cyan hoặc ký hiệu `*` trên tiêu đề. Khi người dùng đóng ứng dụng hoặc mở thư mục mới khi còn thay đổi chưa lưu, hệ thống hiển thị hộp thoại xác nhận rõ ràng.

---

## 6. Quyền riêng tư & An toàn dữ liệu (Privacy & Data Safety)

- **100% Offline cục bộ:** Không gửi tên tệp, tên bài hát hay metadata lên bất kỳ máy chủ nào.
- **Quy trình ghi Two-Phase Atomic Write:**
  ```text
  File gốc (song.mp3) 
         │
         ▼
  1. Tạo tệp tạm: song.mp3.tmp_<uuid>
  2. Ghi metadata / MP3 frames vào tệp tạm
  3. fsync đảm bảo dữ liệu ghi trọn vẹn xuống ổ đĩa vật lý
  4. Xác minh kích thước & header tệp tạm hợp lệ
  5. Đổi tên nguyên tử (Atomic Rename): tệp tạm ghi đè tệp gốc
  6. Ghi nhật ký vào Operation Journal (đường dẫn, hash, giá trị cũ/mới)
  ```
- **Không tự ý thay đổi file ngoài phạm vi:** Chỉ thao tác trên đúng các tệp mà người dùng đã chọn và xác nhận.
- **Bảo vệ chống vỡ tiếng (Clipping Protection):** Nếu việc tăng âm lượng làm bài hát bị vượt ngưỡng True Peak `0.0 dBFS` (gây rè/vỡ tiếng trên loa), hệ thống bắt buộc hiển thị cảnh báo màu Amber/Rose và yêu cầu người dùng xác nhận nếu vẫn muốn ép tăng âm lượng.

---

## 7. Bộ công nghệ đề xuất (Tech Stack)

| Lớp | Công nghệ | Chi tiết sử dụng |
|---|---|---|
| **Vỏ Desktop** | Tauri v2 (Rust) | Quản lý cửa sổ, native file dialogs, IPC streaming, đa nền tảng |
| **Giao diện** | React 19 / 18 + TypeScript + Vite | Giao diện bảng tính linh hoạt, state management mượt mà |
| **Styling & Theme** | Tailwind CSS + Lucide Icons | Tuân thủ [master_theme.md](../_summary/master_theme.md) và [desktop_ui_standards.md](../.agents/desktop_ui_standards.md) |
| **Ảo hóa Bảng** | `@tanstack/react-virtual` | Render mượt mà 5,000+ bài hát mà không làm chậm DOM |
| **Metadata Core** | Rust crate `lofty` | Đọc/ghi siêu dữ liệu ID3v1, ID3v2.3/v2.4, Vorbis, APEv2, MP4 atoms cực nhanh |
| **Loudness Engine** | Rust crate `ebur128` (hoặc `libebur128`) | Đo lường chuẩn ITU-R BS.1770-4 / EBU R128 |
| **MP3 Bitstream Core** | Rust Native Bitstream Parser | Phân tích và điều chỉnh `global_gain` trong MPEG frames không re-encode |
| **Audio Preview** | Tauri Audio / Web Audio API | Trình phát nhạc nhẹ nhàng, hỗ trợ điều chỉnh volume và seekbar |

---

## 8. Tiêu chí nghiệm thu (Acceptance Criteria v1.0)

1. Nạp một thư mục chứa 500 bài hát hỗn hợp (MP3, FLAC, M4A, WAV) trong thời gian dưới 1 giây; hiển thị đầy đủ thông tin thẻ và ảnh bìa.
2. Sửa thông tin hàng loạt (Artist, Album, Year, Genre) cho 50 bài hát cùng lúc và lưu thành công; mở lại bằng Finder/Explorer và app nghe nhạc khác (Apple Music, Foobar2000) thấy dữ liệu cập nhật chuẩn xác.
3. Chức năng tự động đánh số track gán đúng số thứ tự tăng dần từ `01` đến `N` và cập nhật trường tổng số track.
4. Chức năng quy đổi `Tag → Filename` đổi tên đúng theo mẫu và không gây lỗi trùng tên hoặc ký tự cấm trên cả Windows và macOS.
5. Chức năng quy đổi `Filename → Tag` bóc tách chính xác các trường từ tên tệp vào thẻ.
6. Tính năng đo âm lượng hiển thị đúng chỉ số dB SPL và LUFS cho từng bài hát; phát hiện chính xác các bài hát có nguy cơ vỡ tiếng (Clipping Risk).
7. Thao tác **Lossless MP3 Gain** điều chỉnh âm lượng thành công trên tệp MP3; kiểm tra dạng sóng và phổ âm thanh chứng minh **không bị nén lại/suy hao chất lượng** (bitstream lossless).
8. Thao tác hoàn tác (Undo) khôi phục chính xác thẻ cũ hoặc đưa âm lượng MP3 về lại mức ban đầu trước khi can thiệp.
9. Quá trình ghi tệp an toàn tuyệt đối; nếu bị ngắt điện hoặc mất quyền ghi giữa chừng, tệp gốc không bị mất hoặc hỏng dữ liệu.

---

## 9. Ước lượng độ khó & Kế hoạch triển khai (Effort & Phases)

**Ước lượng độ khó tổng thể:** **3.5 / 10** cho phiên bản v1.0 tinh gọn.
- Phần sửa thẻ metadata và quy đổi tên tệp: Đã có thư viện Rust `lofty` hỗ trợ toàn diện, độ khó thấp (~2.5/10).
- Phần phân tích âm lượng EBU R128: Đã có thư viện `ebur128`, độ khó trung bình (~3.5/10).
- Phần can thiệp bitstream MP3 `global_gain` và cơ chế Two-phase commit an toàn: Cần sự tỉ mỉ về an toàn dữ liệu (~4/10).

### Kế hoạch 4 giai đoạn
- **Phase 1 (1–2 ngày):** Dựng khung Tauri v2/React, Virtualized Table, nạp thư mục và đọc siêu dữ liệu qua Rust `lofty`, trình phát Mini Player.
- **Phase 2 (2–3 ngày):** Chức năng sửa thẻ đơn lẻ/hàng loạt, đánh số track tự động, nhúng/trích xuất ảnh bìa, bộ quy đổi `Filename ↔ Tag`.
- **Phase 3 (2–3 ngày):** Tích hợp engine phân tích âm lượng EBU R128, đo lường True Peak/LUFS, hiển thị cảnh báo Clipping, ghi thẻ ReplayGain.
- **Phase 4 (2–3 ngày):** Lõi biến đổi `global_gain` lossless cho MP3, cơ chế Two-phase atomic write và Operation Journal Undo, kiểm thử và đóng gói bộ cài macOS/Windows.

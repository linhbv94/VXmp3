# System Specification Overview: VXmp3 (`_spec0_system`)

> **Tên sản phẩm:** VXmp3 (Lossless Audio Normalizer & Batch Tag Editor)  
> **Thư mục dự án:** `vxmp3`
> **Phiên bản tài liệu:** 1.0.1
> **Ngày cập nhật:** 2026-10-15
> **Nền tảng mục tiêu:** macOS (Apple Silicon & Intel) + Windows 11+ (x64)  
> **Kiến trúc phân tầng:** Kiến trúc 3 tầng phân định rõ ràng:
> - **Tầng 1 (UI Shell — 95% Dùng chung):** Tauri v2 WebView (React 19 / 18 + TypeScript + Vite + Tailwind CSS) tuân thủ nghiêm ngặt [master_theme.md](../../../_summary/master_theme.md) và [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md).
> - **Tầng 2 (Audio & Metadata Core — 100% Dùng chung):** Rust Native Engine:
>   - Đọc/ghi siêu dữ liệu định dạng phong phú qua crate `lofty` (ID3v1, ID3v2.3/v2.4, Vorbis Comments, APEv2, MP4 atoms).
>   - Phân tích độ lớn âm thanh theo chuẩn EBU R128 / ITU-R BS.1770-4 qua crate `ebur128`.
>   - Bộ biến đổi bitstream khung âm thanh MP3 lossless (MPEG Layer III `global_gain` modifier), bảo toàn 100% chất lượng âm thanh gốc không nén lại.
>   - Bộ quản lý an toàn dữ liệu Two-Phase Atomic Commit và Nhật ký thao tác (Operation Journal).
> - **Tầng 3 (Platform Adapter — ~5% Đặc thù OS):**
>   - *Trên macOS:* Quản lý menu bar hệ điều hành, phím tắt `Cmd`, kéo thả tệp qua Finder, thông báo hệ thống native.
>   - *Trên Windows:* Tùy biến titlebar không có viền native (`decorations: false`), phím tắt `Ctrl`, kéo thả tệp qua File Explorer.

---

## Phạm vi phát hành 1.0.1

Windows x64 và macOS Silicon/Intel cùng dùng engine Rust thật cho đọc/ghi thẻ, đo loudness và gain lossless. Không dùng dummy Windows theo quyết định user 2026-10-15. Windows dùng NSIS currentUser và updater hiện có; [QA/checkpoint](../release_1_0_1_review.md) phân biệt build/fixture/native GUI và giới hạn từng OS.

## 1. Bối cảnh & Tôn chỉ Sản phẩm (Product Vision)

### 1.1. Nỗi đau thực tế (The Real Pain Point)
Người nghe nhạc ngoại tuyến (offline audio collection), DJ, người làm âm thanh cho video, hay người dùng chép nhạc vào USB xe hơi/máy nghe nhạc di động thường xuyên gặp phải hai sự ức chế lớn:

1. **Âm lượng chênh lệch hỗn loạn (Loudness Inconsistency):**
   - Các bài hát tải từ YouTube, Zing MP3, Soundcloud, Bandcamp, đĩa CD hay dịch vụ trực tuyến có độ lớn rất khác nhau.
   - Khi phát nhạc trong danh sách, người dùng liên tục phải giật mình chỉnh volume: bài thì quá nhỏ nghe không rõ, bài kế tiếp lại nổ vang đinh tai hoặc bị vỡ tiếng (distortion/clipping).
   - Các phần mềm hiện có như Audacity bắt buộc phải **giải mã PCM rồi nén lại MP3 (re-encode)**, dẫn đến suy hao chất lượng âm thanh (generation loss).
   - Phần mềm huyền thoại **MP3Gain** đã ngừng phát triển hơn 15 năm, giao diện cũ kỹ, chỉ chạy trên Windows 32-bit, không có bản native macOS, dễ crash khi gặp tệp Unicode hoặc đường dẫn dài.

2. **Thẻ nhạc và Tên tệp lộn xộn (Metadata Chaos):**
   - Tên tệp chứa quảng cáo (`y2mate.com - Track 01.mp3`), thiếu trường Title, Artist, Album, hoặc không có ảnh bìa (Cover Art).
   - Thao tác dọn dẹp hàng loạt và đánh số thứ tự track (`01`, `02`, `03`...) trên Windows Explorer hay macOS Finder rất chậm và thủ công.
   - Công cụ **Mp3tag** tuy tốt nhưng phiên bản macOS là ứng dụng trả phí trên Mac App Store, không tích hợp sẵn công cụ cân bằng âm lượng MP3 Gain lossless trực tiếp, giao diện không tối ưu dark mode hiện đại.

### 1.2. Mục tiêu của VXmp3
VXmp3 được định vị là **tiện ích desktop cá nhân tất cả trong một (All-in-One Utility)** giúp:
1. **Sửa siêu dữ liệu hàng loạt tốc độ cao (High-speed Batch Tag Editor):** Xem dạng bảng tính, sửa trực tiếp trên ô, sửa chung cho nhiều bài đang chọn, tự động đánh số track, quy đổi hai chiều `Tên tệp ↔ Thẻ nhạc`.
2. **Cân bằng âm lượng chuẩn không suy hao (Lossless Loudness Normalization):**
   - Chuẩn hoá trực tiếp khung MP3 qua `global_gain` (bước 1.5 dB, không re-encode, bảo toàn bitstream, tương thích 100% máy nghe nhạc và loa ô tô).
   - Ghi thẻ ReplayGain 2.0 / EBU R128 cho các định dạng chất lượng cao (FLAC, M4A, OGG, Opus, WAV).
3. **An toàn dữ liệu tuyệt đối (Zero Risk of Corruption):** Kiểm tra tính toàn vẹn trước khi ghi đè, ghi qua tệp tạm, atomic rename và hỗ trợ hoàn tác (Undo) qua Operation Journal.

---

## 2. Ma trận Độ khó Kỹ thuật & Giải pháp Kiến trúc (Difficulty Matrix)

```text
┌────────────────────────────────────────────────────────────────────────┐
│               MA TRẬN ĐỘ KHÓ KỸ THUẬT (DIFFICULTY MATRIX)              │
├────────────────────────┬─────────────┬─────────────────────────────────┤
│ Hạng mục               │ Mức độ khó  │ Rủi ro / Điểm nghẽn chính       │
├────────────────────────┼─────────────┼─────────────────────────────────┤
│ 1. Lossless MP3 Gain   │ ★★★★★ (9/10)│ Lệch bitstream frame, hỏng VBR  │
│ 2. EBU R128 Analysis   │ ★★★★☆ (8/10)│ Quét chậm, tràn RAM khi mở 1k bài│
│ 3. Two-Phase Safety    │ ★★★★☆ (7/10)│ Mất file khi ngắt điện/lỗi I/O  │
│ 4. Filename ↔ Tag Rule │ ★★★☆☆ (6/10)│ Ký tự cấm OS, xung đột trùng tên │
│ 5. Virtualized Table   │ ★★★☆☆ (6/10)│ Lag giật DOM khi cuộn danh sách │
└────────────────────────┴─────────────┴─────────────────────────────────┘
```

### Điểm khó 1: Biến đổi Bitstream MPEG Audio Layer III Lossless & Bảo toàn Hoàn tác (Độ khó: 9/10)
* **Vấn đề kỹ thuật:**
  - Tệp MP3 bao gồm chuỗi các khung âm thanh (MPEG audio frames). Trong cấu trúc Side Information của từng frame có trường `global_gain` (kích thước 8-bit, giá trị từ 0 đến 255). Mỗi đơn vị `global_gain` tương ứng chính xác với mức thay đổi âm lượng lý thuyết `5 × log10(2) ≈ 1.50515 dB`.
  - **Rủi ro mất hoàn tác khi Clamp:** Nếu dùng `clamp(current_gain + delta, 0, 255)`, các granule có giá trị sát biên (ví dụ 254 + 2 -> 255) khi Undo lấy `255 - 2 = 253` sẽ làm sai lệch byte gốc và hỏng cân bằng động giữa các kênh.
  - Phải phân biệt rõ 3 loại CRC: MPEG Frame CRC (nếu có bit protection), LAME Music CRC (tính trên toàn bộ data audio), và LAME Tag CRC (nằm trong Xing/LAME frame).
* **Giải pháp kiến trúc:**
  - Xây dựng mô-đun Rust Bitstream Parser chuyên biệt: Đọc cấu trúc MPEG frame header và Side Information theo chuẩn ISO/IEC 11172-3 và ISO/IEC 13818-3.
  - **Quy tắc Preflight Biên độ:** Quét trước toàn bộ frame của tệp. Nếu có bất kỳ granule nào vượt biên `0..255` khi áp dụng delta, hệ thống **tự động giảm mức delta chung cho cả bài hoặc từ chối thực thi**, tuyệt đối KHÔNG clamp cục bộ làm mất khả năng hoàn tác.
  - Cập nhật lại MPEG Frame CRC và LAME CRC đúng chuẩn kỹ thuật để bảo đảm tính hợp lệ của bitstream.
  - Ghi thẻ hoàn tác `MP3GAIN_UNDO` theo chuẩn MP3Gain: Lưu giá trị delta cần đảo ngược (ví dụ tăng `+2` nấc thì thẻ ghi `-002,-002,N`).

### Điểm khó 2: Giải mã PCM qua Symphonia & Phân tích Âm lượng EBU R128 (Độ khó: 8/10)
* **Vấn đề kỹ thuật:**
  - Crate `ebur128` chỉ nhận tín hiệu mẫu PCM thô dạng float. Hệ thống cần tầng giải mã âm thanh (Audio Decoder) tương thích đa định dạng mà không rò rỉ bộ nhớ.
  - Cần phân định rõ các đơn vị đo: `LUFS` (Integrated Loudness chuẩn EBU), `dBTP` (True Peak), và thang quy ước ReplayGain hiển thị (`dB SPL = 107.0 + LUFS`).
  - Dự báo vỡ tiếng (Clipping) phải dựa trên biên độ đỉnh sau khi cộng mức gain thực tế, không dùng đỉnh cũ.
* **Giải pháp kiến trúc:**
  - Tích hợp crate Rust `symphonia` làm Audio Demuxer & Decoder chuyên dụng, giải mã dữ liệu âm thanh MP3, FLAC, M4A/AAC, WAV sang PCM float streaming từng khối 64KB.
  - Tích hợp crate Rust `ebur128` (ITU-R BS.1770-4) bật `Mode::I | Mode::TRUE_PEAK` kết hợp worker pool đa luồng.
  - Tính toán dự báo đỉnh: `predicted_true_peak_dbtp = measured_true_peak_dbtp + applied_gain_db`. Nếu `predicted_true_peak > 0.0 dBTP` thì bật cảnh báo `Clipping Risk`.

### Điểm khó 3: An toàn Dữ liệu Tuyệt đối (Crash-Resilient Two-Phase Commit & Journal) (Độ khó: 7/10)
* **Vấn đề kỹ thuật:**
  - Nếu hệ thống chỉ ghi journal sau khi đổi tên tệp mà gặp sự cố sập nguồn đúng lúc, file đã bị đổi nhưng mất bản ghi hoàn tác.
* **Giải pháp kiến trúc:**
  - **Quy trình ghi Two-Phase Atomic Commit chuẩn hóa:**
    1. Pre-flight check: Kiểm tra quyền ghi và dung lượng đĩa khả dụng.
    2. Tạo tệp tạm độc quyền cùng thư mục cha: `<filename>.mp3.tmp_<uuid>`.
    3. Ghi bitstream/tag mới vào tệp tạm và gọi `fsync` (hoặc `fcntl F_FULLFSYNC` trên macOS).
    4. Kiểm tra toàn vẹn tệp tạm: Kích thước hợp lệ, parse lại header và check CRC.
    5. **Ghi Journal trạng thái `PREPARED` xuống đĩa:** Nếu ghi journal lỗi, **hủy tác vụ ngay trước khi replace tệp gốc**.
    6. Thay thế nguyên tử (`atomic replace` qua `std::fs::rename`) tệp tạm thành tệp gốc.
    7. **Cập nhật Journal trạng thái `COMMITTED`** và thông báo thành công.
  - **Khởi động an toàn (Startup Recovery):** Khi app mở lên, hệ thống tự rà soát `journal.jsonl` để phát hiện và dọn dẹp các tệp tạm mồ côi hoặc xử lý các giao dịch dở dang do tắt máy đột ngột.

### Điểm khó 4: Bộ Quy tắc Quy đổi Tên tệp ↔ Thẻ nhạc (Độ khó: 6/10)
* **Vấn đề kỹ thuật:**
  - Đổi tên tệp dễ vướng các ký tự cấm của hệ điều hành: Trên Windows cấm `\ / : * ? " < > |`, trên macOS cấm `:` và ký tự đầu `/`.
  - Tên tệp mới có thể bị trùng lặp với tệp đang có sẵn trong thư mục, gây ghi đè ngoài ý muốn.
* **Giải pháp kiến trúc:**
  - Bộ biên dịch mẫu định dạng (Pattern Parser) hỗ trợ các placeholder chuẩn: `%artist%`, `%album%`, `%title%`, `%track%`, `%year%`, `%genre%`.
  - Bộ lọc khử ký tự cấm (Sanitizer) tự động thay thế các ký tự không hợp lệ bằng ký tự an toàn (ví dụ `:` thành `-`, `?` bị loại bỏ).
  - Chế độ **Xem trước (Dry-run Preview)**: Bắt buộc hiển thị bảng đối chiếu tên cũ và tên mới trước khi người dùng bấm xác nhận. Nếu phát hiện xung đột trùng tên, hệ thống tự động cảnh báo và đề xuất thêm hậu tố số `(1)`, `(2)`.

### Điểm khó 5: Bảng tính Ảo hóa Siêu mượt (Virtualized Grid Table) (Độ khó: 6/10)
* **Vấn đề kỹ thuật:**
  - Một thư mục nhạc có thể chứa từ vài trăm đến 10,000 tệp. Nếu render toàn bộ các dòng table vào DOM, trình duyệt WebView sẽ bị tràn bộ nhớ và giật lag khi cuộn.
* **Giải pháp kiến trúc:**
  - Áp dụng thư viện ảo hóa `@tanstack/react-virtual` để chỉ render các hàng nằm trong khung nhìn hiển thị (viewport) kèm vùng đệm trên/dưới (overscan ~10 hàng).
  - Giữ trạng thái chỉnh sửa cục bộ (Unsaved Changes) trong bộ nhớ React State, chỉ gửi dữ liệu xuống Rust Backend khi người dùng bấm Lưu (`Cmd/Ctrl + S`).

---

## 3. Sơ đồ Kiến trúc Tổng thể (High-Level Architecture)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                           TAURI FRONTEND SHELL                         │
│  React 19 / 18 · TypeScript · Tailwind CSS · TanStack Virtual · Lucide │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │     Virtualized Table   │  │           Inspector Panel           │  │
│  │ (Inline Edit, Columns)  │  │ (Single / Multi-track Metadata Form)│  │
│  └────────────┬────────────┘  └──────────────────┬──────────────────┘  │
│               │                                  │                     │
│               └───────────────┬──────────────────┘                     │
│                               ▼                                        │
│                 Tauri IPC Commands & Event Stream                      │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ JSON IPC / Binary Buffers
┌───────────────────────────────▼────────────────────────────────────────┐
│                        RUST AUDIO CORE BACKEND                         │
│                                                                        │
│  ┌────────────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │     Metadata Module    │  │ Loudness Engine│  │ Lossless MP3 Core│  │
│  │  `lofty` / `id3`       │  │ `symphonia` PCM│  │ MPEG Bitstream   │  │
│  │ (ID3, Vorbis, MP4, APE)│  │ + `ebur128` R128│ │ `global_gain` mod│  │
│  └────────────┬───────────┘  └────────┬───────┘  └────────┬─────────┘  │
│               │                       │                   │            │
│               └───────────────────────┼───────────────────┘            │
│                                       ▼                                │
│                   ┌──────────────────────────────────────┐             │
│                   │      Transaction & Safety Manager    │             │
│                   │  - Two-Phase Write (.tmp_<uuid>)     │             │
│                   │  - Journal: PREPARED -> COMMITTED    │             │
│                   │  - Pre-flight Sanity & Crash Recovery│             │
│                   └──────────────────┬───────────────────┘             │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       ▼
                       HỆ THỐNG TỆP TIN (FILE SYSTEM)
                      Windows NTFS / macOS APFS Storage
```

---

## 4. Danh mục Tiêu chuẩn & Thẻ Siêu dữ liệu Hỗ trợ

| Định dạng tệp | Thẻ siêu dữ liệu chính | Các trường hỗ trợ chuẩn hoá |
|---|---|---|
| **MP3 (`.mp3`)** | ID3v2.3 / ID3v2.4 & ID3v1, APEv2 | Title, Artist, Album, Album Artist, Track, Total Tracks, Year/Date, Genre, Composer, Comment, Lyrics, Cover Art, ReplayGain Tags, MP3Gain Undo Tags |
| **FLAC (`.flac`)** | Vorbis Comments | `TITLE`, `ARTIST`, `ALBUM`, `TRACKNUMBER`, `TRACKTOTAL`, `DATE`, `GENRE`, `METADATA_BLOCK_PICTURE`, `REPLAYGAIN_*` |
| **M4A / AAC (`.m4a`)** | MP4 iTunes Atoms | `©nam` (Title), `©ART` (Artist), `©alb` (Album), `trkn` (Track), `©day` (Year), `©gen` (Genre), `covr` (Cover), ReplayGain tags |
| **OGG / Opus** | Vorbis Comments | Tương tự FLAC |
| **WAV (`.wav`)** | RIFF INFO chunk & ID3v2 | Title, Artist, Album, Track, ReplayGain Tags |

---

## 5. Kế hoạch Tương thích Đa nền tảng (OS Compatibility Matrix)

- **macOS:** Hỗ trợ macOS 13 (Ventura), macOS 14 (Sonoma), macOS 15 (Sequoia) trên cả 2 kiến trúc Apple Silicon (`aarch64`) và Intel (`x86_64`).
- **Windows:** Hỗ trợ Windows 10 (1809+) và Windows 11 (x64). Xử lý đúng đường dẫn dài Windows (Long Paths `\\?\`), chuẩn mã hóa Unicode UTF-16 sang UTF-8.

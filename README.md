# VXmp3 — Lossless Audio Normalizer & Batch Tag Editor

> **Bộ công cụ xử lý siêu dữ liệu và chuẩn hóa âm lượng nhạc cá nhân siêu nhẹ, đa nền tảng (Windows & macOS).**  
> Thành viên trong hệ sinh thái [VXUtilities](../_summary/master_overview.md) thuộc `zTools`.

---

## 1. Giới thiệu tổng quan

**VXmp3** là tiện ích desktop giải quyết trọn vẹn hai nhu cầu thực tế và lặp lại nhiều nhất khi quản lý thư viện nhạc số ngoại tuyến (offline audio collection):
1. **Sửa siêu dữ liệu thẻ nhạc hàng loạt (Batch Tag Editor):** Xem dạng bảng tính, sửa trực tiếp các trường Title, Artist, Album, Year, Genre, Track, nhúng Cover Art; quy đổi hai chiều linh hoạt `Tên tệp ↔ Thẻ nhạc` và tự động đánh số thứ tự bài hát.
2. **Cân bằng âm lượng chuẩn không suy hao (Lossless Loudness Normalization):**
   - **Lossless MP3 Direct Frame Gain:** Can thiệp trực tiếp vào trường `global_gain` của từng khung dữ liệu MP3 (MPEG audio frame) theo thuật toán MP3Gain. Thay đổi âm lượng theo bước 1.5 dB mà **không giải mã PCM và nén lại**, bảo toàn 100% chất lượng âm thanh gốc, có thể hoàn tác (reversible) và tương thích hoàn toàn với mọi đầu phát phần cứng/loa xe hơi.
   - **ReplayGain 2.0 / EBU R128 Tagging:** Đo lường độ lớn âm thanh theo chuẩn công nghiệp (ITU-R BS.1770-4 / EBU R128) và ghi thẻ ReplayGain cho mọi định dạng hiện đại (FLAC, M4A/AAC, OGG, Opus, WAV, MP3).

Ứng dụng tuân thủ nghiêm ngặt tiêu chuẩn giao diện [master_theme.md](../_summary/master_theme.md), quy chuẩn desktop UI [desktop_ui_standards.md](../.agents/desktop_ui_standards.md) và tôn chỉ an toàn dữ liệu của zTools.

---

## 2. Điểm nổi bật & Triết lý sản phẩm

- **Cross-platform đồng nhất:** Chạy mượt mà, giao diện native sắc nét trên cả macOS (Apple Silicon & Intel) và Windows 11+ (x64).
- **Offline-first & Quyền riêng tư 100%:** Hoạt động cục bộ, không gửi bất kỳ siêu dữ liệu nào lên internet, không telemetry, không quảng cáo, không yêu cầu tài khoản.
- **An toàn dữ liệu tuyệt đối (Two-Phase Atomic Commit):** Mọi thao tác ghi tệp đều thực hiện qua tệp tạm `.tmp_<uuid>`, kiểm tra tính toàn vẹn (integrity check) rồi mới thay thế nguyên tử (atomic rename). Nhật ký thao tác (Operation Journal) ghi nhận lịch sử cho phép hoàn tác (Undo) an toàn.
- **Hiển thị trực quan trước khi thực thi (Safe Preview):** Bảng so sánh khác biệt thẻ (Tag Diff) và biểu đồ đo dB/cảnh báo vỡ tiếng (Clipping Warning) trước khi người dùng bấm Lưu.
- **Tích hợp trình phát thử nghiệm (Mini Audio Preview):** Nghe nhanh bài hát bằng phím Spacebar và bật/tắt so sánh âm lượng A/B tức thì.

---

## 3. Kiến trúc Công nghệ (Tech Stack)

| Tầng | Công nghệ | Vai trò đảm nhiệm |
|---|---|---|
| **Desktop Shell** | Tauri v2 (Rust) | Quản lý cửa sổ, menu native, phím tắt, giao tiếp hệ điều hành |
| **Frontend UI** | React 19 / 18 + Vite + TypeScript + Tailwind CSS | Giao diện bảng tính ảo hoá, thanh công cụ kính mờ, inspector |
| **Thiết kế** | Lucide Icons + VX Theme Tokens | Chuẩn Navy `#0f1117`, Electric Cyan `#06b6d4`, Amber `#fbbf24` |
| **Audio Metadata Core** | Rust Engine (`lofty`) | Đọc/ghi siêu dữ liệu ID3v1, ID3v2.3/v2.4, Vorbis, APEv2, MP4 atoms |
| **Audio Decoder Core** | Rust Engine (`symphonia`) | Giải mã đa định dạng (MP3, FLAC, M4A, WAV) sang dòng mẫu PCM phục vụ đo EBU R128 |
| **Loudness Engine** | Rust Engine (`ebur128` / ITU-R BS.1770) | Phân tích True Peak (dBTP), Integrated Loudness (LUFS) và ReplayGain scale |
| **Lossless MP3 Engine** | Rust Bitstream Frame Parser | Điều chỉnh trường `global_gain` trong MPEG Audio Layer III Side Information |
| **An toàn & Nhật ký** | Rust Two-Phase Transaction Manager | Ghi tệp tạm, fsync, ghi journal prepared, atomic replace, committed, hoàn tác JSONL |

---

## 4. Cấu trúc Tài liệu Đặc tả (Documentation Suite)

Bộ tài liệu đặc tả đầy đủ được tổ chức trong thư mục `docs/spec/` tuân theo chuẩn Product OS zTools:

- [vx_mp3_scope_v1_0.md](vx_mp3_scope_v1_0.md): Tài liệu phạm vi sản phẩm v1.0 (Product Scope & Use Cases).
- [00_system_overview.md](docs/spec/00_system_overview.md): Tổng quan kiến trúc hệ thống, ma trận độ khó kỹ thuật và giải pháp cốt lõi (`_spec0_system`).
- [01_business_process.md](docs/spec/01_business_process.md): Sơ đồ quy trình nghiệp vụ tổng thể Swimlane, các luồng nghiệp vụ cốt lõi (`_spec1_business_process`).
- [02_feature_flow.md](docs/spec/02_feature_flow.md): Luồng tính năng chi tiết, máy trạng thái, thuật toán Lossless Gain và Two-Phase Commit (`_spec2_feature_flow`).
- [03_ui_wireframe.md](docs/spec/03_ui_wireframe.md): Đặc tả wireframe giao diện, token màu sắc, bố cục bảng ảo hóa, thanh công cụ nổi và modal cài đặt (`_spec3_ui_wireframe`).
- [04_api_data.md](docs/spec/04_api_data.md): Hợp đồng giao tiếp IPC giữa Frontend và Rust Core, TypeScript interfaces và cấu trúc dữ liệu (`_spec4_api_data`).
- [05_qa_acceptance.md](docs/spec/05_qa_acceptance.md): Tiêu chuẩn nghiệm thu Gherkin và ma trận ca kiểm thử biên (Edge Cases) (`_spec5_qa_acceptance`).
- [06_demo_presentation.md](docs/spec/06_demo_presentation.md): Kịch bản trình diễn nghiệm thu 8 bước (Demo DoD Playbook) (`_spec6_demo_presentation`).

---

## 5. Lộ trình Triển khai Dự kiến

- **Phase 1 — Nạp tệp, Trình phát & Bảng siêu dữ liệu cơ bản:** Nạp thư mục nhạc, hiển thị bảng ảo hoá, đọc tag qua Rust `lofty`, nghe thử preview.
- **Phase 2 — Chỉnh sửa Thẻ hàng loạt & Quy đổi Tên tệp:** Sửa trực tiếp trên bảng, multi-edit inspector, tự động đánh số track, quy tắc `Filename ↔ Tag`.
- **Phase 3 — Phân tích Độ lớn & ReplayGain Tagging:** Tích hợp engine EBU R128, đo True Peak/LUFS, tính toán gain theo mốc mục tiêu (89 dB / 96 dB), ghi ReplayGain tags.
- **Phase 4 — Lossless MP3 Direct Frame Gain & Two-Phase Safety:** Triển khai thuật toán biến đổi `global_gain` lossless cho MP3, cơ chế journal hoàn tác, đóng gói bộ cài Windows/macOS.

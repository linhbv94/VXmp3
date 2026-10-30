# VXmp3 — Lossless Audio Normalizer & Batch Tag Editor

[![Release](https://img.shields.io/github/v/release/linhbv94/VXmp3?style=flat-square&color=06b6d4)](https://github.com/linhbv94/VXmp3/releases/latest)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-0284c7?style=flat-square)](https://github.com/linhbv94/VXmp3/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![Ecosystem](https://img.shields.io/badge/part%20of-VXUtilities-0ea5e9?style=flat-square)](../_summary/master_overview.md)

**VXmp3** là tiện ích desktop cá nhân siêu nhẹ, đa nền tảng (macOS & Windows), giải quyết trọn vẹn hai nhu cầu thực tế và lặp lại nhiều nhất khi quản lý thư viện nhạc số ngoại tuyến (offline audio collection):
1. **Sửa siêu dữ liệu thẻ nhạc hàng loạt (Batch Tag Editor):** Xem dạng bảng tính ảo hoá, sửa trực tiếp các trường Title, Artist, Album, Year, Genre, Track, nhúng Cover Art; quy đổi hai chiều linh hoạt `Tên tệp ↔ Thẻ nhạc` và tự động đánh số thứ tự bài hát.
2. **Cân bằng âm lượng chuẩn không suy hao (Lossless Loudness Normalization):**
   - **Lossless MP3 Direct Frame Gain:** Can thiệp trực tiếp vào trường `global_gain` của từng khung dữ liệu MP3 (MPEG audio frame) theo thuật toán MP3Gain. Thay đổi âm lượng theo bước 1.5 dB mà **không giải mã PCM và nén lại**, bảo toàn 100% chất lượng âm thanh gốc, có thể hoàn tác (reversible) và tương thích hoàn toàn với mọi đầu phát phần cứng/loa xe hơi.
   - **ReplayGain 2.0 / EBU R128 Tagging:** Đo lường độ lớn âm thanh theo chuẩn công nghiệp (ITU-R BS.1770-4 / EBU R128) và ghi thẻ ReplayGain cho mọi định dạng hiện đại (FLAC, M4A/AAC, OGG, Opus, WAV, MP3).

> **Tôn chỉ:** *An toàn dữ liệu tuyệt đối, chuẩn hóa âm lượng lossless không giải mã nén lại, 100% Offline-first.*  
> **Phiên bản hiện tại:** `v1.0.6` — Thành viên trong hệ sinh thái [VXUtilities](../_summary/master_overview.md).

---

## 1. Điểm nổi bật & Triết lý sản phẩm

* **Cross-platform đồng nhất:** Chạy mượt mà, giao diện native sắc nét trên cả macOS (Apple Silicon & Intel) và Windows 11+ (x64).
* **Offline-first & Quyền riêng tư 100%:** Hoạt động cục bộ, không gửi bất kỳ siêu dữ liệu nào lên internet, không telemetry, không quảng cáo, không yêu cầu tài khoản.
* **An toàn dữ liệu tuyệt đối (Two-Phase Atomic Commit):** Mọi thao tác ghi tệp đều thực hiện qua tệp tạm `.tmp_<uuid>`, kiểm tra tính toàn vẹn (integrity check) rồi mới thay thế nguyên tử (atomic rename). Nhật ký thao tác (Operation Journal) ghi nhận lịch sử cho phép hoàn tác (Undo) an toàn.
* **Hiển thị trực quan trước khi thực thi (Safe Preview):** Bảng so sánh khác biệt thẻ (Tag Diff) và biểu đồ đo dB/cảnh báo vỡ tiếng (Clipping Warning) trước khi người dùng bấm Lưu.
* **Tích hợp trình phát thử nghiệm (Mini Audio Preview):** Nghe nhanh bài hát bằng phím Spacebar và bật/tắt so sánh âm lượng A/B tức thì.
* **Tự động cập nhật trực tiếp (Auto-Update):** Tích hợp thông báo cập nhật góc dưới màn hình, tải và cài đặt phiên bản mới chỉ với 1-click.

---

## 2. Tải xuống & Cài đặt

Tải bản phát hành mới nhất dành cho hệ điều hành của bạn tại [GitHub Releases](https://github.com/linhbv94/VXmp3/releases/latest):

* **macOS (Apple Silicon & Intel):** Tải tệp `.dmg` hoặc `.app.tar.gz`. Kéo ứng dụng vào thư mục `/Applications`.
* **Windows (x64):** Tải bộ cài `.msi` hoặc tệp thực thi `.exe` độc lập.

---

## 3. Kiến trúc Công nghệ (Tech Stack)

| Tầng | Công nghệ | Vai trò đảm nhiệm |
|---|---|---|
| **Desktop Shell** | [Tauri v2](https://v2.tauri.app/) (Rust) | Quản lý cửa sổ, menu native, phím tắt, giao tiếp hệ điều hành |
| **Frontend UI** | React 19 + TypeScript + Vite + Tailwind CSS | Giao diện bảng tính ảo hoá, thanh công cụ kính mờ, inspector |
| **Thiết kế** | Lucide Icons + VX Theme Tokens | Chuẩn Navy `#0f1117`, Electric Cyan `#06b6d4`, Amber `#fbbf24` |
| **Audio Metadata Core** | Rust Engine (`lofty`) | Đọc/ghi siêu dữ liệu ID3v1, ID3v2.3/v2.4, Vorbis, APEv2, MP4 atoms |
| **Audio Decoder Core** | Rust Engine (`symphonia`) | Giải mã đa định dạng (MP3, FLAC, M4A, WAV) sang dòng mẫu PCM phục vụ đo EBU R128 |
| **Loudness Engine** | Rust Engine (`ebur128` / ITU-R BS.1770) | Phân tích True Peak (dBTP), Integrated Loudness (LUFS) và ReplayGain scale |
| **Lossless MP3 Engine** | Rust Bitstream Frame Parser | Điều chỉnh trường `global_gain` trong MPEG Audio Layer III Side Information |
| **An toàn & Nhật ký** | Rust Two-Phase Transaction Manager | Ghi tệp tạm, fsync, ghi journal prepared, atomic replace, committed, hoàn tác JSONL |

---

## 4. Hướng dẫn Phát triển & Biên dịch

### Yêu cầu môi trường
* Node.js ≥ 20.x và npm
* Rust & Cargo ≥ 1.80
* macOS: Xcode Command Line Tools (SDK 27.0 baseline) / Windows: C++ Build Tools

### Các lệnh phát triển
```bash
# Cài đặt thư viện frontend
npm install

# Khởi chạy chế độ phát triển
npm run tauri dev

# Biên dịch gói ứng dụng hoàn chỉnh (.app / .msi)
npm run build
npm run tauri build -- --bundles app
```

---

## 5. Cấu trúc Tài liệu Đặc tả (Documentation Suite)

Bộ tài liệu đặc tả đầy đủ được tổ chức trong thư mục `docs/spec/` tuân theo chuẩn Product OS VXUtilities:

- 📋 [vx_mp3_scope_v1_0.md](vx_mp3_scope_v1_0.md): Tài liệu phạm vi sản phẩm v1.0.
- 📋 [00_system_overview.md](docs/spec/00_system_overview.md): Tổng quan kiến trúc hệ thống, ma trận độ khó kỹ thuật và giải pháp cốt lõi.
- 🔄 [01_business_process.md](docs/spec/01_business_process.md): Sơ đồ quy trình nghiệp vụ tổng thể Swimlane, các luồng nghiệp vụ cốt lõi.
- ⚙️ [02_feature_flow.md](docs/spec/02_feature_flow.md): Luồng tính năng chi tiết, máy trạng thái, thuật toán Lossless Gain và Two-Phase Commit.
- 🎨 [03_ui_wireframe.md](docs/spec/03_ui_wireframe.md): Đặc tả wireframe giao diện, token màu sắc, bố cục bảng ảo hóa, thanh công cụ nổi và modal cài đặt.
- 🔌 [04_api_data.md](docs/spec/04_api_data.md): Hợp đồng giao tiếp IPC giữa Frontend và Rust Core, TypeScript interfaces và cấu trúc dữ liệu.
- 🧪 [05_qa_acceptance.md](docs/spec/05_qa_acceptance.md): Tiêu chuẩn nghiệm thu Gherkin và ma trận ca kiểm thử biên (Edge Cases).
- 🎬 [06_demo_presentation.md](docs/spec/06_demo_presentation.md): Kịch bản trình diễn nghiệm thu 8 bước (Demo DoD Playbook).

---

## 6. Giấy phép & Bản quyền (License)

Dự án được phân phối dưới giấy phép mã nguồn mở **MIT License**.  
Xem toàn văn giấy phép tại tệp [LICENSE](LICENSE).

Bản quyền © 2026 Viet Linh Bui. Đã đăng ký toàn bộ quyền.

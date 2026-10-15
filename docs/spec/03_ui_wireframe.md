# UI & Wireframe Specification: VXmp3 (`_spec3_ui_wireframe`)

> **Module:** Đặc tả Giao diện Người dùng, Bố cục Khung nhìn & Hệ thống Thành phần (UI Wireframe Specs)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Ngôn ngữ thiết kế:** Tuân thủ chuẩn [master_theme.md](../../../_summary/master_theme.md) và [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md) (VX Navy `#0f1117`, Electric Cyan `#06b6d4`, Amber `#fbbf24`)  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Cấu trúc Bố cục Toàn màn hình (Overall Layout Wireframe)

Giao diện ứng dụng được cấu trúc theo luồng làm việc chuẩn:
1. **Top Window Bar (32px chuẩn hoá zTools):** Tích hợp tiêu đề, kéo thả cửa sổ, menu OS (Mac/Win) và nút Cài đặt.
2. **Top Control Bar (Thanh điều khiển trung tâm ngay dưới Titlebar):**
   - Nút `[📂 Mở thư mục (Open Folder)]` (kèm phím tắt `Cmd/Ctrl+O`).
   - Ô thiết lập mức âm lượng chuẩn: `Âm lượng chuẩn: [ 89.0 ] dB SPL` (cho phép nhập số hoặc chỉnh nhanh 89.0 / 92.0 / 96.0).
   - Nút `[⚡ Đo âm lượng]` (Track Analysis EBU R128).
   - Nút `[🔊 1-Click Cân bằng]` (Áp dụng ngay Lossless MP3 Gain về mức chuẩn đã setup).
   - Nút `[💾 Lưu thay đổi (Cmd+S)]` (Chủ động ghi thẻ và thay đổi xuống đĩa).
   - Bộ chuyển đổi góc nhìn: `[Chế độ: Đầy đủ | Thẻ nhạc | MP3Gain View]`.
   - Ô tìm kiếm / lọc nhanh: `[🔍 Lọc bài hát...]`.
3. **Left / Center Detail Item List (Bảng danh sách bài hát ảo hóa):**
   - Chiếm phần lớn diện tích màn hình bên trái.
   - Hiển thị các cột: File Name, Tag Version (ID3v2.3, ID3v2.4, ID3v1, APEv2, Vorbis), Title, Artist, Album, Track, Year, Genres, Âm lượng hiện tại (Volume dB), Gain chênh lệch, Cảnh báo vỡ tiếng (Clipping).
   - Hỗ trợ thao tác Inline Edit giống hệt Finder/Explorer (click ô metadata để chọn bài và sửa ngay; click tên tệp để chọn hàng; `F2` sửa Title; `Enter/Shift+Enter` xuống/lên hàng; `Tab/Shift+Tab` sang phải/trái).
4. **Right Sidebar (Detail Inspector Panel):**
   - Độ rộng cố định `280px` bên phải màn hình (hành vi giống Inspector/Preview Pane của Finder/Explorer).
   - Khi click vào từng item bên danh sách: Sidebar hiển thị toàn bộ thông tin chi tiết dưới dạng các **Text Box có thể chỉnh sửa trực tiếp**.
   - Khung Cover Art: Cho phép **Thay thế (Replace)**, **Gỡ bỏ (Remove)**, hoặc **Thêm mới (Add)** qua kéo thả hoặc nút bấm.
   - Nút `[Lưu tệp này]` hoặc bấm `Cmd/Ctrl+S` chung để commit xuống file đĩa.
5. **Bottom Dock / Mini Player:**
   - Trình phát nghe thử tức thì qua phím `Space`.
   - Scrubber tua nhạc, volume và nút gạt `[A/B Gain: BẬT/TẮT]` để đối chiếu trước/sau khi cân bằng.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [●][●][●]  🎵 VXmp3 — [/Music/US_UK_Hits]   (85 tệp · 640 MB)             [⚙️ Cài đặt] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [📂 Mở thư mục]  Âm lượng chuẩn: [ 89.0 ] dB  [⚡ Đo dB]  [🔊 1-Click Cân bằng] [💾 Lưu]│
│ [🔍 Lọc nhanh...]  Chế độ: [⊞ Đầy đủ] [🏷️ Thẻ nhạc] [🎚️ MP3Gain View]   Đã chọn: 1 bài │
├──────────────────────────────────────────────────────────────────────────┬─────────────┤
│ Tên tệp         | Thẻ    | Tiêu đề       | Nghệ sĩ   | Album     | dB Gốc │ ℹ️ SIDEBAR  │
├──────────────────────────────────────────────────────────────────────────┤ ┌─────────┐ │
│ 01_intro.mp3    | ID3v2.4| Intro         | The Weeknd| After H...| 94.5 dB│ │[Cover]  │ │
│ 02_blinding.mp3 | ID3v2.3| Blinding Ligh | The Weeknd| After H...| 96.8 dB│ │ 800x800 │ │
│ 03_save_tears...| ID3v2.3| Save Your Tea | The Weeknd| After H...| 89.2 dB│ └─────────┘ │
│ 04_in_your_ey...| ID3v2.4| In Your Eyes  | The Weeknd| After H...| 86.0 dB│ [Đổi] [Xóa] │
│ 05_heartless.mp3| ID3v2.3| Heartless     | The Weeknd| After H...| 97.2 dB│ Tiêu đề:    │
│ ... (cuộn ảo hoá siêu mượt hàng ngàn bài hát) ...                        │ [Intro    ] │
│                                                                          │ Nghệ sĩ:    │
│                                                                          │ [The Weeknd]│
│                                                                          │ Album:      │
│                                                                          │ [After H...]│
│                                                                          │ Track:      │
│                                                                          │ [ 01 / 14 ] │
│                                                                          │ Thể loại:   │
│                                                                          │ [Synthwave] │
│                                                                          │ [💾 Lưu tệp]│
├──────────────────────────────────────────────────────────────────────────┴─────────────┤
│ [▶] [01:12 / 03:20] [━━━━━━━●━━━━━━━━━━━━━━━━━━] 🔊 [━━━●━] [A/B Gain: BẬT]  Sẵn sàng  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Đặc tả Các Phân vùng & Tương tác Chi tiết

### 2.1. Top Control Bar & Cân bằng Âm lượng MP3Gain 1-Click
- **Ô thiết lập mức âm lượng chuẩn:** Input số cho phép người dùng gõ trực tiếp mức dB mục tiêu (mặc định `89.0` theo chuẩn MP3Gain / ReplayGain), có 2 nút tăng giảm `+ / -` bước 0.5 dB và dropdown chọn nhanh các mốc phổ biến (`89.0 dB`, `92.0 dB`, `95.0 dB`, `96.0 dB`).
- **Nút `[⚡ Đo âm lượng]`:** Quét phân tích EBU R128 song song cho toàn bộ hoặc các bài đang chọn, điền kết quả vào cột `dB Gốc` và tính `Gain chênh lệch`.
- **Nút `[🔊 1-Click Cân bằng]`:** 
  - Kích hoạt quy trình chuẩn hóa hàng loạt ngay lập tức về mức âm lượng chuẩn đã setup trên controlbar.
  - Áp dụng thuật toán **Lossless MP3 Direct Frame Gain** (MP3Gain parity): điều chỉnh trường `global_gain` trong MPEG frame, không decode/re-encode, có ghi thẻ hoàn tác `MP3GAIN_UNDO`.
- **Nút `[💾 Lưu (Cmd+S)]`:** Sáng màu Electric Cyan khi có thay đổi thẻ đang chờ (Pending Diff). Bấm nút hoặc nhấn phím tắt để commit an toàn xuống đĩa.

### 2.2. Left / Main Detail Item List & Hành vi Inline Edit chuẩn Finder/Explorer
- **Bảng cột:** File Name, Tag Version, Title, Artist, Album, Track, Year, Genres, Thời lượng, Âm lượng hiện tại (dB), Gain cần chỉnh (dB), Clipping Warning (`⚠️`).
- **Cơ chế tương tác Inline Edit chuẩn Desktop:**
  1. **Click 1:** Chọn dòng (Select row) và hiển thị thông tin chi tiết sang Right Sidebar.
  2. **Click 2 (vào ô text sau khoảng cách ~300ms, hoặc bấm phím `F2` / `Enter`):** Kích hoạt ô nhập liệu Inline Input ngay tại ô đó. Toàn bộ chữ trong ô được bôi đen sẵn sàng để gõ đè hoặc sửa.
  3. **Phím điều hướng chuyển ô:**
     - `Enter`: Chấp nhận giá trị vừa gõ và **chuyển con trỏ xuống ô bên dưới cùng cột** (hành vi chuẩn Excel / Finder rename danh sách).
     - `Shift + Enter`: Chấp nhận giá trị và **chuyển con trỏ lên ô bên trên cùng cột**.
     - `Tab`: Chấp nhận giá trị và **chuyển sang ô bên phải trong cùng hàng** (ví dụ từ Title sang Artist sang Album).
     - `Shift + Tab`: Chấp nhận giá trị và **chuyển sang ô bên trái trong cùng hàng**.
     - `Escape`: Hủy thao tác gõ, phục hồi lại giá trị trước khi kích hoạt edit.
  4. **Cơ chế Lưu An toàn (Staged In-Memory Pending + Chủ động Lưu):**
     - **Quyết định thiết kế:** Khi người dùng bấm `Enter` hoặc `Tab`, giá trị mới được **chấp nhận vào bộ nhớ tạm (In-memory Staged State)** và ô đó được đánh dấu viền sáng màu Cyan. Hệ thống **tuyệt đối KHÔNG ghi ngay xuống đĩa sau từng phím Tab/Enter**.
     - **Lý do kỹ thuật & UX:**
       + Tránh nghẽn đĩa I/O (Disk Bottleneck) và độ trễ: Mỗi lần ghi đĩa phải parse header, ghi file tạm `.tmp_<uuid>`, fsync, atomic rename. Nếu auto-save sau mỗi phím Tab, người dùng gõ nhanh 10 bài sẽ làm app bị giật khựng liên tục, đặc biệt trên USB/ổ cứng ngoài.
       + Người dùng có thể thoải mái Tab/Enter sửa liên tục một mạch 20 bài với độ trễ 0ms cực kỳ đã tay.
       + Giữ quyền kiểm soát và khả năng xem trước (Preview Diff): Người dùng xem lại các ô đổi màu Cyan rồi mới bấm `[💾 Lưu]` hoặc nhấn `Cmd/Ctrl+S` để hệ thống ghi một mẻ an toàn.
       + *(Tùy chọn mở rộng)*: Trong Settings có checkbox `"Tự động lưu khi rời ô (Auto-save on edit exit)"` dành cho ai thích tự động hoàn toàn.

### 2.3. Right Sidebar (Detail Item Inspector)
- **Hành vi:** Khi người dùng click chọn bất kỳ bài hát nào bên danh sách, Right Sidebar lập tức nạp và hiển thị toàn bộ thuộc tính chi tiết.
- **Biểu mẫu Text Box chỉnh sửa:**
  - Tiêu đề (`Title`), Nghệ sĩ (`Artist`), Album (`Album`), Nghệ sĩ Album (`Album Artist`), Năm (`Year`), Thể loại (`Genre`), Track (`[Track] / [Total]`), Đĩa (`[Disc] / [Total]`), Bình luận (`Comment`), Lời bài hát (`Lyrics`).
  - Toàn bộ là các ô Text Box có thể click vào chỉnh sửa trực tiếp.
- **Quản lý Ảnh bìa (Cover Art Box):**
  - Khung vuông xem trước ảnh bìa hiện tại.
  - Nút `[Thay ảnh (Replace)]`: Mở file picker chọn ảnh JPG/PNG/WebP.
  - Nút `[Gỡ bỏ (Remove)]`: Xóa ảnh bìa nhúng khỏi tệp.
  - Hỗ trợ kéo thả trực tiếp tệp ảnh từ Finder/Explorer vào khung để thêm/thay thế tức thì.
- **Nút Lưu cục bộ:** Nút `[💾 Lưu tệp này]` ở cuối sidebar (hoặc phím `Cmd/Ctrl+S`) để ghi các trường vừa sửa vào tệp đang chọn.
- **Khi chọn nhiều bài (Multi-selection):**
  - Sidebar chuyển sang chế độ **Batch Edit**: Các trường có giá trị khác nhau giữa các bài hát được chọn sẽ hiện placeholder `<Nhiều giá trị>`. Khi người dùng nhập vào trường nào (ví dụ đổi Artist = `The Weeknd`), trường đó sẽ được áp dụng cho toàn bộ các bài đang chọn.

### 2.4. Khảo sát Chuyên sâu MP3Gain trên Windows & Hợp nhất Module
- **Phân tích MP3Gain trên Windows:**
  - MP3Gain nổi tiếng nhờ 3 thứ: (1) Cực nhẹ và cực nhanh, (2) Nút 1-click Radio/Track Gain đưa toàn bộ bài về mức `89.0 dB`, (3) Khả năng hoàn tác qua thẻ `MP3GAIN_UNDO`.
  - Tuy nhiên, MP3Gain rất yếu về sửa tag: Nó không cho sửa Title, Artist, không xem được cover art, không đổi tên file.
- **Quyết định Hợp nhất Module (Unified View vs Separate Tabs):**
  - **Quyết định:** **GỘP CHUNG trên cùng một danh sách tệp**, không tách thành 2 tab rời rạc!
  - **Lý do cốt lõi:**
    + Trải nghiệm người dùng liền mạch: Khi kéo thả một thư mục nhạc vào app, người dùng chỉ nạp một lần. Việc vừa nhìn thấy Tên bài hát, Nghệ sĩ, vừa nhìn thấy cột Âm lượng dB và trạng thái Clipping ngay bên cạnh giúp nắm bắt toàn diện tình trạng thư viện nhạc.
    + Không bắt người dùng phải "Open Folder" ở Tab 1, rồi lại click sang Tab 2 làm thao tác tương tự.
  - **Giải pháp tối ưu không gian (View Switcher Presets):**
    Cung cấp bộ 3 nút chuyển chế độ xem nhanh ngay trên Top Controlbar:
    1. `[⊞ Đầy đủ (All Columns)]`: Hiển thị trọn vẹn cả thông tin thẻ và các cột âm lượng.
    2. `[🏷️ Thẻ nhạc (Tag View)]`: Ẩn bớt các cột Gain chuyên sâu, tập trung vào Metadata.
    3. `[🎚️ MP3Gain View]`: Ẩn bớt các cột Tag phụ, tái hiện giao diện kinh điển của MP3Gain (File Name, Volume dB, Target dB, Gain dB, Clipping Risk `⚠️`, MP3 Change Steps).

---

## 3. Cấu trúc Modal Cài đặt Chuẩn hóa (Settings Modal Specs)

Tuân thủ nghiêm ngặt quy chuẩn cấu trúc Settings tại [desktop_ui_standards.md](../../../.agents/desktop_ui_standards.md):
- Chiều rộng `max-w-2xl` (672px), chiều cao tối đa `calc(100dvh - 32px)`.
- Header có thuộc tính kéo thả cửa sổ `data-tauri-drag-region`.
- Sidebar trái có chiều rộng `w-48` (192px), chia làm 2 nhóm ngăn cách bởi đường kẻ mờ:

### 3.1. Nhóm 1: Tính năng Cốt lõi (Core Settings)
1. **Cài đặt Chung (General):** Khởi động cùng hệ thống, ngôn ngữ giao diện (Tiếng Việt / English), chủ đề (Dark / Light / Hệ thống).
2. **Cân bằng Âm lượng (Loudness & Gain):**
   - Mức âm lượng mục tiêu mặc định: Radio chọn giữa `89.0 dB SPL (Khuyến nghị chuẩn ReplayGain)` và `96.0 dB SPL (Âm lượng lớn)`.
   - Phương thức chuẩn hóa mặc định cho MP3: Radio chọn giữa `Lossless MP3 Frame Gain (MP3Gain style)` và `ReplayGain Metadata Tagging`.
   - Cảnh báo vỡ tiếng: Checkbox bật cảnh báo khi dự báo True Peak vượt `0.0 dBTP`.
3. **Quy tắc Thẻ & Tên tệp (Tag & Filename Rules):**
   - Mẫu đổi tên mặc định (ví dụ: `%track% - %artist% - %title%`).
   - Tùy chọn chuẩn hóa chữ: Title Case, UPPERCASE, giữ nguyên.
4. **Phím tắt (Shortcuts):** Bảng xem và tùy biến phím tắt.

### 3.2. Nhóm 2: Thông tin & Hỗ trợ (Information & Support)
5. **Cập nhật (Updates):**
   - Tab độc lập, hiển thị phiên bản hiện tại, nút *Kiểm tra bản cập nhật mới* từ GitHub Releases, và trạng thái tải/cài đặt tự động.
6. **Giới thiệu (About):**
   - Icon ứng dụng VXmp3, tên ứng dụng, phiên bản chính thức, tác giả Bùi Việt Linh, link GitHub repository, công nghệ nền tảng (Tauri v2, Rust, React, `lofty`, `symphonia`, `ebur128`).
7. **Ủng hộ tác giả (Support Author):**
   - Menu cuối cùng của sidebar với icon `Coffee` màu Amber ấm áp.
   - Nội dung tối giản: Lời cảm ơn chân thành và **card mã QR VietQR (Vietcombank) nền trắng sắc nét đặt ở vị trí trung tâm**, tối ưu để quét trực tiếp từ app ngân hàng trên điện thoại (loại bỏ thông tin số tài khoản và nút copy STK rườm rà).

---

## 4. Checklist Thẩm định Giao diện (Design Consistency Checklist)

- [ ] **Nền chuẩn:** Sử dụng nền Navy `#0f1117` cho Dark mode, `#f8fafc` cho Light mode; không dùng đen tuyền `#000000`.
- [ ] **Màu Accent:** Sử dụng Cyan (`cyan-400`/`cyan-500`) làm màu tương tác chủ đạo, Amber cảnh báo clipping, Emerald thông báo thành công.
- [ ] **Kính mờ:** Mọi panel, inspector và thanh nổi dùng `.glass-panel` với `backdrop-filter: blur(16px)`.
- [ ] **Font chữ:** Phông hệ thống cho chữ thường; phông `font-mono text-[10px]` hoặc `text-[11px]` cho thời lượng, bitrate, số dB và nhãn phím tắt.
- [ ] **Titlebar:** Chiều cao đúng 32px, bố cục Mac/Win đúng chuẩn, Windows không bị double titlebar.
- [ ] **Floating Action Bar Tooltips:** Đầy đủ tooltip có phím tắt cho tất cả nút thao tác hàng loạt.
- [ ] **Settings Modal:** Đúng cấu trúc 2 nhóm với 3 tab riêng biệt (Updates, About, Support Author có QR Vietcombank căn giữa).

## Điều chỉnh hành vi 2026-10-14
- “Cân bằng cả list” luôn xử lý toàn bộ MP3 trong list, không phụ thuộc selection. Các định dạng khác được bỏ qua.
- Backend đo PCM bằng Symphonia + EBU R128 trước cân bằng và UI đọc lại file sau cân bằng; không dùng số dB cũ từ UI/thẻ ReplayGain.
- Cmd/Ctrl+A chọn toàn bộ bài khi focus ngoài input; trong input vẫn chọn văn bản.
- Cmd/Ctrl+S lưu cả ô inline đang nhập. Save/gain/measure/Undo được khóa tránh chạy chồng; bản nháp lỗi vẫn giữ để sửa/lưu lại.
- Bảng có cuộn ngang đồng bộ header/body để edit các cột bên phải ở cửa sổ nhỏ.

### UX progress và selection 2026-10-14
- Hai action riêng: Cân bằng cả list / Cân bằng đã chọn (N). Hoàn tác dùng icon Undo và nhãn text.
- Cột dB hiện tại: badge số + mức; khi đo fill theo decoded frames, hiện số tạm tính + phần trăm. Cột mục tiêu: tương tự khi cân bằng, giữ số target, hiện lý do nếu giới hạn/lỗi.
- Thanh progress tổng 2px dưới toolbar, kèm completed/total, % và bài/stage đang xử lý. Cho cuộn/view list lúc xử lý, không cho sửa metadata hoặc chạy mutation chồng.


## Hiệu chỉnh traffic lights macOS — 2026-10-15

Giữ control native và action hiện có, đường kính hiển thị 12pt, khoảng cách tâm 20pt. Frame và bounds phải giữ cùng kích thước/tỷ lệ native, gồm padding: không ép frame12×12 hay ép bounds vuông. SDK15.5 có bezel12×12 trong frame/bounds14×16. Lấy geometry chuẩn từ NSWindow.standardWindowButton:forStyleMask: và chỉ đổi origin; kiểm tra lại sau focus/resize. VXmp3 giữ Zoom native hoạt động; không đổi engine, quyền OS hoặc updater.


### Căn tâm dọc traffic lights theo toolbar — 2026-10-15

Toolbar 32px: tâm control native trùng tâm toolbar tại y=15.5pt từ đỉnh content view (vùng flex 31px sau divider dưới 1px). Chuyển điểm từ content view sang superview của nút bằng AppKit convertPoint:fromView:, xử lý cả hệ tọa độ flipped/non-flipped. Không giữ center frame native cũ hoặc suy vị trí từ chiều cao superview titlebar. Giữ frame/bounds native cùng padding, không scale và giữ khoảng cách tâm ngang hiện có; áp dụng lại khi focus/resize.


### Kích thước bezel và padding native — 2026-10-15

12pt là đường kính bezel hiển thị, không phải kích thước NSButton view. Artifact GitHub hiện tại dùng SDK15.5: AppKit frame/bounds14×16, bezel12×12; ép frame12×12 với bounds14×14 làm bezel co còn khoảng10×10. Khôi phục frame/bounds/controlSize từ reference native cùng style mask rồi chỉ căn vị trí theo toolbar. Không suy kích thước từ bounds đã bị thay đổi ở lần focus trước. SDK26 có metrics khác; QA cần cùng SDK/profile với artifact phát hành.

# Demo Presentation Playbook: VXmp3 (`_spec6_demo_presentation`)

> **Module:** Kịch bản Trình diễn & Nghiệm thu Tính năng (Demo DoD Walkthrough Script)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Kịch bản Trình diễn Nghiệm thu 8 Bước (DoD Walkthrough Script)

Kịch bản demo được thiết kế nhằm chứng minh toàn bộ các giá trị cốt lõi của **VXmp3** đã được hiện thực hóa trọn vẹn, sẵn sàng bàn giao cho người dùng kiểm chứng:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        LỘ TRÌNH DEMO TÍNH NĂNG                         │
├─────────┬──────────────────────┬───────────────────────────────────────┤
│ Bước    │ Hành động Người dùng │ Kết quả Kỳ vọng (Evidence)            │
├─────────┼──────────────────────┼───────────────────────────────────────┤
│ Bước 1  │ Mở thư mục nhạc mẫu  │ 100 bài hát nạp tức thì trong < 1s;   │
│         │ hỗn hợp (MP3, FLAC)  │ bảng hiển thị đầy đủ cột metadata.    │
│ Bước 2  │ Bấm Space nghe thử   │ Mini Player phát nhạc ngay, seekbar   │
│         │ bài hát bất kỳ       │ mượt mà, hiển thị thời gian chính xác.│
│ Bước 3  │ Bấm "Phân tích độ    │ Quét EBU R128; hiển thị cột dB gốc    │
│         │ lớn âm lượng"        │ (84.0 - 98.0 dB) và cảnh báo Clipping.│
│ Bước 4  │ Chọn 10 bài, sửa thẻ │ Inspector cập nhật đồng loạt; nút     │
│         │ & Đánh số track      │ "Đánh số track" điền 01 - 10 tự động. │
│ Bước 5  │ Kéo thả nhúng ảnh bìa│ Khung ảnh hiển thị ảnh bìa mới; tối ưu│
│         │ album vào Inspector  │ dung lượng ảnh gọn nhẹ khi lưu.       │
│ Bước 6  │ Áp dụng Lossless MP3 │ Biến đổi `global_gain` lossless; âm   │
│         │ Gain về mốc 89.0 dB  │ lượng được chuẩn hoá, không re-encode.│
│ Bước 7  │ Bật/tắt nút A/B Gain │ Cảm nhận rõ rệt sự cân bằng âm lượng  │
│         │ trong Mini Player    │ trước và sau khi chuẩn hóa.           │
│ Bước 8  │ Đổi tên tệp từ thẻ & │ Tên file đổi chuẩn `%track% - %title%`│
│         │ Thử phím tắt Undo    │ Phím `Cmd+Z` hoàn tác an toàn 100%.   │
└─────────┴──────────────────────┴───────────────────────────────────────┘
```

---

## 2. Các Bước Thực hiện Chi tiết

### Bước 1: Khởi động & Nạp Thư mục Nhạc Mẫu
1. Mở ứng dụng **VXmp3**.
2. Kéo thả thư mục `Sample_Music` chứa 100 tệp âm thanh vào cửa sổ ứng dụng (hoặc bấm nút "Mở thư mục" trên thanh công cụ).
3. **Quan sát:**
   - Bảng tính ảo hóa xuất hiện ngay lập tức với danh sách 100 bài hát.
   - Các cột Tiêu đề, Nghệ sĩ, Album, Định dạng, Thời lượng hiển thị sắc nét.
   - Thanh trạng thái đáy hiển thị: `100 bài hát · 620 MB`.

### Bước 2: Nghe thử Tức thì qua Phím Spacebar
1. Dùng phím mũi tên `↓` để di chuyển con trỏ tiêu điểm đến bài hát số 3.
2. Nhấn phím `Space`.
3. **Quan sát:**
   - Mini Player ở chân màn hình bắt đầu phát nhạc ngay lập tức mà không có độ trễ.
   - Nhấp chuột vào giữa thanh tiến trình (timeline scrubber): Âm thanh nhảy tới đoạn tương ứng mượt mà.
   - Nhấn lại phím `Space`: Nhạc tạm dừng ngay tức khắc.

### Bước 3: Phân tích Độ lớn Âm lượng EBU R128
1. Bấm nút **Phân tích âm lượng (Analyze Loudness)** trên thanh công cụ.
2. **Quan sát:**
   - Thanh tiến trình quét hiển thị phần trăm hoàn thành tăng dần từ `0%` đến `100%`.
   - Cột `dB Gốc` được điền các chỉ số đo đạc thực tế (ví dụ: bài số 1 là `96.5 dB`, bài số 2 là `85.2 dB`).
   - Cột `Gain` tự động tính toán mức chênh lệch so với mốc mục tiêu `89.0 dB` (ví dụ: `-7.5 dB` và `+3.8 dB`).
   - Các bài hát có nguy cơ vỡ tiếng hiển thị biểu tượng tam giác cảnh báo màu Amber `⚠️`.

### Bước 4: Sửa Thẻ Hàng loạt & Đánh số Thứ tự Tự động
1. Giữ phím `Shift` và nhấp chuột chọn 10 bài hát đầu tiên.
2. Thanh Floating Action Bar xuất hiện ở đáy bảng: `Đã chọn: 10 bài`.
3. Trong Inspector Panel bên phải, nhập thông tin:
   - `Nghệ sĩ`: `Vũ`
   - `Album`: `Bảo Tàng Của Nuối Tiếc`
   - `Năm`: `2024`
4. Bấm nút **Đánh số track (Auto-track Numbering)** trên thanh Floating Action Bar.
5. **Quan sát:**
   - Cột `#` của 10 bài được điền tự động từ `01` đến `10`.
   - Cột Nghệ sĩ và Album của cả 10 bài đều hiển thị giá trị mới kèm chấm tròn Cyan báo hiệu thay đổi đang chờ lưu.

### Bước 5: Kéo thả Nhúng Ảnh bìa Album
1. Kéo thả tệp ảnh `cover_artwork.jpg` vào khung ảnh bìa trong Inspector Panel.
2. **Quan sát:**
   - Ảnh bìa xuất hiện sắc nét trong khung xem trước.
   - Cột thumbnail `🖼️` trên bảng của 10 bài hát đồng loạt cập nhật hình ảnh thu nhỏ mới.

### Bước 6: Áp dụng Cân bằng Âm lượng Lossless MP3 Gain
1. Với các bài hát MP3 đang chọn, bấm nút **Áp dụng Gain (Ctrl+G)**.
2. Bảng xác nhận hiển thị tóm tắt:
   - Phương thức: `Lossless MP3 Direct Frame Gain (Không nén lại)`.
   - Mốc âm lượng: `89.0 dB SPL`.
3. Bấm **Xác nhận Áp dụng**.
4. **Quan sát:**
   - Lõi Rust can thiệp bitstream `global_gain` trong vòng chưa đầy 1 giây.
   - Cột `dB Gốc` cập nhật về mức `89.0 dB`.
   - Mở tệp bằng phần mềm kiểm tra phổ âm thanh: Dạng sóng được co nhỏ tỷ lệ hoàn hảo, không có bất kỳ hiện tượng biến dạng phổ tần số hay nén lại.

### Bước 7: Kiểm chứng Nghe thử So sánh A/B trong Mini Player
1. Chọn phát lại bài hát vừa chuẩn hóa gain.
2. Nhấn nút pill `[A/B Gain: BẬT]` để chuyển sang `[A/B Gain: TẮT]`.
3. **Quan sát:**
   - Người dùng nghe rõ sự khác biệt: Âm thanh chuyển về mức âm lượng gốc ban đầu.
   - Nhấn bật lại `[A/B Gain: BẬT]`: Âm lượng trở về mức 89.0 dB êm dịu, chứng minh hiệu quả cân bằng âm lượng trực quan.

### Bước 8: Đổi tên Tệp từ Thẻ & Thử nghiệm Hoàn tác (Undo)
1. Bấm nút **Đổi tên tệp từ thẻ** trên thanh nổi.
2. Áp dụng mẫu định dạng: `%track% - %artist% - %title%`.
3. Bấm **Xác nhận đổi tên**: Tên tệp trên ổ đĩa chuyển thành `01 - Vũ - Binh Yen.mp3`.
4. Nhấn phím `Cmd/Ctrl + Z` để kích hoạt hoàn tác:
   - Hệ thống hiển thị thông báo "Đã hoàn tác giao dịch đổi tên thành công".
   - Tên tệp trên đĩa được trả về đúng tên gốc ban đầu.

---

## 3. Bảng Tiêu chí Nghiệm thu Thực tế (Evidence Checklist)

| Tiêu chí | Trạng thái kiểm chứng | Ghi chú |
|---|:---:|---|
| Khởi động nhanh, nạp thư mục mượt mà | Chưa kiểm chứng | Chờ scaffold & đo tốc độ với 1,000 tệp |
| Sửa thẻ đơn lẻ & hàng loạt | Chưa kiểm chứng | Chờ scaffold & kiểm thử với lofty |
| Đánh số track tự động | Chưa kiểm chứng | Chờ kiểm chứng logic auto-numbering |
| Nhúng ảnh bìa gọn nhẹ | Chưa kiểm chứng | Chờ kiểm chứng nén JPEG thumbnail |
| Phân tích âm lượng EBU R128 chuẩn mực | Chưa kiểm chứng | Chờ tích hợp symphonia + ebur128 |
| Biến đổi Gain Lossless tuyệt đối cho MP3 | Chưa kiểm chứng | Chờ kiểm chứng parser MPEG side info & bitstream hash |
| Cơ chế Two-Phase Write an toàn | Chưa kiểm chứng | Chờ kiểm chứng crash injection phase PREPARED/COMMITTED |
| Hoàn tác (Undo) qua Operation Journal | Chưa kiểm chứng | Chờ kiểm thử hoàn tác thẻ và MP3GAIN_UNDO |
| Settings modal chuẩn zTools | Chưa kiểm chứng | Chờ dựng UI React với Master Theme |

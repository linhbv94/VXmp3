# QA & Acceptance Criteria Specification: VXmp3 (`_spec5_qa_acceptance`)

> **Module:** Tiêu chuẩn Nghiệm thu & Ma trận Ca Kiểm thử Biên (Acceptance Criteria & Edge Cases)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Tiêu chuẩn Nghiệm thu Chức năng (Gherkin Acceptance Criteria)

### AC-01: Nạp Thư mục Nhạc Lớn & Hiển thị Bảng Ảo hóa
```gherkin
Given người dùng đang mở cửa sổ ứng dụng VXmp3
When người dùng kéo thả một thư mục chứa 1,000 bài hát hỗn hợp (MP3, FLAC, M4A, WAV) vào cửa sổ
Then toàn bộ 1,000 bài hát xuất hiện trên bảng trong vòng dưới 1 giây
And các thông tin cơ bản (Tên tệp, Thời lượng, Định dạng, Bitrate) hiển thị đầy đủ
And thanh trạng thái hiển thị đúng "1,000 bài hát · Dung lượng tổng"
And người dùng có thể cuộn danh sách từ đầu đến cuối mượt mà, không xảy ra hiện tượng giật lag hay tràn RAM.
```

### AC-02: Chỉnh sửa Thẻ Siêu dữ liệu Đơn lẻ Trực tiếp
```gherkin
Given danh sách bài hát đang hiển thị trên bảng
When người dùng nhấp đúp chuột vào ô "Tiêu đề" của bài hát số 1 và nhập "Nơi Này Có Anh"
And người dùng chuyển sang Inspector Panel nhập "Năm: 2024", "Thể loại: Pop"
Then ô trên bảng xuất hiện ký hiệu chấm màu Cyan báo hiệu thay đổi chưa lưu
And tiêu đề ứng dụng hiển thị dấu sao "*"
When người dùng nhấn phím "Cmd/Ctrl + S"
Then tệp đĩa được cập nhật thông tin thẻ mới qua cơ chế Two-Phase an toàn
And thông báo Toast "Đã lưu thay đổi thẻ thành công" xuất hiện trong 2 giây.
```

### AC-03: Chỉnh sửa Thẻ Hàng loạt (Batch Tagging)
```gherkin
Given danh sách có 20 bài hát thuộc cùng một album
When người dùng nhấn "Cmd/Ctrl + A" để chọn toàn bộ 20 bài hát
Then thanh Floating Action Bar xuất hiện ở đáy bảng với nội dung "Đã chọn: 20 bài"
And Inspector Panel bên phải hiển thị nhãn "Đang chọn 20 bài hát"
When người dùng nhập "Nghệ sĩ: Vũ" và "Album: Bảo Tàng Của Nuối Tiếc"
And nhấn nút "Lưu thay đổi"
Then toàn bộ 20 tệp trên đĩa đều được cập nhật cùng thông tin Nghệ sĩ và Album đó
And khi mở bằng ứng dụng khác (Apple Music, Foobar2000, Windows Media Player) thông tin được hiển thị chính xác.
```

### AC-04: Đánh số Thứ tự Track Tự động (Auto-track Numbering)
```gherkin
Given người dùng đã chọn 15 bài hát theo thứ tự mong muốn
When người dùng nhấn nút "Đánh số track" trên Floating Action Bar
And chọn số bắt đầu là "1", định dạng "01, 02...", có tick "Cập nhật tổng số track"
Then bài hát đầu tiên được gán Track = "01 / 15", bài thứ hai là "02 / 15", đến bài cuối là "15 / 15"
And các thay đổi được đưa vào trạng thái Pending sẵn sàng để lưu.
```

### AC-05: Nhúng & Trích xuất Ảnh bìa (Cover Art)
```gherkin
Given người dùng đang chọn 1 bài hát chưa có ảnh bìa
When người dùng kéo thả một tệp ảnh "artwork.jpg" (kích thước 1000x1000, 2MB) vào khung ảnh bìa trong Inspector
Then ảnh bìa hiển thị ngay lập tức trong khung xem trước với kích thước thumbnail thu nhỏ
When người dùng bật tùy chọn "Tối ưu ảnh bìa (Resize về 800px)" và bấm Lưu
Then ảnh nhúng vào tệp MP3 được nén lại thành JPEG ~180KB, không làm tăng phình dung lượng tệp nhạc một cách vô lý
When người dùng nhấp chuột phải vào ảnh và chọn "Trích xuất ảnh bìa ra tệp..."
Then hộp thoại lưu tệp mở ra và xuất ra tệp ảnh JPEG nguyên vẹn.
```

### AC-06: Quy đổi Thẻ sang Tên tệp (Tag → Filename)
```gherkin
Given các bài hát đã có đầy đủ thẻ Track, Artist, Title
When người dùng chọn 10 bài hát và bấm nút "Đổi tên tệp từ thẻ"
And người dùng nhập mẫu "%track% - %artist% - %title%"
Then bảng xem trước hiển thị danh sách so sánh Tên cũ vs Tên mới (ví dụ: "01 - Vũ - Anh Nho Ra.mp3")
And các ký tự cấm trên Windows (như ":") tự động được chuyển thành dấu gạch ngang "-"
When người dùng bấm "Xác nhận đổi tên"
Then toàn bộ 10 tệp trên đĩa được đổi tên thành công mà không làm hỏng đường dẫn thư viện.
```

### AC-07: Bóc tách Tên tệp sang Thẻ (Filename → Tag)
```gherkin
Given 10 tệp MP3 có tên dạng "01. Son Tung M-TP - Lac Troi.mp3" nhưng các trường thẻ bên trong đang trống
When người dùng áp dụng mẫu quy tắc "%track%. %artist% - %title%"
Then hệ thống bóc tách đúng: Track = 1, Artist = "Son Tung M-TP", Title = "Lac Troi"
And bảng hiển thị dữ liệu mới điền vào các cột tương ứng để người dùng kiểm tra trước khi bấm Lưu.
```

### AC-08: Phân tích Độ lớn Âm lượng EBU R128 & Cảnh báo Vỡ tiếng
```gherkin
Given 50 bài hát hỗn hợp đang hiển thị trên bảng
When người dùng bấm nút "Phân tích âm lượng"
Then thanh tiến trình quét hiển thị tỷ lệ % tăng dần mà giao diện bảng không bị đơ
And khi hoàn tất, cột "dB Gốc" hiển thị độ lớn thực tế của từng bài (ví dụ "94.2 dB", "86.5 dB")
And các bài hát có nguy cơ vỡ tiếng (dự báo True Peak sau khi tăng gain > 0.0 dBTP) hiển thị biểu tượng tam giác cảnh báo màu Amber "⚠️"
And di chuột vào biểu tượng cảnh báo hiển thị tooltip "Nguy cơ vỡ tiếng: Dự báo True Peak đạt +1.2 dBTP".
```

### AC-09: Cân bằng Âm lượng Lossless MP3 Direct Frame Gain
```gherkin
Given một tệp MP3 có độ lớn đo được là 95.0 dB SPL
When người dùng chọn mức mục tiêu 89.0 dB SPL và bấm "1-Click Cân bằng"
Then độ lệch tính toán hiển thị "Gain: -6.02 dB" (tương ứng giảm 4 nấc 1.50515 dB của global_gain)
And hệ thống thực hiện kiểm tra Preflight biên độ toàn bộ Granules: không có granule nào bị tràn ngưỡng 0 .. 255
When tiến trình cân bằng hoàn tất
Then lõi Rust điều chỉnh trường global_gain trong Side Information và cập nhật MPEG Frame CRC nếu có
And tệp MP3 hoàn toàn không bị giải mã PCM hay nén lại (giữ nguyên 100% hash dữ liệu âm thanh nén Huffman)
And thẻ MP3GAIN_UNDO ghi nhận delta đảo ngược "+004,+004,N" cùng MP3GAIN_MINMAX gốc
And cột "dB Gốc" trên bảng lập tức cập nhật về mức chuẩn 89.0 dB mà người dùng không cần bấm Save lần 2.
```

### AC-10: Hoàn tác (Undo) Giao dịch & Phục hồi Sự cố (Crash Recovery)
```gherkin
Given người dùng vừa thực hiện thao tác cân bằng MP3 Gain làm giảm âm lượng 20 bài hát
When người dùng nhấn phím "Cmd/Ctrl + Z" (hoặc chọn menu Hoàn tác)
Then hệ thống đọc tệp nhật ký `journal.jsonl` và thực hiện đảo ngược nấc global_gain dựa trên thẻ MP3GAIN_UNDO
And toàn bộ 20 tệp MP3 được đưa về mức âm lượng gốc ban đầu với mã hash dữ liệu âm thanh khớp 100% ban đầu.

Given ứng dụng bị tắt đột ngột (Crash / Mất điện) ngay sau khi ghi nhật ký ở phase PREPARED và tệp tạm .tmp_<uuid> còn tồn tại
When người dùng mở lại ứng dụng VXmp3
Then cơ chế Startup Crash Recovery tự động phát hiện giao dịch PREPARED chưa commit
And hệ thống đối chiếu trạng thái tệp gốc, dọn dẹp an toàn tệp tạm mồ côi, bảo đảm tệp nhạc không bao giờ bị hư hại hoặc mất mát.
```

### AC-11: Trình phát Mini Player & So sánh Âm lượng A/B
```gherkin
Given một bài hát đang nhận Focus trên bảng
When người dùng nhấn phím "Space"
Then Mini Player ở đáy màn hình bắt đầu phát nhạc ngay lập tức
And thanh timeline hiển thị vị trí phát bài hát mượt mà
When người dùng nhấn nút pill "[A/B Gain: BẬT]"
Then âm thanh chuyển đổi tức thì giữa âm lượng gốc và âm lượng sau khi chuẩn hóa gain
giúp người dùng cảm nhận rõ rệt sự cân bằng âm thanh trước khi quyết định ghi tệp.
```

---

## 2. Ma trận Ca Kiểm thử Biên (Edge Cases Matrix)

| Tình huống biên (Edge Case) | Hành vi nguy cơ tiềm ẩn | Biện pháp bảo vệ của VXmp3 | Kết quả kiểm thử kỳ vọng |
|---|---|---|---|
| **Tệp MP3 bị lỗi khung (Corrupted Frames)** | Trình parser crash hoặc làm hỏng dữ liệu khi ghi đè | Scanner phát hiện frame sync không hợp lệ hoặc dữ liệu bị cắt cụt; từ chối can thiệp gain và gắn nhãn tệp lỗi. | Thông báo "Tệp âm thanh bị lỗi định dạng", giữ nguyên tệp gốc 100%. |
| **Biên độ Granule chạm ngưỡng 0 hoặc 255** | Clamp từng granule làm méo tương quan kênh và mất hoàn tác | Quét Preflight toàn bài; nếu chạm ngưỡng thì hạ delta chung về mức an toàn tối đa hoặc từ chối theo policy. | Bảo toàn 100% khả năng hoàn tác đối xứng; không bao giờ lệch kênh trái/phải. |
| **MPEG Frame có cờ CRC bảo vệ (Protection Bit = 0)** | Trình phát nhạc báo lỗi CRC do sửa `global_gain` | Tính toán lại CRC-16 (đa thức 0x8005) cho Header + Side Info + Audio Data theo chuẩn ISO/IEC 11172-3. | Tệp phát bình thường trên mọi thiết bị và phần cứng khắt khe. |
| **Tắt app/Crash đột ngột giữa chừng lúc ghi đĩa** | Tệp bị ghi dở hoặc mất tệp gốc | Ghi journal trạng thái `PREPARED` trước khi atomic rename; startup crash recovery tự động kiểm tra và dọn dẹp. | Không bao giờ mất tệp gốc; không để lại tệp rác mồ côi chiếm ổ đĩa. |
| **Đường dẫn chứa ký tự tiếng Việt / Unicode phức tạp** | Lỗi I/O trên Windows (ANSI vs UTF-8) | Dùng đường dẫn chuẩn hóa Unicode UTF-8 toàn hệ thống, hỗ trợ tiền tố Windows Long Paths `\\?\`. | Nạp và xử lý tệp tiếng Việt có dấu (`Đường Về Quê Mẹ.mp3`) hoàn hảo. |
| **Tệp đang bị khóa bởi ứng dụng khác (Locked File)** | Ghi đè thất bại giữa chừng làm mất file | Tạo tệp tạm trước; nếu không thể atomic rename do app khác đang mở tệp, hệ thống rollback tệp tạm. | Báo lỗi rõ ràng "Tệp đang được mở bởi ứng dụng khác", tệp gốc an toàn. |
| **Hết dung lượng ổ đĩa khi tạo tệp tạm** | Tệp bị ghi cụt (Truncated file) | Kiểm tra dung lượng đĩa trước khi ghi; kiểm tra fsync và kích thước tệp tạm trước khi thực hiện lệnh rename. | Hủy tác vụ ngay lập tức, tệp gốc không bị ảnh hưởng. |
| **Thư mục cực lớn (5,000+ bài hát)** | Tràn bộ nhớ WebView, giật lag UI | Ảo hóa bảng DOM bằng `@tanstack/react-virtual`, chỉ render ~30 dòng trong khung nhìn hiển thị. | RAM WebView duy trì dưới 180MB, cuộn mượt mà 60 FPS. |
| **Xoay vòng Hoàn tác Gain nhiều lần** | Tích lũy sai số làm lệch âm lượng | Thuật toán `delta_steps` là số nguyên tuyệt đối (8-bit integer), lưu số nấc bù trong thẻ `MP3GAIN_UNDO`. | Đảo ngược gain 10 lần liên tục đưa tệp về chính xác 100% hash dữ liệu nén âm thanh gốc. |
| **Tệp chỉ có quyền Đọc (Read-only)** | Lỗi Permission Denied | Kiểm tra thuộc tính tệp trước khi cho phép bấm Lưu. | Nút Lưu bị vô hiệu hóa hoặc có icon ổ khóa nhắc nhở người dùng cấp quyền ghi. |

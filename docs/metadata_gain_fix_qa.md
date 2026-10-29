# VXmp3 — Sửa metadata, gain và batch list
Ngày: 2026-10-14. Trạng thái: local macOS Apple Silicon; chưa publish.

## Kết quả và nguyên nhân
- Inline editor cũ chỉ mở qua double click và phụ thuộc focused row; các cột bị che ở cửa sổ hẹp. Nay click ô Title/Artist/Album/Year/Genre để sửa ngay, có cuộn ngang header/body, F2/Tab/Enter/Escape và tên accessibility.
- Bản nháp inline trước chỉ được commit khi blur nên Cmd/Ctrl+S có thể bỏ sót ô đang gõ. Nay stage mỗi lần nhập; Escape trả giá trị trước edit; save chỉ xóa bản nháp đã lưu thành công. Selection/focus Inspector được dùng nhất quán, kể cả batch.
- Writer trước bỏ qua album_artist, disc/total_disc, composer, comment, lyrics, ảnh bìa và không xóa được số năm/track. Writer chung nay set/clear đầy đủ, dùng cả save/piggyback/Undo; kiểm chứng tag trên file tạm trước atomic replace; đọc lại metadata để cập nhật UI. Giữ ảnh nhúng phụ và thẻ ngoài UI khi sửa text.
- Đo MP3 trước dùng thẻ ReplayGain cũ hoặc ước lượng global_gain; UI sau gain chỉ dự đoán dB. Nay giải mã PCM bằng Symphonia 0.5.5, đo integrated EBU R128/true peak bằng ebur128 0.1.10. Backend luôn đo file fresh trước gain, giới hạn nấc tăng theo headroom; UI đọc lại metadata/loudness từ file sau gain. Tệp lỗi/codec không hỗ trợ/silence trả lỗi riêng, không số đo giả.
- “Cân bằng cả list” xử lý toàn bộ MP3, không theo selectedIds. Non-MP3 được bỏ qua. Cmd/Ctrl+A ngoài input chọn list; trong input chọn văn bản. Save/measure/gain/Undo có lock chống gọi chồng và chạy Rust blocking work trên worker.

## Checks
- `cargo test --offline --manifest-path src-tauri/Cargo.toml`: 14 passed, 0 failed.
- `npm run build`: TypeScript + Vite đạt.
- `npx tauri build --bundles app`: bundle macOS local thành công.
- Fixtures là sóng sine 1 kHz 3 giây tự tạo bằng LAME 1.8.1 (128 kbps, 44.1 kHz, mono/stereo), ở [fixtures](../src-tauri/fixtures/). Test copy vào thư mục tạm riêng; không sửa nhạc gốc.
- [Regression tests](../src-tauri/src/regression_tests.rs): full metadata UTF-8/cover readback + clear + Undo; audio không đổi khi sửa tag; mono/stereo gain +3.0103 dB rồi đo lại; Undo trả bitstream byte-for-byte; bỏ qua stale UI dB/ReplayGain; piggyback giữ gain và Undo cả tags; missing file/invalid cover báo lỗi, giữ source; batch lặp idempotent; clipping giới hạn; mixed success/failure; giữ extra pictures/unknown tags.

## QA native macOS
Thư mục riêng `/private/tmp/vx_mp3_native_20261014` gồm mono.mp3, stereo.mp3, extra.wav. App mở từ bundle local trong `src-tauri/target/release/bundle/macos/VXmp3.app`.
- Click một lần Title/Artist mở input đúng bài. Tab Artist → Album hoạt động. Cmd+S khi input chưa blur lưu thẻ và hết trạng thái pending.
- Paste UTF-8 lưu đúng Title, Album Artist, Artist, Album. Restart app + mở lại thư mục đọc lại Title và Album Artist đúng. Native journal có PREPARED/COMMITTED đúng file fixture.
- Cmd+A ở list: Inspector “ĐANG CHỌN (3 BÀI)”; Cmd+A trong input chỉ chọn/replace văn bản.
- Đo trước: WAV 71.1 dB, mono 79.1 dB, stereo 82.1 dB.
- Chỉ chọn mono rồi cân bằng cả list mục tiêu 89 dB: backend xử lý mono +7 nấc và stereo +5 nấc; cả hai đo lại 89.6 dB. WAV vẫn 71.1 dB. Bấm Đo dB lần nữa giữ các giá trị sau gain.
- Undo batch khôi phục 2 MP3; đo lại trở về mono 79.1 dB / stereo 82.1 dB, metadata đã lưu trước gain vẫn còn.
- Phép typeText của công cụ native làm mất dấu; kiểm tra UTF-8 dùng paste, kết quả metadata readback đúng.

## Giới hạn
- Chưa QA Windows/Intel, chưa publish hay kiểm tra updater. Số 89.6 dB do nấc global_gain khoảng 1.50515 dB; đây là dB quy ước `107 + LUFS`, không phải mức áp suất âm thanh đo bằng micro.
- Lossless gain chỉ MPEG-1 Layer III. Decoding/measurement native xác nhận MP3 và WAV; không coi build là QA mọi codec.
- Đây là QA trong phạm vi lỗi được giao; không chứng minh toàn bộ recovery/Undo khi file bị sửa bên ngoài hoặc crash mọi thời điểm.
- Nguồn API: [Symphonia example](https://github.com/pdeljanov/Symphonia/blob/main/symphonia/examples/getting-started.rs), [ebur128](https://docs.rs/ebur128/0.1.10/ebur128/struct.EbuR128.html).

Bằng chứng checks và hash source: [metadata_gain_fix_evidence.json](metadata_gain_fix_evidence.json). Build cuối đã được mở lại thành công sau khi đóng bản QA trước.

## Tiếp tục 2026-10-14 — Engine gain + progress + selection
- Root cause được kiểm chứng trên list Test music: ngưỡng min_gain lấy cả granule rỗng/global_gain=0, chặn giảm gain của cả bài. 9/26 bài có min=0 chỉ do phần rỗng. Một số bài có granule audio ở gain biên 0; engine cũ giới hạn toàn track về delta=0 và báo như đã cân bằng.
- Engine mới bỏ qua granule không có payload; khi giảm gain, các slot sát biên được saturate riêng và lưu `boundary_gains` (frame index/bit offset/original gain) để Undo khôi phục chính xác. Không wrap sang 255. Journal cũ không có boundary_gains vẫn Undo toàn slot theo hành vi cũ.
- Channel Tauri `onProgress` truyền số frame PCM đã đo và các bước ghi/đo lại. Ô dB hiện tại/mục tiêu dạng badge mức + số; khi chạy có fill theo tiến độ và phần trăm. Số dB tạm tính lúc đo được đánh dấu trong tooltip, kết thúc thay bằng integrated loudness toàn bài. Tổng progress 2 px dưới toolbar, đếm hoàn tất/total; không sinh phần trăm bằng timer.
- Kết quả riêng từng bài: đã chỉnh / không đổi / giới hạn / lỗi / bỏ qua; lỗi không chặn cập nhật bài đã thành công. Cho cuộn bảng khi đang chạy, khóa editing/mutation.
- Thêm “Cân bằng đã chọn (N)”; “Cân bằng cả list” vẫn độc lập selection. Nút Undo đổi icon Undo2 và nhãn “Hoàn tác” + tooltip rõ ràng. Undo xóa trạng thái tiến trình cũ.
- `cargo test --offline`: 20 passed. Ca real_audio_copy_gain_regression chỉ kiểm tra audio bên ngoài khi có env; đã chạy riêng với `VXMP3_QA_AUDIO` trên bản sao BEcause: giảm gain, đo lại đạt mục tiêu trong sai số và Undo trùng bytes. Không write nguồn trong test này.
- QA native được user cho phép ghi trực tiếp Downloads/Test music: đo 26/26 không lỗi; chụp được ô đo tiến độ 46%/82% và tổng 0/26 đang chạy. Cân bằng selection BEcause 97.2→89.6 dB; Undo native khôi phục byte-exact.
- Batch toàn list: **17 đã chỉnh, 9 không cần đổi, 0 giới hạn, 0 lỗi**. Số đo sau ghi/đo lại từng bài trong **88.4–89.7 dB**, target89. SHA-256 cho thấy đúng17 file thay đổi; Undo native khôi phục toàn bộ26 file về hash baseline trước batch. User cho phép mutations trên folder test trong chat; không áp dụng ủy quyền này cho thư viện khác.
- Cấu trúc Windows có menu bên trái, minimize/maximize/close bên phải, Ctrl shortcuts; các badge/progress/actions dùng React/CSS chung. Chưa build/runtime QA Windows.
- Khái niệm: integrated EBU R128 là loudness cảm nhận toàn bài có weighting/gating; không phải trung bình cộng dB hay SPL đo bằng microphone. MP3Gain Windows dùng ReplayGain 1.x nên có thể khác số đo; cách gain bitstream và nấc1.50515dB có cùng ý tưởng. Không tuyên bố parity thuật toán đo với MP3Gain.

## Đóng lượt 2026-10-14
User xác nhận đóng turn. Bản cuối đã mở Downloads/Test music trong MP3Gain View và đo đủ26/26; native screenshot có badge số tạm tính97.4dB cùng progress91% cho bài đang đo. File test đã được Undo về baseline trước batch QA. Recent folders chỉ được trao đổi, chưa triển khai. Chưa publish.

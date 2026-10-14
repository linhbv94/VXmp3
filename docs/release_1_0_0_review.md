# VXmp3 1.0.0 — QA độc lập và phát hành

Ngày: 2026-10-14. Phạm vi macOS Apple Silicon/Intel; không phát hành Windows.

## Kết quả trước tag

- Frontend production và bundle Apple Silicon đạt; 24 Rust tests đạt, 1 child ignored được parent thực thi riêng để abort thật ở PREPARED và sau rename. Hai trạng thái giữ source/backup/journal và chặn ghi tiếp.
- QA native trên MP3 fixture sinh riêng: đo 82.1 dB; cân bằng 89.6 dB; Undo trả SHA-256 gốc. Sửa tiêu đề qua Cmd+S đạt. Sửa file ngoài app rồi Undo bị từ chối SOURCE_CHANGED, file ngoài được giữ nguyên; phục hồi fixture đúng trạng thái đã commit rồi retry Undo đạt và trả hash gốc. Không ghi nhạc gốc của user.
- Regression: metadata external edit, partial Undo retry không lặp path thành công, malformed/pending journal, identity/permissions/source revalidation; updater startup/concurrency/error/restart và guard pending changes/download failure; recent MRU/release automation.
- Updater dùng khóa riêng, main window/capabilities giới hạn; trước install chặn pending edits/mutation và journal chưa xác minh. Không đưa private key vào Git.

## Giới hạn

- Full-file backup giữ trong app data; mỗi lượt ghi/Undo cần thêm dung lượng, chưa có retention hoặc UI quản lý. Không xóa backup thủ công khi cần Undo.
- Journal cũ thiếu hash/backup không được ghi đè bằng Undo. Pending/corrupt journal chặn ghi tiếp, không tự replay/xóa; cần kiểm tra và phục hồi từ backup có xác minh. Không tuyên bố recovery tự động hoàn chỉnh hoặc an toàn tuyệt đối khi mất điện.
- Native GUI kiểm tra Apple Silicon. Intel chờ CI/package; chưa Intel GUI. Bản đầu chưa có bản cũ public để chứng minh updater E2E.
- macOS ký ad-hoc, chưa notarize; cảnh báo mở lần đầu vẫn có thể xuất hiện.

## Phát hành

CI đúng tag, assets/signature/tamper/icon/version/architecture và public endpoint sẽ ghi khi hoàn tất.

# vxmp3 1.0.4 — QA và release icon mới

Ngày:2026-10-27. User giao QA và release MP3/Photos với bộ icon mới. Phát hành đầy đủ Windows x64, Mac Silicon/Intel cùng engine hiện hữu.

## Phạm vi và QA trước tag

Chỉ chọn native icons, version/note và báo cáo của lượt này; không gom docs/examples/test fixtures/icon sources rời hoặc thay đổi converter của agent khác. Không sửa audio/photo engine, public key, appID, installer mode. Native icon files khớp root outputs;3ảnh nguồn khớp thư viện zicons; ICO đủ16/24/32/48/64/128/256. Đã xem ảnh nguồn mới.

Frontend production build PASS. 24 Rust PASS, 1 ignored là crash child được test cha gọi;17 Node PASS. Regression thực chạy fixture riêng: thao tác mutation/Undo/crash giữ dữ liệu theo suite hiện hữu. Source runtime không đổi so với main public trước đó; đây không phải chứng nhận mọi filesystem/OS scenario.

Chưa mở GUI native hoặc test old→new updater trong lượt icon này. GUI Windows/Intel chưa thử; CI/build/package không thay GUI proof. Sau CI phải đối chiếu icon ICNS trong2gói Mac và ICO resources của PE Windows, ký updater/tamper rejection, đúng architecture/version/ID,6asset public.

## Checkpoint

Đang chuẩn bị tag; chưa publish. Kết quả CI/package/public sẽ cập nhật sau kiểm chứng.

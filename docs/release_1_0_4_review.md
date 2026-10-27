# vxmp3 1.0.4 — QA và release icon mới

Ngày:2026-10-27. User giao QA và release MP3/Photos với bộ icon mới. Phát hành đầy đủ Windows x64, Mac Silicon/Intel cùng engine hiện hữu.

## Phạm vi và QA trước tag

Chỉ chọn native icons, version/note và báo cáo của lượt này; không gom docs/examples/test fixtures/icon sources rời hoặc thay đổi converter của agent khác. Không sửa audio/photo engine, public key, appID, installer mode. Native icon files khớp root outputs;3ảnh nguồn khớp thư viện zicons; ICO đủ16/24/32/48/64/128/256. Đã xem ảnh nguồn mới.

Frontend production build PASS. 24 Rust PASS, 1 ignored là crash child được test cha gọi;17 Node PASS. Regression thực chạy fixture riêng: thao tác mutation/Undo/crash giữ dữ liệu theo suite hiện hữu. Source runtime không đổi so với main public trước đó; đây không phải chứng nhận mọi filesystem/OS scenario.

Chưa mở GUI native hoặc test old→new updater trong lượt icon này. GUI Windows/Intel chưa thử; CI/build/package không thay GUI proof. Sau CI phải đối chiếu icon ICNS trong2gói Mac và ICO resources của PE Windows, ký updater/tamper rejection, đúng architecture/version/ID,6asset public.

## Checkpoint

Tagv1.0.4 đã push tại `37aec67b25fc22fda70155ec63b020a7778e107f`; build run40440789215 đang chạy. Chưa publish; package/icon/signature/public sẽ cập nhật sau kiểm chứng.

## Kết quả public

Đã phát hành [VXmp3 1.0.4](https://github.com/linhbv94/VXmp3/releases/tag/v1.0.4), stable/latest. Tag `37aec67b25fc22fda70155ec63b020a7778e107f`; PR #3 đã merge. Build run **40440789215**, publish run **40443401639** đều success.

- Manifest đủ platform, sáu asset đúng layout; xác minh Minisign cho mọi entry và từ chối gói bị đổi một byte.
- Mac Silicon/Intel: đúng ARM64/x86_64, app ID/version; strict codesign và checksum DMG đạt. ICNS trong cả archive cập nhật và DMG byte-exact với icon mới.
- Windows: executable x64, version 1.0.4; bảy payload icon trong PE byte-exact với ICO mới.
- Sau publish, kiểm tra không đăng nhập: manifest public khớp bản đã xác minh và cả sáu asset HTTP 200. [Evidence](release_1_0_4_evidence.json), [CI checkpoint](release_1_0_4_ci_checkpoint.json).

Giới hạn: lượt này kiểm regression/CI/package theo phạm vi icon, không mở lại GUI native và không chạy cập nhật từ bản cũ lên bản mới. Không lấy kết quả build để tuyên bố GUI Windows/Intel hoặc updater E2E đạt. Lượt Codex QA/release MP3 đã đóng theo quy ước.

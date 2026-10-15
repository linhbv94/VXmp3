# Phát hành VXmp3

Bản public đầu tiên: [1.0.0](https://github.com/linhbv94/VXmp3/releases/tag/v1.0.0), macOS Apple Silicon và Intel. [QA và giới hạn](release_1_0_0_review.md). Đợt 1.0.2 bổ sung Windows x64 dùng engine Rust chung; trạng thái hiện tại xem [QA/checkpoint](release_1_0_2_review.md).

## Người dùng

Windows: tải bộ cài .exe x64. macOS: tải DMG đúng chip, kéo app vào Applications. macOS có thể yêu cầu cho phép mở lần đầu. Các bản sau: Cài đặt → Cập nhật. Bản đầu đã kiểm tra nhận diện phiên bản hiện tại; cập nhật giữa hai bản public sẽ kiểm chứng khi có bản tiếp theo.

Undo giữ bản sao nguyên file trong app data, cần thêm dung lượng trống khi xử lý nhiều nhạc. Không xóa backup nếu còn cần Hoàn tác. File đã sửa bên ngoài sẽ không bị Undo ghi đè. Journal chưa đầy đủ sẽ chặn ghi và giữ dữ liệu để kiểm tra, chưa có phục hồi tự động/UI quản lý backup.

## Agent release

Repo public dùng standard runners, không Actions cache/workflow artifacts. QA code trước tag và ghi phạm vi GUI/OS/recovery thực sự đã thử. Đồng bộ version chính app trong package.json/package-lock.json/Cargo.toml/Cargo.lock/tauri.conf.json, không bump dependency. Viết docs/release_notes/X.Y.Z.md cho end user.

Chạy frontend build, cargo test --locked --lib và node --test scripts/test_updates.mjs scripts/test_release_automation.mjs scripts/test_recent.mjs; node scripts/validate_release.mjs vX.Y.Z.

Commit/push và tag bất biến đúng source đã QA. release.yml build Windows x64 và haiMac, tạo draft sáu assets, kiểm tra manifest/chữ ký. Retry lỗi transient đúng job; không force-move tag hoặc thay package cùng version đã public. Kiểm chứng metadata/architecture/icon/DMG và signatures/tamper trước publish_release.yml. Sau publish xác minh public latest/manifest/assets, lưu evidence và ghi rõ giới hạn updaterE2E.

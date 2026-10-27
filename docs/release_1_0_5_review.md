# vxmp3 1.0.5 — phát hành native SDK27
Ngày: 2026-10-27. User giao release sau migration traffic lights.

Giữ engine, app ID, khóa updater, minimum OS và icon mới đã phát hành. Chỉ thêm gate SDK27.0 thật, npm wrapper/build.rs và CI Xcode27. Hai target Mac đều build trên runner standard `xcode-27`; bản Intel cross-build x86_64 riêng, không gọi đó là test runtime Intel. Runner macos-15 cũ không có SDK27. Đã kiểm probe Mach-O Intel local SDK27.0; không patch metadata.

Local migration trước đó có bundle SDK27/codesign và AppKit fixture 50 lượt, bezel 14pt; không lấy fixture làm runtime QA toàn app. Lượt này chạy frontend/regressions; sau CI kiểm executable SDK27 thật, version/architecture/ID/icon/signatures và public.

Đang chuẩn bị tag; chưa publish. GUI native/old→new updater chưa chạy lại ở lượt release này.

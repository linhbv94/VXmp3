# VXmp3 1.0.1 — QA độc lập và checkpoint phát hành

Ngày: 2026-10-15. User giao Codex QA và release/publish Windows x64 + macOS Silicon/Intel. Windows là engine thật dùng chung Rust, không phải dummy. Chưa publish tại thời điểm lập checkpoint này.

## Phạm vi và kết quả local

- Baseline Git `be4c23f684a84c20fdf687f50fe0eadcfb1843dd`, có thay đổi toolbar chưa commit. Review diff traffic lights: frame/bounds vuông, chuyển tâm toolbar từ content view sang superview native; không thay audio engine hoặc app identity/updater key.
- Frontend build PASS. Rust `cargo test --locked --offline --lib`: 24 PASS, 1 ignored là crash child được test cha gọi riêng. Bao gồm metadata/gain/Undo, external edits, partial Undo, incomplete journal và crash subprocess.
- Node frontend/recent/release tests: 17 PASS trước và sau mở rộng pipeline Windows.
- Native app QA `com.vxmp3.qa.align20261015` (debug bundle, không dùng đánh giá tốc độ): scan 2 fixture mono/stereo + 1 file hỏng → 2 bài và báo 1 tệp không đọc được. Đo 79.1/82.1 dB, gain cả list về 89.6/89.6 dB quanh target89. Hai hash audio thay đổi, file hỏng không đổi. Undo native báo 2 tệp; hash cả3 khôi phục byte-exact. Không dùng nhạc gốc.
- Native zoom/restore bằng action AppKit thành công. Sharing indicator vẫn che vùng traffic lights trong screenshot, nên chưa xác nhận trực quan hình dạng/căn tâm; không dùng source hoặc DOM để claim visual PASS.

## Windows và release

Audio/metadata/gain dùng chung `audio_core.rs`, `metadata.rs` và `transaction.rs` với Symphonia/ebur128/lofty. Platform-specific ở chrome/menu và filesystem guards. Không có lý do từ source để tách engine cân bằng riêng trên Windows; khả năng build/test target phải do CI xác minh.

Đã bổ sung Windows standard runner/NSIS currentUser, manifest ba platform và layout6assets, giữ signer updater/app ID hiện hữu. Version bump1.0.1, lock name đồng bộ `vxmp3`. Notes chỉ gồm thay đổi cho người dùng.

Trước publish cần CI native cả3 target, đủ6assets, signatures thật, archive/installer metadata và endpoint public sau publish. Chưa GUI Windows/Intel, chưa fresh-install Windows hoặc updater old→new trong lượt này. Không tự biến giới hạn này thành claim runtime PASS.

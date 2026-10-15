# VXmp3 1.0.2 — QA độc lập và checkpoint phát hành

Ngày: 2026-10-15. User giao Codex QA và release/publish Windows x64 + macOS Silicon/Intel. Windows là engine thật dùng chung Rust, không phải dummy. **Đã publish stable/latest1.0.2**, CI và public checks thành công; Codex đóng riêng lượt VXmp3 theo quy ước.

## Phạm vi và kết quả local

- Baseline Git `be4c23f684a84c20fdf687f50fe0eadcfb1843dd`, có thay đổi toolbar chưa commit. Review diff traffic lights: frame/bounds vuông, chuyển tâm toolbar từ content view sang superview native; không thay audio engine hoặc app identity/updater key.
- Frontend build PASS. Rust `cargo test --locked --offline --lib`: 24 PASS, 1 ignored là crash child được test cha gọi riêng. Bao gồm metadata/gain/Undo, external edits, partial Undo, incomplete journal và crash subprocess.
- Node frontend/recent/release tests: 17 PASS trước và sau mở rộng pipeline Windows.
- Native app QA `com.vxmp3.qa.align20261015` (debug bundle, không dùng đánh giá tốc độ): scan 2 fixture mono/stereo + 1 file hỏng → 2 bài và báo 1 tệp không đọc được. Đo 79.1/82.1 dB, gain cả list về 89.6/89.6 dB quanh target89. Hai hash audio thay đổi, file hỏng không đổi. Undo native báo 2 tệp; hash cả3 khôi phục byte-exact. Không dùng nhạc gốc.
- Đã thực hiện hai action zoom/restore AppKit không báo lỗi; AX tree không đổi nên chưa có bằng chứng kích thước để nghiệm thu hành vi zoom/restore độc lập. Sharing indicator vẫn che vùng traffic lights trong screenshot, nên chưa xác nhận trực quan hình dạng/căn tâm; không dùng source hoặc DOM để claim visual PASS.

## Windows và release

Audio/metadata/gain dùng chung `audio_core.rs`, `metadata.rs` và `transaction.rs` với Symphonia/ebur128/lofty. Platform-specific ở chrome/menu và filesystem guards. Không có lý do từ source để tách engine cân bằng riêng trên Windows; khả năng build/test target phải do CI xác minh.

Đã bổ sung Windows standard runner/NSIS currentUser, manifest ba platform và layout6assets, giữ signer updater/app ID hiện hữu. Version bump1.0.1, lock name đồng bộ `vxmp3`. Notes chỉ gồm thay đổi cho người dùng.

Trước publish cần CI native cả3 target, đủ6assets, signatures thật, archive/installer metadata và endpoint public sau publish. Chưa GUI Windows/Intel, chưa fresh-install Windows hoặc updater old→new trong lượt này. Không tự biến giới hạn này thành claim runtime PASS.

## Tiếp tục từ lần build chưa phát hành

Tag1.0.1 không publish do test harness npm trên Windows. Windows đã pass24Rust; sửa riêng harness .cmd và dùng tag1.0.2, không đổi audio engine/identity. Theo dõi run mới và public state trước ghi PASS.

## Continuity check

So sánh config tag1.0.0 với source1.0.2: app identifier, updater endpoint và public key giữ nguyên. Đây là kiểm tra cấu hình, chưa phải E2E cài update giữa hai bản.

## Artifact Windows đã kiểm khi draft

NSIS4.250.511bytes, PE header hợp lệ, SHA256 `093ca31f0ce97e72e19202968a26b50553e855a53f41895b1253ee53ca54da86` khớp digest GitHub. Chữ ký thật hợp lệ cho windows-x86_64/nsis; thay1byte bị reject. Kiểm PE stub không đại diện kiến trúc binary bên trong hoặc GUI.

## Kết quả cuối

- [Release1.0.2](https://github.com/linhbv94/VXmp3/releases/tag/v1.0.2), tag SHA `dca50b902e7263ae9b47855b3ba2b79944ed7340`.
- [Build38712969405](https://github.com/linhbv94/VXmp3/actions/runs/38712969405): Windows/macOS Silicon/Intel và validate đều success. [Publish38717639106](https://github.com/linhbv94/VXmp3/actions/runs/38717639106): success.
- Hai archive Mac đúng Mach-O arm64/x86_64, version/identifier/icon khớp; codesign strict PASS; hai DMG verify PASS. Windows PE stub hợp lệ; không coi stub là chứng minh kiến trúc binary bên trong.
- Manifest đủ3platform và aliases; chữ ký thật toàn bộ updater packages PASS, sửa1byte bị reject; digest5packages khớp GitHub.
- [Public evidence](release_1_0_2_public_evidence.json): latest stable1.0.2, không draft/prerelease, manifest và6assets HTTP200 không auth. [QA/hashes](qa/independent_2026_10_15_evidence.json).
- Windows dùng engine Rust thật, không dummy. Windows/Intel GUI, fresh-install Windows và updater old→new chưa test trong lượt này; native Mac fixture là QA ID/debug bundle có cùng source thay đổi cửa sổ, không phải claim native runtime của mọi artifact CI. Traffic lights vẫn chưa visual nghiệm thu vì indicator che; hai action zoom không báo lỗi nhưng chưa đối chiếu kích thước. Không tự nâng các giới hạn này thành PASS.
- Repo public, standard hosted runners, không cache/workflow artifacts hoặc dịch vụ ký trả phí; [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

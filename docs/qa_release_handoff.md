# VXmp3 — Bàn giao QA và release
Ngày: 2026-10-14. User chuẩn bị chuyển convo; tài liệu này không tự cấp quyền publish hoặc gọi agent/convo khác.

## Bản cần dùng
- App/source: `vxmp3`, version1.0.0, identifier `com.vxmp3.desktop`.
- **Dùng bundle release**: [VXmp3.app](../src-tauri/target/release/bundle/macos/VXmp3.app). Build với `npx tauri build --bundles app` trong root app.
- Đừng dùng `target/debug/bundle/macos/VXmp3.app` để đánh giá tốc độ/release readiness. Vòng QA UI/recent có dùng debug; user giữ cửa sổ QA rồi thấy đo rất chậm. Đối chứng đọc cùng BEcause: debug29.924s, release0.442s (~67.7lần), cùng loudness97.172793dB và true peak−1.125919dBTP. Native release đã đo26/26 và user xác nhận “bản này ok rồi”. [Evidence hiệu năng](loudness_performance_evidence.json).
- Không sửa thuật toán gain/measure chỉ vì độ chậm của debug; hash audio_core/transaction vẫn giống lượt audio QA đã chốt. Follow-up này chỉ thêm thời gian vào example chẩn đoán read-only, không thay engine/Cargo profile.

## Đã có bằng chứng
- Metadata: click edit, Cmd/Ctrl+S khi đang nhập, set/clear đầy đủ + readback, ảnh/thẻ ngoài UI, UTF-8, restart/scan; fixture + native Mac.
- Engine: PCM integrated EBU R128/true peak; gain lossless MPEG-1 Layer III; bỏ qua granule rỗng, saturate riêng gain biên thấp, journal boundary và Undo exact/tương thích journal cũ.
- UX: badge số+mức/loading từng ô + số đo tạm tính khi chạy; progress tổng2px; kết quả từng bài; cả list/selection; Hoàn tác có icon và text.
- 20 Rust tests, frontend build và bundle Mac đạt ở lượt trước. Native folder Test music26bài:17chỉnh/9no-op/0giới hạn/0lỗi, sau gain88.4–89.7dB quanh target89; Undo khôi phục hash toàn bộ26file. [QA audio](metadata_gain_fix_qa.md), [evidence](gain_progress_fix_evidence.json).
- UI/recent triển khai sau lượt audio: Open Folder trên titlebar, dropdown5recent, traffic lights native.28recent cases, build4app, QA native Mac VXmp3 MRU/restart/Cancel/missing/zoom-close; native VXMedia file/folder/session. [Báo cáo riêng](../../_summary/agents_handoff/desktop_recent_result.md).

## Scope QA tiếp
1. Đọc [quy tắc workspace](../../.agents/AGENTS.md), [UI chuẩn](../../_summary/standard_docs/desktop_ui_standards.md), [scope](../vx_mp3_scope_v1_0.md), [spec](spec/00_system_overview.md), các báo cáo/evidence trên và source hiện tại; giữ thay đổi UI/recent đã có. Xác minh artifact/hash/commit ở đầu lượt vì repo và bản build có thể đã đổi.
2. Chạy checks phù hợp trên source cuối; đánh giá **release build** native: scan/measure/error, gain selection/list/clipping/no-op, pending tags/piggyback, Undo liên tiếp/boundary, file bị sửa ngoài app và crash/recovery. Chưa có bằng chứng toàn diện về mọi crash/external-edit recovery.
3. Ghi riêng các giới hạn: Windows có layout/source chung nhưng chưa build/runtime QA; Intel/updater chưa test. Lossless gain giới hạn MPEG-1 Layer III; EBU R128 khác thuật toán ReplayGain của MP3Gain Windows, không hứa parity số đo. Recent pure hover, fullscreen/minimize và một số app khác còn giới hạn theo báo cáo riêng.
4. Release theo yêu cầu user trong convo mới và skill desktop release: khảo sát Git/remote/pipeline/signing/updater hiện có, không suy source/build local = release public. Lượt này chưa commit/push/publish và không tự thay version hoặc signing key.

## Trạng thái bàn giao
User đã đóng lượt sửa audio trước. UI/recent là lượt khác được ghi ở [work log](../../_summary/work_log.md); không tự đóng track/agent khác. Folder test đã được Undo về baseline trước batch QA; lượt performance chỉ đọc/đo, không ghi nhạc. Bản release đang mở Test music và đã đo xong26/26.

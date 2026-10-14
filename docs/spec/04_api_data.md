# API & Data Contract Specification: VXmp3 (`_spec4_api_data`)

> **Module:** Hợp đồng Dữ liệu & Giao thức Giao tiếp IPC (Data Contracts & Schemas)  
> **Tài liệu cha:** [00_system_overview.md](00_system_overview.md)  
> **Kiến trúc áp dụng:** Tauri v2 IPC Commands (Request-Response) kết hợp Event Streaming  
> **Phiên bản:** 1.0.0  
> **Ngày cập nhật:** 2026-10-13  

---

## 1. Mô hình Giao tiếp (Communication Architecture)

VXmp3 sử dụng hai cơ chế giao tiếp chính giữa **Tầng Giao diện (React UI Shell)** và **Tầng Lõi Âm thanh (Rust Audio Core)**:

1. **Tauri IPC Command (Request-Response):** Dành cho các tác vụ truy vấn, xem trước khác biệt, và kích hoạt ghi tệp an toàn.
2. **Tauri Event Streaming (Push Events):** Dành cho các tác vụ xử lý tốn thời gian như phân tích độ lớn âm thanh cho hàng trăm tệp hoặc ghi tệp hàng loạt, cho phép cập nhật thanh tiến trình theo thời gian thực và cho phép hủy tác vụ giữa chừng.

```text
[Frontend TypeScript]                                  [Backend Rust Audio Core]
        │                                                       │
        │── invoke('scan_audio_directory', { path }) ──────────>│
        │<── trả về danh sách bài hát sơ bộ kèm thẻ metadata ───│
        │                                                       │
        │── invoke('analyze_loudness', { track_ids, target_db })│
        │                                        [Worker Pool chạy `ebur128`]
        │<── emit('loudness_progress', { current, total, ... }) │
        │<── emit('loudness_chunk', chunk_results) ─────────────│
        │<── trả về kết quả phân tích hoàn tất ─────────────────│
        │                                                       │
        │── invoke('preview_batch_tags', { updates }) ─────────>│
        │<── trả về danh sách TagDiff chi tiết ─────────────────│
        │                                                       │
        │── invoke('apply_batch_tags', { updates }) ───────────>│
        │                                        [Two-Phase Write .tmp_<uuid>]
        │<── trả về kết quả áp dụng thẻ & ID giao dịch ─────────│
        │                                                       │
        │── invoke('apply_lossless_mp3_gain', { ... }) ────────>│
        │                                        [MPEG global_gain bitstream]
        │<── trả về kết quả biến đổi Gain & mã hoàn tác ────────│
        │                                                       │
        │── invoke('undo_last_operation') ─────────────────────>│
        │                                        [Đọc `journal.jsonl` rollback]
        │<── trả về kết quả khôi phục trạng thái cũ ────────────│
```

---

## 2. Các Cấu trúc Dữ liệu Cốt lõi (Core Data Schemas)

### 2.1. Đối tượng Bài hát (`AudioTrack`)

```typescript
export interface AudioTrack {
  id: string;                      // UUID v4 ổn định định danh bài hát trong phiên làm việc (không phụ thuộc đường dẫn tệp)
  path: string;                    // /Users/vic/Music/Album/song.mp3
  filename: string;                // song.mp3
  extension: 'mp3' | 'flac' | 'm4a' | 'ogg' | 'opus' | 'wav';
  size_bytes: number;              // 8452100
  duration_seconds: number;        // 225.4 (thời lượng phát)
  sample_rate: number;             // 44100 hoặc 48000
  bitrate_kbps: number;            // 320
  channels: number;                // 2 (Stereo) hoặc 1 (Mono)
  tag_version: string;             // 'ID3v2.4' | 'ID3v2.3' | 'ID3v1' | 'Vorbis' | 'MP4' | 'APEv2'
  audio_stream_hash?: string;      // Mã băm SHA-256 của dòng dữ liệu nén âm thanh (không tính thẻ và byte gain)
  
  metadata: TrackMetadata;         // Thông tin thẻ siêu dữ liệu
  loudness: LoudnessData | null;   // null khi chưa phân tích, có dữ liệu sau khi đo
  pending_metadata?: TrackMetadata;// Dữ liệu thẻ đang chỉnh sửa tạm thời trong UI
}
```

### 2.2. Đối tượng Siêu dữ liệu Thẻ (`TrackMetadata`)

```typescript
export interface TrackMetadata {
  title: string;                   // Cơn Mưa Ngang Qua
  artist: string;                  // Sơn Tùng M-TP
  album: string;                   // Tuyển Tập 2024
  album_artist?: string;           // Sơn Tùng M-TP
  track_number: number | null;     // 1
  total_tracks: number | null;     // 10
  disc_number: number | null;      // 1
  total_discs: number | null;      // 1
  year: number | null;             // 2024
  genre: string;                   // V-Pop
  composer?: string;               // Nguyễn Thanh Tùng
  comment?: string;                // Remastered version
  lyrics?: string;                 // Lời bài hát đồng bộ hoặc văn bản thường
  
  cover_art: CoverArtInfo | null;  // Thông tin ảnh bìa nhúng
}

export interface CoverArtInfo {
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;                   // 800
  height: number;                  // 800
  size_bytes: number;              // 145020
  thumbnail_data_url: string;      // data:image/jpeg;base64,... (cho UI preview)
}
```

### 2.3. Đối tượng Dữ liệu Âm lượng (`LoudnessData`)

```typescript
export interface LoudnessData {
  measured_lufs: number;           // -14.2 LUFS (chuẩn EBU R128)
  measured_db_spl: number;         // 92.8 dB SPL (quy đổi ReplayGain: 107.0 + LUFS)
  measured_true_peak_dbtp: number; // +0.8 dBTP (đỉnh sóng âm thanh thực tế theo ITU-R BS.1770-4)
  predicted_true_peak_dbtp: number;// Dự báo đỉnh sau khi áp dụng gain (dBTP)
  clipping_risk: boolean;          // true nếu predicted_true_peak_dbtp > 0.0 dBTP
  
  target_db_spl: number;           // 89.0 dB SPL (mốc mục tiêu người dùng chọn)
  target_gain_db: number;          // -3.8 dB (độ lệch cần bù)
  gain_step_db: number;            // 1.50515 dB (nấc chuẩn: 5.0 * log10(2.0))
  mp3_gain_steps: number;          // -2 (số nấc 1.50515 dB áp dụng cho MP3 frame)
  mp3_undo_record?: Mp3GainUndoRecord | null; // Dữ liệu hoàn tác nếu tệp đã từng được xử lý
}

export interface Mp3GainUndoRecord {
  undo_steps_left: number;         // Giá trị lưu trong thẻ: số nấc ĐẢO NGƯỢC (-delta_steps)
  undo_steps_right: number;
  wrap_flag: 'Y' | 'N';
  min_gain: number;                // 0 .. 255 (biên độ nhỏ nhất trước khi biến đổi)
  max_gain: number;                // 0 .. 255 (biên độ lớn nhất trước khi biến đổi)
}
```

### 2.4. Đối tượng So sánh Khác biệt Thẻ (`TagDiff`)

```typescript
export interface TagDiff {
  track_id: string;
  field: keyof TrackMetadata;
  old_value: string | number | null;
  new_value: string | number | null;
}

export interface TrackTagDiffResult {
  track_id: string;
  path: string;
  changes: TagDiff[];
  has_cover_change: boolean;
}
```

### 2.5. Đối tượng Xem trước Đổi tên Tệp (`RenamePreviewItem`)

```typescript
export interface RenamePreviewItem {
  track_id: string;
  original_path: string;
  original_filename: string;
  new_filename: string;
  new_path: string;
  has_conflict: boolean;           // true nếu tên mới trùng tệp sẵn có
  sanitized_notes?: string;        // Ghi chú nếu có ký tự cấm bị thay thế
}
```

### 2.6. Cấu trúc Bản ghi Nhật ký Thao tác (`OperationJournalEntry`)

```typescript
export interface OperationJournalEntry {
  transaction_id: string;          // UUID v4 duy nhất của đợt thao tác
  timestamp_iso: string;           // 2026-10-13T10:15:30Z
  operation_type: 'tag_edit' | 'mp3_gain' | 'replaygain_tag' | 'batch_rename';
  phase: 'PREPARED' | 'COMMITTED'; // Ghi PREPARED trước khi atomic rename; ghi COMMITTED sau khi rename thành công
  status: 'prepared' | 'committed' | 'failed' | 'rolled_back';
  total_files: number;
  items: JournalItemRecord[];
}

export interface JournalItemRecord {
  file_path: string;
  temp_path?: string;              // Đường dẫn tệp tạm .tmp_<uuid> nếu đang ở phase PREPARED
  old_value: any;                  // Thẻ cũ, tên tệp cũ hoặc gain steps cũ
  new_value: any;                  // Thẻ mới, tên tệp mới hoặc gain steps mới
  status: 'pending' | 'committed' | 'failed' | 'rolled_back';
}
```

---

## 3. Danh mục Chi tiết Các Lệnh Tauri IPC (Command Contracts)

### 3.1. Quét Thư mục Âm thanh (`scan_audio_directory`)
- **Mô tả:** Quét tệp âm thanh trong thư mục được chỉ định, đọc metadata ban đầu qua crate `lofty`.
- **Payload Request:**
  ```typescript
  {
    dir_path: string;
    recursive: boolean;            // Quét cả thư mục con hay chỉ thư mục gốc
  }
  ```
- **Response:**
  ```typescript
  {
    success: boolean;
    tracks: AudioTrack[];
    total_scanned: number;
    unsupported_count: number;
    error_message?: string;
  }
  ```

### 3.2. Phân tích Độ lớn Âm lượng (`analyze_loudness`)
- **Mô tả:** Đưa danh sách bài hát vào worker pool để tính toán EBU R128 và ReplayGain dB.
- **Payload Request:**
  ```typescript
  {
    track_ids: string[];
    target_db_spl: number;         // Mặc định 89.0 hoặc 96.0
  }
  ```
- **Push Events phát ra trong quá trình chạy:**
  - Tên sự kiện: `loudness_progress`
  - Payload: `{ current: number, total: number, current_filename: string, percentage: number }`
  - Tên sự kiện: `loudness_item_done`
  - Payload: `{ track_id: string, loudness: LoudnessData }`

### 3.3. Xem trước Thay đổi Thẻ (`preview_batch_tags`)
- **Mô tả:** So sánh dữ liệu thẻ hiện tại với dữ liệu người dùng vừa chỉnh sửa, tạo bảng Diff.
- **Payload Request:**
  ```typescript
  {
    updates: Array<{
      track_id: string;
      patch: Partial<TrackMetadata>;
    }>;
  }
  ```
- **Response:** `TrackTagDiffResult[]`

### 3.4. Áp dụng Thay đổi Thẻ An toàn (`apply_batch_tags`)
- **Mô tả:** Thực hiện ghi thẻ mới xuống tệp thông qua cơ chế Two-Phase Atomic Commit.
- **Payload Request:**
  ```typescript
  {
    updates: Array<{
      track_id: string;
      patch: Partial<TrackMetadata>;
    }>;
  }
  ```
- **Response:**
  ```typescript
  {
    transaction_id: string;
    success_count: number;
    failed_count: number;
    errors: Array<{ track_id: string; error_code: string; message: string }>;
  }
  ```

### 3.5. Biến đổi Âm lượng Lossless MP3 Gain (`apply_lossless_mp3_gain`)
- **Mô tả:** Can thiệp trực tiếp vào trường `global_gain` trong MPEG frame của các tệp MP3 theo luồng Two-Phase Atomic Commit. Tự động gộp thẻ pending (Smart Piggybacking) nếu có thay đổi thẻ chưa lưu.
- **Payload Request:**
  ```typescript
  {
    track_ids: string[];
    target_db_spl: number;         // Mặc định 89.0 dB SPL
    boundary_policy?: 'adjust_to_safe_limit' | 'reject_if_overflow'; // Xử lý khi chạm ngưỡng 0 hoặc 255
    allow_clipping: boolean;       // Bắt buộc true nếu có tệp bị cảnh báo vỡ tiếng (True Peak > 0.0 dBTP)
    pending_patches?: Array<{      // Tùy chọn gộp lưu thẻ metadata chưa commit vào cùng đợt ghi đĩa
      track_id: string;
      patch: Partial<TrackMetadata>;
    }>;
  }
  ```
- **Response:**
  ```typescript
  {
    transaction_id: string;
    modified_tracks: Array<{
      track_id: string;
      applied_steps: number;       // Số nấc đã thực tế áp dụng (ví dụ -2)
      actual_db_change: number;    // dB thực tế thay đổi (-3.01 dB)
      new_db_spl: number;          // Mức dB SPL sau biến đổi
      tags_merged: boolean;        // true nếu đã gộp lưu thẻ pending thành công
    }>;
    warnings: Array<{
      track_id: string;
      message: string;
    }>;
  }
  ```

### 3.6. Hoàn tác Giao dịch Gần nhất (`undo_last_operation`)
- **Mô tả:** Đọc nhật ký `journal.jsonl` và khôi phục lại trạng thái của giao dịch gần nhất.
- **Payload Request:** `{}`
- **Response:**
  ```typescript
  {
    success: boolean;
    undone_transaction_id: string;
    operation_type: string;
    restored_count: number;
    error_message?: string;
  }
  ```

---

## 4. Bảng Mã Lỗi Hệ thống (System Error Codes)

| Mã lỗi | Nguyên nhân phát sinh | Hành vi xử lý trên giao diện |
|---|---|---|
| `FILE_NOT_FOUND` | Tệp đã bị di chuyển hoặc xóa bên ngoài ứng dụng | Đánh dấu dòng lỗi màu xám, hiển thị icon cảnh báo |
| `READ_PERMISSION_DENIED` | Hệ điều hành từ chối quyền đọc tệp/thư mục | Thông báo yêu cầu người dùng kiểm tra quyền truy cập |
| `WRITE_PERMISSION_DENIED` | Tệp đang ở chế độ Read-only hoặc bị app khác khóa | Hiển thị Toast lỗi, bỏ qua tệp bị khóa và tiếp tục các tệp còn lại |
| `CORRUPTED_AUDIO_STREAM` | Tệp bị cắt cụt, header MPEG bị hỏng không thể parse | Cảnh báo tệp bị lỗi định dạng, từ chối can thiệp gain để bảo vệ dữ liệu |
| `CLIPPING_PROTECTED` | Tăng gain gây vỡ tiếng (`predicted_true_peak_dbtp > 0.0 dBTP`) nhưng `allow_clipping` là false | Mở popup cảnh báo yêu cầu người dùng xác nhận chủ động |
| `GAIN_OVERFLOW_REJECTED` | Quét preflight phát hiện granule chạm ngưỡng 0 hoặc 255 khi policy là `reject_if_overflow` | Từ chối thay đổi để bảo vệ 100% khả năng hoàn tác; thông báo số nấc tối đa có thể áp dụng |
| `FILENAME_CONFLICT` | Tên tệp mới trùng lặp với tệp đang có trong cùng thư mục | Tự động thêm hậu tố số ` (1)` vào tên tệp |
| `JOURNAL_WRITE_FAILED` | Không thể ghi log nhật ký phase PREPARED do lỗi I/O | Hủy bỏ giao dịch ngay lập tức trước khi rename; tệp gốc được bảo vệ an toàn 100% |

## Bổ sung IPC thực tế 2026-10-14
- `AudioTrack.id`: đường dẫn tệp, ổn định qua scan/read lại cùng đường dẫn.
- `batch_analyze_loudness({ paths, targetDbSpl })` trả `{ results: TrackLoudnessResult[], errors: [{ file_path, message }] }`; lỗi/silence không được thay bằng số đo giả.
- `apply_batch_tags` nhận snapshot metadata đầy đủ và trả thêm `updated_tracks`, được đọc lại từ đĩa. Writer dùng chung cho save, piggyback và restore; đọc lại file tạm để kiểm chứng mọi trường trước commit. `null` xóa trường số/ảnh; chuỗi rỗng xóa nội dung trường text.
- `read_audio_tracks({ paths, targetDbSpl: number | null })`: trả metadata fresh và, khi có target, loudness đo thực tế của file. UI dùng sau cân bằng.
- `apply_lossless_mp3_gain`: giữ `current_db_spls` để tương thích payload, nhưng backend luôn tự đo lại file, giới hạn số nấc tăng theo true peak khi `allow_clipping=false`. File lỗi trả warning riêng; không mutation.
- `mp3_gain` có piggyback lưu snapshot metadata cũ vào journal để Undo đảo gain và khôi phục cả tags đã gộp.

### Điều chỉnh IPC progress và kết quả gain
- `batch_analyze_loudness` / `apply_lossless_mp3_gain` nhận `onProgress: Channel<AudioProgressEvent>`, truyền `action`, `file_path`, `total`, `completed`, `percent` (null khi không có tổng frame), `stage`, `status`, `message`; có `measurement` hoặc `track` khi bài hoàn tất. Đo có `preview_db` tạm tính trên phần PCM đã quét.
- Gain trả `outcomes` cho tất cả inputs, `modified_tracks` giữ thông tin bài được đọc lại thành công, thêm `status`, `message`, `track` fresh. Không gọi cả no-op là đã thay đổi.
- `boundary_gains` của journal lưu những global_gain bị saturate khi giảm; Undo dùng frame ordinal, bit offset và giá trị cũ để restore, kể cả tag offset đã đổi bởi piggyback.

/**
 * Core Data Models & Schemas for VXmp3
 * Aligned 100% with docs/spec/04_api_data.md
 */

export interface AudioTrack {
  id: string;                      // Đường dẫn ổn định qua các lần đọc lại trong phiên
  path: string;                    // Đường dẫn tuyệt đối
  filename: string;                // Tên tệp
  extension: 'mp3' | 'flac' | 'm4a' | 'ogg' | 'opus' | 'wav';
  size_bytes: number;              // Dung lượng bytes
  duration_seconds: number;        // Thời lượng phát (giây)
  sample_rate: number;             // 44100 hoặc 48000
  bitrate_kbps: number;            // 320
  channels: number;                // 2 (Stereo) hoặc 1 (Mono)
  tag_version: string;             // 'ID3v2.4' | 'ID3v2.3' | 'ID3v1' | 'Vorbis' | 'MP4' | 'APEv2'
  audio_stream_hash?: string;      // Mã băm SHA-256 dòng dữ liệu âm thanh nén thuần túy
  
  metadata: TrackMetadata;         // Thông tin thẻ siêu dữ liệu
  loudness: LoudnessData | null;   // Dữ liệu đo độ lớn âm thanh (null khi chưa đo)
  pending_metadata?: TrackMetadata;// Dữ liệu thẻ đang chỉnh sửa tạm thời trong UI
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  album_artist?: string | null;
  track_number: number | null;
  total_tracks: number | null;
  disc_number: number | null;
  total_discs: number | null;
  year: number | null;
  genre: string;
  composer?: string | null;
  comment?: string | null;
  lyrics?: string | null;
  
  cover_art: CoverArtInfo | null;
}

export interface CoverArtInfo {
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  size_bytes: number;
  thumbnail_data_url: string;      // data:image/jpeg;base64,... cho UI preview
}

export interface LoudnessData {
  measured_lufs: number;           // -14.2 LUFS (EBU R128)
  measured_db_spl: number;         // 92.8 dB SPL (ReplayGain convention: 107.0 + LUFS)
  measured_true_peak_dbtp: number; // Đỉnh sóng âm thực tế (dBTP)
  predicted_true_peak_dbtp: number;// Dự báo đỉnh sóng sau khi áp dụng gain (dBTP)
  clipping_risk: boolean;          // true nếu predicted_true_peak_dbtp > 0.0 dBTP
  
  target_db_spl: number;           // Mốc mục tiêu (89.0 hoặc 96.0 dB SPL)
  target_gain_db: number;          // Độ lệch dB cần bù
  gain_step_db: number;            // 1.50515 dB (5.0 * log10(2.0))
  mp3_gain_steps: number;          // Số nấc 1.50515 dB áp dụng
  mp3_undo_record?: Mp3GainUndoRecord | null;
}

export interface Mp3GainUndoRecord {
  undo_steps_left: number;         // Số nấc đảo ngược (-delta_steps)
  undo_steps_right: number;
  wrap_flag: 'Y' | 'N';
  min_gain: number;                // 0..255
  max_gain: number;                // 0..255
}

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

export interface RenamePreviewItem {
  track_id: string;
  original_path: string;
  original_filename: string;
  new_filename: string;
  new_path: string;
  has_conflict: boolean;
  sanitized_notes?: string;
}

export interface OperationJournalEntry {
  transaction_id: string;
  timestamp_iso: string;
  operation_type: 'tag_edit' | 'mp3_gain' | 'replaygain_tag' | 'batch_rename';
  phase: 'PREPARED' | 'COMMITTED';
  status: 'prepared' | 'committed' | 'failed' | 'rolled_back';
  total_files: number;
  items: JournalItemRecord[];
}

export interface JournalItemRecord {
  file_path: string;
  temp_path?: string;
  old_value: any;
  new_value: any;
  status: 'pending' | 'committed' | 'failed' | 'rolled_back';
}

export type ViewPreset = 'all' | 'tags' | 'mp3gain';

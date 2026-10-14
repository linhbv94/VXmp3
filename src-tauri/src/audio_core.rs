use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use uuid::Uuid;

use crate::metadata::TrackMetadata;
use crate::transaction::{get_journal_path, two_phase_atomic_commit};

pub const GAIN_STEP_DB: f64 = 1.5051499783; // 5.0 * log10(2.0)

const MPEG1_LAYER3_BITRATES: [u32; 16] = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];

const MPEG1_SAMPLERATES: [u32; 4] = [44100, 48000, 32000, 0];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackLoudnessResult {
    pub file_path: String,
    pub measured_lufs: f64,
    pub measured_db_spl: f64,
    pub measured_true_peak_dbtp: f64,
    pub clipping_risk: bool,
    pub target_db_spl: f64,
    pub target_gain_db: f64,
    pub gain_step_db: f64,
    pub mp3_gain_steps: i32,
    pub mp3_undo_available: bool,
}

#[derive(Debug, Deserialize)]
pub struct PendingTagPatch {
    pub track_id: String,
    pub patch: TrackMetadata,
}

#[derive(Debug, Deserialize)]
pub struct ApplyLosslessGainPayload {
    pub track_ids: Vec<String>,
    pub file_paths: Vec<String>,
    pub target_db_spl: f64,
    pub current_db_spls: Vec<f64>,
    pub allow_clipping: bool,
    pub pending_patches: Option<Vec<PendingTagPatch>>,
}

#[derive(Debug, Serialize)]
pub struct ModifiedTrackResult {
    pub track_id: String,
    pub path: String,
    pub applied_steps: i32,
    pub actual_db_change: f64,
    pub new_db_spl: f64,
    pub tags_merged: bool,
    pub status: String,
    pub message: Option<String>,
    pub track: crate::metadata::AudioTrack,
}

/// Tính số nấc thay đổi gain (mỗi nấc ~ 1.50515 dB)
pub fn calculate_gain_steps(current_db: f64, target_db: f64) -> i32 {
    let diff = target_db - current_db;
    (diff / GAIN_STEP_DB).round() as i32
}

/// Đọc 8-bit global_gain từ side_info tại bit_offset bất kỳ
pub fn read_global_gain(side_info: &[u8], bit_offset: usize) -> u8 {
    let byte_idx = bit_offset / 8;
    let bit_in_byte = bit_offset % 8;
    if bit_in_byte == 0 {
        side_info[byte_idx]
    } else {
        let b0 = side_info[byte_idx] as u16;
        let b1 = if byte_idx + 1 < side_info.len() {
            side_info[byte_idx + 1] as u16
        } else {
            0
        };
        let word = (b0 << 8) | b1;
        ((word >> (8 - bit_in_byte)) & 0xFF) as u8
    }
}

/// Ghi 8-bit global_gain vào side_info tại bit_offset bất kỳ mà không làm hỏng các bit xung quanh
pub fn write_global_gain(side_info: &mut [u8], bit_offset: usize, val: u8) {
    let byte_idx = bit_offset / 8;
    let bit_in_byte = bit_offset % 8;
    if bit_in_byte == 0 {
        side_info[byte_idx] = val;
    } else {
        let shift = 8 - bit_in_byte;
        let mask = 0x00FFu16 << shift;
        let b0 = side_info[byte_idx] as u16;
        let b1 = if byte_idx + 1 < side_info.len() {
            side_info[byte_idx + 1] as u16
        } else {
            0
        };
        let current_word = (b0 << 8) | b1;
        let updated_word = (current_word & !mask) | ((val as u16) << shift);
        side_info[byte_idx] = (updated_word >> 8) as u8;
        if byte_idx + 1 < side_info.len() {
            side_info[byte_idx + 1] = (updated_word & 0xFF) as u8;
        }
    }
}

/// Tính CRC-16 MPEG Layer III: bảo vệ 16-bit cuối header (bytes 2-3) và Side Information
pub fn mpeg_crc16(header_bytes_2_3: &[u8], side_info: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &b in header_bytes_2_3.iter().chain(side_info.iter()) {
        for bit_idx in (0..8).rev() {
            let bit = ((b >> bit_idx) & 1) != 0;
            let c15 = (crc & 0x8000) != 0;
            crc <<= 1;
            if bit ^ c15 {
                crc ^= 0x8005;
            }
        }
    }
    crc
}

/// Phân tích frame MPEG-1 Layer III
/// Trả về (frame_len, side_info_offset, side_info_len, channel_mode, crc_len) nếu frame hợp lệ
pub fn get_frame_info(buffer: &[u8], offset: usize) -> Option<(usize, usize, usize, u8, usize)> {
    if offset + 4 > buffer.len() {
        return None;
    }
    if buffer[offset] != 0xFF || (buffer[offset + 1] & 0xE0) != 0xE0 {
        return None;
    }
    let mpeg_version = (buffer[offset + 1] >> 3) & 0x03;
    let layer = (buffer[offset + 1] >> 1) & 0x03;
    let protection_bit = buffer[offset + 1] & 0x01;

    // Chỉ xử lý MPEG-1 (version == 3) Layer III (layer == 1)
    if mpeg_version != 0x03 || layer != 0x01 {
        return None;
    }

    let bitrate_idx = ((buffer[offset + 2] >> 4) & 0x0F) as usize;
    let sample_rate_idx = ((buffer[offset + 2] >> 2) & 0x03) as usize;
    let padding = ((buffer[offset + 2] >> 1) & 0x01) as usize;
    let channel_mode = (buffer[offset + 3] >> 6) & 0x03;

    let bitrate = MPEG1_LAYER3_BITRATES.get(bitrate_idx).copied().unwrap_or(0);
    let sample_rate = MPEG1_SAMPLERATES.get(sample_rate_idx).copied().unwrap_or(0);

    if bitrate == 0 || sample_rate == 0 {
        return None;
    }

    let frame_len = (144 * bitrate as usize * 1000) / sample_rate as usize + padding;
    if frame_len < 4 || offset + frame_len > buffer.len() {
        return None;
    }

    let crc_len = if protection_bit == 0 { 2 } else { 0 };
    let side_info_offset = offset + 4 + crc_len;
    let side_info_len = if channel_mode == 3 { 17 } else { 32 };

    if side_info_offset + side_info_len > offset + frame_len {
        return None;
    }

    Some((frame_len, side_info_offset, side_info_len, channel_mode, crc_len))
}

/// Lấy danh sách bit offset của global_gain theo channel mode:
/// - Stereo/Joint/Dual (channel_mode != 3): 41, 100, 159, 218
/// - Mono (channel_mode == 3): 39, 98
pub fn get_gain_bit_offsets(channel_mode: u8) -> &'static [usize] {
    if channel_mode == 3 {
        &[39, 98]
    } else {
        &[41, 100, 159, 218]
    }
}

/// Granules without Huffman/scalefactor payload have no audio to scale.
/// Their placeholder global_gain (often 0 in Xing/silence frames) must neither
/// constrain preflight nor be altered, so inverse gain preserves those bits.
fn granule_has_audio(side_info: &[u8], gain_offset: usize) -> bool {
    let start = gain_offset - 21; // part2_3_length precedes big_values + global_gain.
    (0..12).any(|bit| {
        let offset = start + bit;
        side_info[offset / 8] & (1 << (7 - offset % 8)) != 0
    })
}

/// Preflight quét biên độ min/max của global_gain trong tệp MP3
pub fn preflight_check_mp3_gain(
    path: &Path,
    delta_steps: i32,
) -> Result<(u8, u8, i32), String> {
    let mut file = File::open(path).map_err(|e| format!("Không thể mở tệp: {}", e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Lỗi đọc tệp: {}", e))?;

    let mut min_gain = 255u8;
    let mut max_gain = 0u8;
    let mut offset = 0;
    let len = buffer.len();

    // Bỏ qua ID3v2 nếu có
    if len >= 10 && &buffer[0..3] == b"ID3" {
        let tag_size = ((buffer[6] as usize & 0x7F) << 21)
            | ((buffer[7] as usize & 0x7F) << 14)
            | ((buffer[8] as usize & 0x7F) << 7)
            | (buffer[9] as usize & 0x7F);
        offset = 10 + tag_size;
    }

    let mut found_frames = 0;
    let mut active_granules = 0;

    while offset < len {
        if let Some((frame_len, side_info_offset, side_info_len, channel_mode, _)) =
            get_frame_info(&buffer, offset)
        {
            let side_info = &buffer[side_info_offset..side_info_offset + side_info_len];
            let offsets = get_gain_bit_offsets(channel_mode);

            for &bit_offset in offsets {
                if !granule_has_audio(side_info, bit_offset) { continue; }
                active_granules += 1;
                let gain = read_global_gain(side_info, bit_offset);
                if gain < min_gain {
                    min_gain = gain;
                }
                if gain > max_gain {
                    max_gain = gain;
                }
            }

            found_frames += 1;
            offset += frame_len;
        } else {
            offset += 1;
        }
    }

    if found_frames < 3 {
        return Err(format!(
            "Tệp không chứa chuỗi frame MPEG-1 Layer III hợp lệ (tìm thấy {} frame): {}",
            found_frames,
            path.display()
        ));
    }

    if active_granules == 0 { return Err("Không có granule audio để cân bằng".into()); }

    // Kiểm tra ngưỡng 0..255
    let adjusted_delta = if delta_steps > 0 {
        if max_gain as i32 + delta_steps > 255 {
            255 - max_gain as i32
        } else {
            delta_steps
        }
    } else {
        // Very quiet boundary granules may already be at 0. Lower the track;
        // saturate those slots individually and journal their exact values.
        delta_steps
    } ;

    Ok((min_gain, max_gain, adjusted_delta))
}

/// Ghi thẻ tag từ pending patch vào tệp tạm bằng Lofty
pub fn apply_tag_patch_to_temp_file(
    orig_path: &Path,
    temp_file: &mut File,
    patch: &TrackMetadata,
) -> std::io::Result<()> {
    let _ = orig_path;
    crate::metadata::write_metadata_to_file(temp_file, patch)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GainBoundary {
    pub frame: usize,
    pub bit_offset: usize,
    pub original_gain: u8,
}

/// Áp dụng delta steps gain vào một tệp MP3 độc lập qua Two-Phase Commit
pub fn apply_gain_steps_atomic(
    path: &Path,
    journal_path: &Path,
    tx_id: &str,
    safe_delta: i32,
    has_pending_patch: Option<&PendingTagPatch>,
    operation_type: &str,
) -> Result<(), String> {
    apply_gain_steps_with_restore(path, journal_path, tx_id, safe_delta, has_pending_patch, operation_type, &[], false)
}

pub(crate) fn apply_gain_steps_with_restore(path: &Path, journal_path: &Path, tx_id: &str,
    safe_delta: i32, has_pending_patch: Option<&PendingTagPatch>, operation_type: &str,
    restore: &[GainBoundary], restore_empty: bool) -> Result<(), String> {
    let mut buffer = std::fs::read(path).map_err(|e| format!("Không thể đọc tệp: {}", e))?;
    let mut offset = 0;
    let len = buffer.len();

    if len >= 10 && &buffer[0..3] == b"ID3" {
        let tag_size = ((buffer[6] as usize & 0x7F) << 21)
            | ((buffer[7] as usize & 0x7F) << 14)
            | ((buffer[8] as usize & 0x7F) << 7)
            | (buffer[9] as usize & 0x7F);
        offset = 10 + tag_size;
    }

    let mut frame_index = 0;
    let mut boundaries = Vec::new();
    while offset < len {
        if let Some((frame_len, side_info_offset, side_info_len, channel_mode, crc_len)) =
            get_frame_info(&buffer, offset)
        {
            let offsets = get_gain_bit_offsets(channel_mode);

            for &bit_offset in offsets {
                if !restore_empty && !granule_has_audio(&buffer[side_info_offset..side_info_offset + side_info_len], bit_offset) { continue; }
                let old_g = read_global_gain(
                    &buffer[side_info_offset..side_info_offset + side_info_len],
                    bit_offset,
                );
                let raw_gain = old_g as i32 + safe_delta;
                let new_g = if let Some(original) = restore.iter().find(|r| r.frame == frame_index && r.bit_offset == bit_offset) {
                    original.original_gain
                } else {
                    if !(0..=255).contains(&raw_gain) {
                        boundaries.push(GainBoundary { frame: frame_index, bit_offset, original_gain: old_g });
                    }
                    raw_gain.clamp(0, 255) as u8
                };
                write_global_gain(
                    &mut buffer[side_info_offset..side_info_offset + side_info_len],
                    bit_offset,
                    new_g,
                );
            }

            if crc_len == 2 {
                let header_bytes = &buffer[offset + 2..offset + 4];
                let side_info = &buffer[side_info_offset..side_info_offset + side_info_len];
                let new_crc = mpeg_crc16(header_bytes, side_info);
                buffer[offset + 4] = (new_crc >> 8) as u8;
                buffer[offset + 5] = (new_crc & 0xFF) as u8;
            }

            frame_index += 1;
            offset += frame_len;
        } else {
            offset += 1;
        }
    }

    let orig_file_size = buffer.len() as u64;
    let old_metadata = if has_pending_patch.is_some() {
        Some(crate::metadata::read_track_info(path, "mp3")?.metadata)
    } else { None };
    let old_val = serde_json::json!({
        "metadata": old_metadata,
        "gain_steps": 0,
        "undo_steps": safe_delta,
        "size": orig_file_size
    });
    let new_val = serde_json::json!({
        "gain_steps": safe_delta,
        "undo_steps": -safe_delta,
        "boundary_gains": boundaries,
        "tag_merged": has_pending_patch.is_some()
    });

    two_phase_atomic_commit(
        path,
        journal_path,
        tx_id,
        operation_type,
        old_val,
        new_val,
        |temp_file| {
            temp_file.write_all(&buffer)?;
            if let Some(pending) = has_pending_patch {
                apply_tag_patch_to_temp_file(path, temp_file, &pending.patch)?;
            }
            Ok(())
        },
    )
}

// ==============================================================================
// 1. ENGINE ĐO ÂM LƯỢNG THẬT (REAL LOUDNESS MEASUREMENT: EBU R128 & REPLAYGAIN)
// ==============================================================================

/// Decode PCM and measure integrated EBU R128 + oversampled true peak.
/// ReplayGain tags are intentionally not treated as a fresh measurement.
pub fn measure_audio_file(path_str: &str, target_db_spl: f64) -> Result<TrackLoudnessResult, String> {
    measure_audio_file_with_progress(path_str, target_db_spl, &mut |_, _| {})
}

fn measure_audio_file_with_progress(path_str: &str, target_db_spl: f64, on_progress: &mut dyn FnMut(Option<f64>, Option<f64>)) -> Result<TrackLoudnessResult, String> {
    use symphonia::core::{audio::SampleBuffer, codecs::DecoderOptions, formats::FormatOptions,
        io::MediaSourceStream, meta::MetadataOptions, probe::Hint, errors::Error};
    if !target_db_spl.is_finite() || !(60.0..=110.0).contains(&target_db_spl) {
        return Err("Mức âm lượng mục tiêu không hợp lệ".into());
    }
    let file = File::open(path_str).map_err(|e| e.to_string())?;
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path_str).extension().and_then(|e| e.to_str()) { hint.with_extension(ext); }
    let probed = symphonia::default::get_probe().format(&hint,
        MediaSourceStream::new(Box::new(file), Default::default()),
        &FormatOptions::default(), &MetadataOptions::default()).map_err(|e| e.to_string())?;
    let mut format = probed.format;
    let track = format.default_track().ok_or("Không tìm thấy audio track")?;
    let track_id = track.id;
    let total_frames = track.codec_params.n_frames.filter(|n| *n > 0);
    let mut decoded_frames = 0_u64;
    let mut last_progress = std::time::Instant::now();
    on_progress(Some(0.0), None);
    let mut decoder = symphonia::default::get_codecs().make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;
    let mut meter: Option<ebur128::EbuR128> = None;
    let mut spec = None;
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.to_string()),
        };
        if packet.track_id() != track_id { continue; }
        let decoded = decoder.decode(&packet).map_err(|e| e.to_string())?;
        let current_spec = *decoded.spec();
        if spec.is_some() && spec != Some(current_spec) { return Err("Audio đổi cấu hình giữa chừng".into()); }
        if meter.is_none() {
            let channels = current_spec.channels.count();
            if channels > 2 { return Err("Chưa hỗ trợ đo audio nhiều hơn 2 kênh".into()); }
            meter = Some(ebur128::EbuR128::new(channels as u32, current_spec.rate,
                ebur128::Mode::I | ebur128::Mode::TRUE_PEAK).map_err(|e| e.to_string())?);
            spec = Some(current_spec);
        }
        let mut samples = SampleBuffer::<f32>::new(decoded.capacity() as u64, current_spec);
        samples.copy_interleaved_ref(decoded);
        meter.as_mut().unwrap().add_frames_f32(samples.samples()).map_err(|e| e.to_string())?;
        decoded_frames += (samples.samples().len() / current_spec.channels.count()) as u64;
        if last_progress.elapsed().as_millis() >= 50 {
            let preview_db = meter.as_ref().unwrap().loudness_global().ok().filter(|v| v.is_finite()).map(|v| 107.0 + v);
            on_progress(total_frames.map(|total| (decoded_frames as f64 / total as f64).min(0.995)), preview_db);
            last_progress = std::time::Instant::now();
        }
    }
    let meter = meter.ok_or("Không có mẫu audio hợp lệ")?;
    let lufs = meter.loudness_global().map_err(|e| e.to_string())?;
    if !lufs.is_finite() { return Err("Audio im lặng hoặc quá ngắn để đo EBU R128".into()); }
    let mut peak = 0.0_f64;
    for channel in 0..spec.unwrap().channels.count() {
        peak = peak.max(meter.true_peak(channel as u32).map_err(|e| e.to_string())?);
    }
    let true_peak = if peak > 0.0 { 20.0 * peak.log10() } else { -120.0 };
    let measured_db_spl = 107.0 + lufs;
    let target_gain_db = target_db_spl - measured_db_spl;
    Ok(TrackLoudnessResult {
        file_path: path_str.into(), measured_lufs: lufs, measured_db_spl,
        measured_true_peak_dbtp: true_peak, clipping_risk: true_peak + target_gain_db > 0.0,
        target_db_spl, target_gain_db, gain_step_db: GAIN_STEP_DB,
        mp3_gain_steps: calculate_gain_steps(measured_db_spl, target_db_spl), mp3_undo_available: false,
    })
}

fn measured_track(path: &str, m: &TrackLoudnessResult) -> Result<crate::metadata::AudioTrack, String> {
    let p = Path::new(path);
    let mut track = crate::metadata::read_track_info(p, p.extension().and_then(|e| e.to_str()).unwrap_or(""))?;
    track.loudness = Some(crate::metadata::LoudnessData {
        measured_lufs: m.measured_lufs, measured_db_spl: m.measured_db_spl,
        measured_true_peak_dbtp: m.measured_true_peak_dbtp,
        predicted_true_peak_dbtp: m.measured_true_peak_dbtp + m.target_gain_db,
        clipping_risk: m.clipping_risk, target_db_spl: m.target_db_spl,
        target_gain_db: m.target_gain_db, gain_step_db: m.gain_step_db,
        mp3_gain_steps: m.mp3_gain_steps, mp3_undo_available: false,
    });
    Ok(track)
}

#[tauri::command]
pub async fn batch_analyze_loudness(paths: Vec<String>, target_db_spl: f64,
    on_progress: tauri::ipc::Channel<serde_json::Value>) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        analyze_with_progress(paths, target_db_spl, &mut |event| {
            let _ = on_progress.send(event);
        })
    }).await.map_err(|e| e.to_string())
}

pub(crate) fn analyze_with_progress(paths: Vec<String>, target: f64,
    emit: &mut dyn FnMut(serde_json::Value)) -> serde_json::Value {
    let total = paths.len();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    for (index, path) in paths.into_iter().enumerate() {
        let measured = measure_audio_file_with_progress(&path, target, &mut |percent, preview_db| {
            emit(serde_json::json!({"action":"measure", "file_path":path, "total":total,
                "completed":index, "percent":percent, "preview_db":preview_db, "stage":"Đang đo", "status":"running"}));
        });
        match measured {
            Ok(result) => {
                emit(serde_json::json!({"action":"measure", "file_path":path, "total":total,
                    "completed":index+1, "percent":1.0, "stage":"Đã đo", "status":"done", "measurement":result}));
                results.push(result);
            }
            Err(message) => {
                emit(serde_json::json!({"action":"measure", "file_path":path, "total":total,
                    "completed":index+1, "percent":1.0, "stage":"Lỗi đo", "status":"failed", "message":message}));
                errors.push(serde_json::json!({"file_path":path, "message":message}));
            }
        }
    }
    serde_json::json!({"results":results, "errors":errors})
}

#[tauri::command]
pub async fn apply_lossless_mp3_gain(app: tauri::AppHandle, payload: ApplyLosslessGainPayload,
    on_progress: tauri::ipc::Channel<serde_json::Value>) -> Result<serde_json::Value, String> {
    let journal = get_journal_path(&app);
    tauri::async_runtime::spawn_blocking(move || {let _guard=crate::transaction::MUTATION_LOCK.lock().map_err(|_|"MUTATION_BUSY")?;crate::transaction::mutation_available()?;crate::transaction::journal_settled(&journal)?;apply_lossless_gain_with_progress(payload, &journal, &mut |event| {
        let _ = on_progress.send(event);
    })}).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
pub(crate) fn apply_lossless_gain_at_path(payload: ApplyLosslessGainPayload, journal: &Path) -> Result<serde_json::Value, String> {
    apply_lossless_gain_with_progress(payload, journal, &mut |_| {})
}

/// Every input gets an explicit outcome, including no-op/limited/failure.
/// Progress represents decoded samples and completed phases, never a timer.
pub(crate) fn apply_lossless_gain_with_progress(payload: ApplyLosslessGainPayload, journal: &Path,
    emit: &mut dyn FnMut(serde_json::Value)) -> Result<serde_json::Value, String> {
    if payload.track_ids.len() != payload.file_paths.len() { return Err("Danh sách bài và đường dẫn không khớp".into()); }
    let tx = Uuid::new_v4().to_string();
    let total = payload.file_paths.len();
    let mut modified = Vec::new();
    let mut warnings = Vec::new();
    let mut outcomes = Vec::new();
    for (index, (id, path)) in payload.track_ids.iter().zip(&payload.file_paths).enumerate() {
        let patch = payload.pending_patches.as_ref().and_then(|patches| patches.iter().find(|p| &p.track_id == id));
        let result = process_gain_file(path, id, payload.target_db_spl, payload.allow_clipping, patch, journal, &tx,
            &mut |percent, stage| {
                emit(serde_json::json!({"action":"gain", "track_id":id, "file_path":path,
                    "total":total, "completed":index, "percent":percent, "stage":stage, "status":"running"}));
            });
        match result {
            Ok(result) => {
                let outcome = serde_json::json!({"track_id":id, "path":path, "status":result.status,
                    "message":result.message, "applied_steps":result.applied_steps});
                if let Some(message) = &result.message { warnings.push(serde_json::json!({"track_id":id, "message":message})); }
                emit(serde_json::json!({"action":"gain", "track_id":id, "file_path":path,
                    "total":total, "completed":index+1, "percent":1.0, "stage":"Hoàn tất",
                    "status":result.status, "message":result.message, "track":result.track, "tags_merged":result.tags_merged}));
                outcomes.push(outcome); modified.push(result);
            }
            Err(message) => {
                let outcome = serde_json::json!({"track_id":id, "path":path, "status":"failed", "message":message});
                emit(serde_json::json!({"action":"gain", "track_id":id, "file_path":path,
                    "total":total, "completed":index+1, "percent":1.0, "stage":"Lỗi", "status":"failed", "message":message}));
                warnings.push(serde_json::json!({"track_id":id, "message":message})); outcomes.push(outcome);
            }
        }
    }
    Ok(serde_json::json!({"transaction_id":tx, "modified_tracks":modified, "warnings":warnings, "outcomes":outcomes}))
}

fn process_gain_file(path: &str, id: &str, target: f64, allow_clipping: bool,
    patch: Option<&PendingTagPatch>, journal: &Path, tx: &str,
    progress: &mut dyn FnMut(Option<f64>, &str)) -> Result<ModifiedTrackResult, String> {
    let p = Path::new(path);
    if !p.extension().and_then(|e| e.to_str()).is_some_and(|e| e.eq_ignore_ascii_case("mp3")) {
        return Err("Định dạng này không hỗ trợ gain MP3 lossless".into());
    }
    let before = measure_audio_file_with_progress(path, target, &mut |percent, _| progress(percent.map(|v| v * 0.4), "Đo trước cân bằng"))?;
    let requested = calculate_gain_steps(before.measured_db_spl, target);
    let mut delta = requested;
    let mut reasons = Vec::new();
    if !allow_clipping && delta > 0 {
        let headroom = (-before.measured_true_peak_dbtp / GAIN_STEP_DB).floor().max(0.0) as i32;
        if delta > headroom { delta = headroom; reasons.push("Giới hạn tăng gain để tránh clipping"); }
    }
    progress(Some(0.4), "Kiểm tra bitstream");
    let (_, _, safe) = preflight_check_mp3_gain(p, delta)?;
    if safe != delta { reasons.push("Giới hạn gain của phần audio ở ngưỡng 0–255"); }
    if safe != 0 || patch.is_some() {
        progress(Some(0.5), "Ghi tệp và xác nhận commit");
        apply_gain_steps_atomic(p, journal, tx, safe, patch, "mp3_gain")?;
    }
    let after = if safe != 0 {
        measure_audio_file_with_progress(path, target, &mut |percent, _| progress(percent.map(|v| 0.6 + v * 0.39), "Đo lại tệp đã ghi"))?
    } else { before };
    let track = measured_track(path, &after)?;
    let status = if safe != requested { "limited" } else if safe == 0 { "unchanged" } else { "changed" };
    let message = if reasons.is_empty() { if safe == 0 { Some("Đã nằm trong sai số một nấc MP3 (±0,75 dB)".into()) } else { None } }
        else { Some(format!("{}; đạt {:.1} / {:.1} dB", reasons.join("; "), after.measured_db_spl, target)) };
    Ok(ModifiedTrackResult { track_id:id.into(), path:path.into(), applied_steps:safe,
        actual_db_change:safe as f64 * GAIN_STEP_DB, new_db_spl:after.measured_db_spl,
        tags_merged:patch.is_some(), status:status.into(), message, track })
}

// ==============================================================================
// 2. UNIT TESTS KIỂM CHỨNG BITSTREAM, CRC-16 VÀ LOUDNESS MEASUREMENT
// ==============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_gain_steps() {
        assert_eq!(calculate_gain_steps(89.0, 89.0), 0);
        // +3.0 dB lệch ~ 2 nấc (+3.01 dB)
        assert_eq!(calculate_gain_steps(86.0, 89.0), 2);
        // -3.0 dB lệch ~ -2 nấc (-3.01 dB)
        assert_eq!(calculate_gain_steps(92.0, 89.0), -2);
    }

    #[test]
    fn test_global_gain_read_write_stereo() {
        // MPEG-1 Stereo side information dài 32 bytes (256 bits)
        let mut side_info = [0u8; 32];
        let offsets = [41usize, 100usize, 159usize, 218usize];
        let test_values = [142u8, 175u8, 120u8, 215u8];

        for (&offset, &val) in offsets.iter().zip(test_values.iter()) {
            write_global_gain(&mut side_info, offset, val);
        }

        for (&offset, &expected) in offsets.iter().zip(test_values.iter()) {
            let read_back = read_global_gain(&side_info, offset);
            assert_eq!(read_back, expected, "Giá trị tại bit offset {} không khớp", offset);
        }

        // Tăng thêm +2 nấc gain
        for &offset in &offsets {
            let current = read_global_gain(&side_info, offset);
            write_global_gain(&mut side_info, offset, current + 2);
        }

        for (&offset, &expected) in offsets.iter().zip(test_values.iter()) {
            let read_back = read_global_gain(&side_info, offset);
            assert_eq!(read_back, expected + 2);
        }
    }

    #[test]
    fn test_global_gain_read_write_mono() {
        // MPEG-1 Mono side information dài 17 bytes (136 bits)
        let mut side_info = [0u8; 17];
        let offsets = [39usize, 98usize];
        let test_values = [155u8, 168u8];

        for (&offset, &val) in offsets.iter().zip(test_values.iter()) {
            write_global_gain(&mut side_info, offset, val);
        }

        for (&offset, &expected) in offsets.iter().zip(test_values.iter()) {
            let read_back = read_global_gain(&side_info, offset);
            assert_eq!(read_back, expected);
        }
    }

    #[test]
    fn test_mpeg_crc16() {
        let header_bytes = [0x90, 0x00];
        let side_info = [0x55u8; 32];
        let crc = mpeg_crc16(&header_bytes, &side_info);
        assert_ne!(crc, 0);
        // Kiểm tra tính đơn định (deterministic)
        assert_eq!(crc, mpeg_crc16(&header_bytes, &side_info));
    }

    #[test]
    fn test_wav_loudness_measurement() {
        // Tạo một buffer WAV 16-bit PCM Mono đơn giản
        let mut wav_bytes = Vec::new();
        // RIFF header
        wav_bytes.extend_from_slice(b"RIFF");
        let file_size = 44u32 + 88200u32;
        wav_bytes.extend_from_slice(&(file_size - 8).to_le_bytes());
        wav_bytes.extend_from_slice(b"WAVE");

        // fmt chunk
        wav_bytes.extend_from_slice(b"fmt ");
        wav_bytes.extend_from_slice(&16u32.to_le_bytes());
        wav_bytes.extend_from_slice(&1u16.to_le_bytes()); // PCM
        wav_bytes.extend_from_slice(&1u16.to_le_bytes()); // 1 channel
        wav_bytes.extend_from_slice(&44100u32.to_le_bytes()); // 44100 Hz
        wav_bytes.extend_from_slice(&(44100u32 * 2).to_le_bytes()); // byte rate
        wav_bytes.extend_from_slice(&2u16.to_le_bytes()); // block align
        wav_bytes.extend_from_slice(&16u16.to_le_bytes()); // bits per sample

        // data chunk: 1 giây âm thanh sine ~1000Hz ở biên độ 0.5 (-6 dBFS)
        wav_bytes.extend_from_slice(b"data");
        let data_len = 88200u32;
        wav_bytes.extend_from_slice(&data_len.to_le_bytes());

        for i in 0..44100 {
            let t = i as f64 / 44100.0;
            let sample = (0.5 * (2.0 * std::f64::consts::PI * 1000.0 * t).sin() * 32767.0) as i16;
            wav_bytes.extend_from_slice(&sample.to_le_bytes());
        }

        let path = std::env::temp_dir().join(format!("vx_wav_{}.wav", Uuid::new_v4()));
        std::fs::write(&path, &wav_bytes).unwrap();
        let res = measure_audio_file(path.to_str().unwrap(), 89.0).expect("WAV measure failed");
        std::fs::remove_file(path).unwrap();
        // Peak biên độ 0.5 tương đương khoảng -6.0 dBTP
        assert!((res.measured_true_peak_dbtp - (-6.02)).abs() < 0.2);
        // LUFS nằm trong dải âm thanh hợp lệ
        assert!(res.measured_lufs > -40.0 && res.measured_lufs < 0.0);
        assert!(res.measured_db_spl > 60.0 && res.measured_db_spl < 110.0);
    }
}

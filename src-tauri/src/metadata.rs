use lofty::config::WriteOptions;
use lofty::file::AudioFile;
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::Tag;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::transaction::{get_journal_path, two_phase_atomic_commit};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverArtInfo {
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: usize,
    pub thumbnail_data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackMetadata {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub total_tracks: Option<u32>,
    pub disc_number: Option<u32>,
    pub total_discs: Option<u32>,
    pub year: Option<u32>,
    pub genre: String,
    pub composer: Option<String>,
    pub comment: Option<String>,
    pub lyrics: Option<String>,
    pub cover_art: Option<CoverArtInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoudnessData {
    pub measured_lufs: f64,
    pub measured_db_spl: f64,
    pub measured_true_peak_dbtp: f64,
    pub predicted_true_peak_dbtp: f64,
    pub clipping_risk: bool,
    pub target_db_spl: f64,
    pub target_gain_db: f64,
    pub gain_step_db: f64,
    pub mp3_gain_steps: i32,
    pub mp3_undo_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTrack {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub extension: String,
    pub size_bytes: u64,
    pub duration_seconds: f64,
    pub sample_rate: u32,
    pub bitrate_kbps: u32,
    pub channels: u8,
    pub tag_version: String,
    pub audio_stream_hash: Option<String>,
    pub metadata: TrackMetadata,
    pub loudness: Option<LoudnessData>,
    pub pending_metadata: Option<TrackMetadata>,
}

#[derive(Debug, Deserialize)]
pub struct TagPatch {
    pub track_id: String,
    pub path: String,
    pub patch: TrackMetadata,
}

#[tauri::command]
pub async fn pick_directory() -> Result<Option<String>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Chọn thư mục chứa tệp nhạc")
        .pick_folder()
        .await;

    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub fn scan_audio_directory(
    dir_path: String,
    recursive: bool,
) -> Result<serde_json::Value, String> {
    let root = Path::new(&dir_path);
    if !root.exists() || !root.is_dir() {
        return Err("Thư mục không tồn tại hoặc không hợp lệ".to_string());
    }

    let mut tracks = Vec::new();
    let mut total_scanned = 0;
    let mut unsupported_count = 0;

    let walker = if recursive {
        WalkDir::new(root).into_iter()
    } else {
        WalkDir::new(root).max_depth(1).into_iter()
    };

    for entry in walker.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();

            if matches!(
                ext.as_str(),
                "mp3" | "flac" | "m4a" | "ogg" | "opus" | "wav"
            ) {
                total_scanned += 1;
                if let Ok(track) = read_track_info(path, &ext) {
                    tracks.push(track);
                } else {
                    unsupported_count += 1;
                }
            }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "tracks": tracks,
        "total_scanned": total_scanned,
        "unsupported_count": unsupported_count
    }))
}

pub(crate) fn read_track_info(path: &Path, ext: &str) -> Result<AudioTrack, String> {
    let metadata_fs = fs::metadata(path).map_err(|e| e.to_string())?;
    let size_bytes = metadata_fs.len();
    let filename = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    let tagged_file = Probe::open(path)
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;

    let properties = tagged_file.properties();
    let duration_seconds = properties.duration().as_secs_f64();
    let sample_rate = properties.sample_rate().unwrap_or(44100);
    let bitrate_kbps = properties.audio_bitrate().unwrap_or(320);
    let channels = properties.channels().unwrap_or(2);

    let tag_version = format!("{:?}", tagged_file.primary_tag_type());

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    let (title, artist, album, genre, track_num, total_tracks, year, comment, cover_art) =
        if let Some(t) = tag {
            let title = t.title().as_deref().unwrap_or("").to_string();
            let artist = t.artist().as_deref().unwrap_or("").to_string();
            let album = t.album().as_deref().unwrap_or("").to_string();
            let genre = t.genre().as_deref().unwrap_or("").to_string();
            let track_num = t.track();
            let total_tracks = t.track_total();
            let year = t.year();
            let comment = t.comment().as_deref().unwrap_or("").to_string();

            let cover = t.pictures().first().map(|pic| {
                let data = pic.data();
                let mime = match pic.mime_type() {
                    Some(m) => m.to_string(),
                    None => "image/jpeg".to_string(),
                };
                let base64_str = base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    data,
                );
                CoverArtInfo {
                    mime_type: mime.clone(),
                    width: 500,
                    height: 500,
                    size_bytes: data.len(),
                    thumbnail_data_url: format!("data:{};base64,{}", mime, base64_str),
                }
            });

            (
                title,
                artist,
                album,
                genre,
                track_num,
                total_tracks,
                year,
                if comment.is_empty() { None } else { Some(comment) },
                cover,
            )
        } else {
            (
                String::new(),
                "".to_string(),
                "".to_string(),
                "".to_string(),
                None,
                None,
                None,
                None,
                None,
            )
        };

    Ok(AudioTrack {
        id: path.to_string_lossy().to_string(),
        path: path.to_string_lossy().to_string(),
        filename,
        extension: ext.to_string(),
        size_bytes,
        duration_seconds,
        sample_rate,
        bitrate_kbps,
        channels,
        tag_version,
        audio_stream_hash: None,
        metadata: TrackMetadata {
            title,
            artist,
            album,
            album_artist: tag.and_then(|t| t.get_string(&ItemKey::AlbumArtist)).map(str::to_owned),
            track_number: track_num,
            total_tracks,
            disc_number: tag.and_then(|t| t.disk()),
            total_discs: tag.and_then(|t| t.disk_total()),
            year,
            genre,
            composer: tag.and_then(|t| t.get_string(&ItemKey::Composer)).map(str::to_owned),
            comment,
            lyrics: tag.and_then(|t| t.get_string(&ItemKey::Lyrics)).map(str::to_owned),
            cover_art,
        },
        loudness: None,
        pending_metadata: None,
    })
}

#[tauri::command]
pub async fn apply_batch_tags(app: tauri::AppHandle, updates: Vec<TagPatch>) -> Result<serde_json::Value, String> {
    let journal = get_journal_path(&app);
    tauri::async_runtime::spawn_blocking(move || {let _guard=crate::transaction::MUTATION_LOCK.lock().map_err(|_|"MUTATION_BUSY")?;crate::transaction::mutation_available()?;crate::transaction::journal_settled(&journal)?;apply_batch_tags_at_path(updates, &journal)})
        .await.map_err(|e| e.to_string())?
}

pub(crate) fn apply_batch_tags_at_path(updates: Vec<TagPatch>, journal_path: &Path) -> Result<serde_json::Value, String> {
    let transaction_id = Uuid::new_v4().to_string();
    let mut success_count = 0;
    let mut failed_count = 0;
    let mut success_track_ids = Vec::new();
    let mut errors = Vec::new();
    let mut updated_tracks = Vec::new();

    for item in updates {
        let p = PathBuf::from(&item.path);
        if !p.exists() {
            failed_count += 1;
            errors.push(serde_json::json!({
                "track_id": item.track_id,
                "error_code": "FILE_NOT_FOUND",
                "message": format!("Tệp không tồn tại: {}", item.path)
            }));
            continue;
        }

        let old_metadata = read_track_info(&p, "")
            .map(|t| serde_json::to_value(&t.metadata).unwrap_or_default())
            .unwrap_or(serde_json::Value::Null);
        let new_metadata = serde_json::to_value(&item.patch).unwrap_or_default();

        let patch = item.patch.clone();
        let track_id_clone = item.track_id.clone();
        let write_res = two_phase_atomic_commit(
            &p,
            &journal_path,
            &transaction_id,
            "tag_edit",
            old_metadata,
            new_metadata,
            |temp_file| {
                use std::io::Seek;

                // 1. Sao chép toàn bộ tệp nguồn vào tệp tạm trước (bảo toàn 100% audio payload)
                let mut source = fs::File::open(&p)?;
                std::io::copy(&mut source, temp_file)?;
                temp_file.rewind()?;

                write_metadata_to_file(temp_file, &patch)?;
                Ok(())
            },
        );

        match write_res {
            Ok(_) => {
                success_count += 1;
                success_track_ids.push(track_id_clone.clone());
                if let Ok(mut track) = read_track_info(&p, p.extension().and_then(|e| e.to_str()).unwrap_or("")) {
                    track.id = track_id_clone;
                    updated_tracks.push(track);
                }
            }
            Err(e) => {
                failed_count += 1;
                errors.push(serde_json::json!({
                    "track_id": item.track_id,
                    "error_code": "WRITE_FAILED",
                    "message": e
                }));
            }
        }
    }

    Ok(serde_json::json!({
        "transaction_id": transaction_id,
        "success_count": success_count,
        "failed_count": failed_count,
        "success_track_ids": success_track_ids,
        "errors": errors,
        "updated_tracks": updated_tracks
    }))
}

/// Full metadata snapshot: all exposed fields support setting and clearing.
/// Probe the temporary file so an earlier bitstream gain is preserved.
pub(crate) fn write_metadata_to_file(file: &mut fs::File, patch: &TrackMetadata) -> std::io::Result<()> {
    use std::io::{Error, ErrorKind, Seek};
    use lofty::picture::{Picture, PictureType, MimeType};
    file.rewind()?;
    let mut tagged = Probe::new(&mut *file).guess_file_type()?.read()
        .map_err(|e| Error::new(ErrorKind::InvalidData, e))?;
    if tagged.primary_tag().is_none() {
        tagged.insert_tag(Tag::new(tagged.primary_tag_type()));
    }
    let tag = tagged.primary_tag_mut().unwrap();
    tag.set_title(patch.title.clone());
    tag.set_artist(patch.artist.clone());
    tag.set_album(patch.album.clone());
    tag.set_genre(patch.genre.clone());
    macro_rules! number {
        ($value:expr, $set:ident, $remove:ident) => {
            if let Some(value) = $value { tag.$set(value); } else { tag.$remove(); }
        }
    }
    number!(patch.track_number, set_track, remove_track);
    number!(patch.total_tracks, set_track_total, remove_track_total);
    number!(patch.disc_number, set_disk, remove_disk);
    number!(patch.total_discs, set_disk_total, remove_disk_total);
    number!(patch.year, set_year, remove_year);
    for (key, value) in [
        (ItemKey::AlbumArtist, &patch.album_artist),
        (ItemKey::Composer, &patch.composer),
        (ItemKey::Comment, &patch.comment),
        (ItemKey::Lyrics, &patch.lyrics),
    ] {
        tag.remove_key(&key);
        if let Some(value) = value.as_ref().filter(|s| !s.is_empty()) { tag.insert_text(key, value.clone()); }
    }
    if patch.cover_art.is_none() { while !tag.pictures().is_empty() { tag.remove_picture(0); } }
    if let Some(cover) = &patch.cover_art {
        let (_, encoded) = cover.thumbnail_data_url.split_once(",")
            .ok_or_else(|| Error::new(ErrorKind::InvalidData, "Ảnh bìa không hợp lệ"))?;
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded)
            .map_err(|e| Error::new(ErrorKind::InvalidData, e))?;
        // A text-only edit must retain additional embedded pictures.
        if tag.pictures().first().map(|p| p.data()) != Some(bytes.as_slice()) {
            while !tag.pictures().is_empty() { tag.remove_picture(0); }
            let picture = Picture::new_unchecked(PictureType::CoverFront, Some(MimeType::from_str(&cover.mime_type)), None, bytes);
            tag.push_picture(picture);
        }
    }
    file.rewind()?;
    tagged.save_to(&mut *file, WriteOptions::default()).map_err(|e| Error::new(ErrorKind::Other, e))?;
    file.rewind()?;
    let saved = Probe::new(&mut *file).guess_file_type()?.read().map_err(|e| Error::new(ErrorKind::InvalidData, e))?;
    let tag = saved.primary_tag().ok_or_else(|| Error::new(ErrorKind::InvalidData, "Không đọc lại được metadata đã ghi"))?;
    let mismatch = || Error::new(ErrorKind::InvalidData, "Định dạng tệp không lưu đầy đủ metadata; giữ nguyên tệp gốc");
    for (actual, expected) in [(tag.title(), &patch.title), (tag.artist(), &patch.artist), (tag.album(), &patch.album), (tag.genre(), &patch.genre)] {
        if actual.as_deref().unwrap_or("") != expected { return Err(mismatch()); }
    }
    for (actual, expected) in [(tag.track(), patch.track_number), (tag.track_total(), patch.total_tracks),
        (tag.disk(), patch.disc_number), (tag.disk_total(), patch.total_discs), (tag.year(), patch.year)] {
        if actual != expected { return Err(mismatch()); }
    }
    for (key, expected) in [(ItemKey::AlbumArtist, &patch.album_artist), (ItemKey::Composer, &patch.composer),
        (ItemKey::Comment, &patch.comment), (ItemKey::Lyrics, &patch.lyrics)] {
        if tag.get_string(&key).unwrap_or("") != expected.as_deref().unwrap_or("") { return Err(mismatch()); }
    }
    if let Some(cover) = &patch.cover_art {
        let encoded = cover.thumbnail_data_url.split_once(",").unwrap().1;
        let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded).unwrap();
        if tag.pictures().first().map(|p| p.data()) != Some(bytes.as_slice()) { return Err(mismatch()); }
    } else if !tag.pictures().is_empty() { return Err(mismatch()); }
    Ok(())
}

#[tauri::command]
pub async fn read_audio_tracks(paths: Vec<String>, target_db_spl: Option<f64>) -> Result<Vec<AudioTrack>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        paths.into_iter().map(|path| {
            let p = Path::new(&path);
            let mut track = read_track_info(p, p.extension().and_then(|s| s.to_str()).unwrap_or(""))?;
            if let Some(target) = target_db_spl {
                let m = crate::audio_core::measure_audio_file(&path, target)?;
                track.loudness = Some(LoudnessData {
                    measured_lufs: m.measured_lufs, measured_db_spl: m.measured_db_spl,
                    measured_true_peak_dbtp: m.measured_true_peak_dbtp,
                    predicted_true_peak_dbtp: m.measured_true_peak_dbtp + m.target_gain_db,
                    clipping_risk: m.clipping_risk, target_db_spl: target, target_gain_db: m.target_gain_db,
                    gain_step_db: m.gain_step_db, mp3_gain_steps: m.mp3_gain_steps, mp3_undo_available: false,
                });
            }
            Ok(track)
        }).collect()
    }).await.map_err(|e| e.to_string())?
}

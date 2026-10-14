use crate::{audio_core::*, metadata::*, transaction::*};
use std::{fs, path::PathBuf};
use uuid::Uuid;
use lofty::{prelude::*, probe::Probe, config::WriteOptions};

struct Fixture { dir: PathBuf, path: PathBuf, journal: PathBuf }
impl Fixture {
    fn new(mono: bool) -> Self {
        let dir = std::env::temp_dir().join(format!("vx_mp3_test_{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("tone.mp3");
        fs::write(&path, if mono { include_bytes!("../fixtures/tone_1_channels.mp3").as_slice() }
            else { include_bytes!("../fixtures/tone_2_channels.mp3").as_slice() }).unwrap();
        let journal = dir.join("journal.jsonl");
        Self { dir, path, journal }
    }
    fn info(&self) -> AudioTrack { read_track_info(&self.path, "mp3").unwrap() }
    fn measure(&self) -> TrackLoudnessResult { measure_audio_file(self.path.to_str().unwrap(), 89.0).unwrap() }
    fn tags(&self, patch: TrackMetadata) -> serde_json::Value {
        let t = self.info();
        apply_batch_tags_at_path(vec![TagPatch { track_id: t.id, path: t.path, patch }], &self.journal).unwrap()
    }
}
impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.dir); } }

fn populated(mut m: TrackMetadata) -> TrackMetadata {
    m.title = "Bài hát kiểm thử tiếng Việt".into(); m.artist = "Nghệ sĩ".into();
    m.album = "Album thử".into(); m.album_artist = Some("Nhóm thử".into());
    m.genre = "Pop".into(); m.composer = Some("Tác giả".into());
    m.comment = Some("Ghi chú mới".into()); m.lyrics = Some("Lời bài hát\nDòng hai".into());
    m.track_number = Some(3); m.total_tracks = Some(12); m.disc_number = Some(2); m.total_discs = Some(3); m.year = Some(2026);
    m.cover_art = Some(CoverArtInfo { mime_type: "image/png".into(), width: 500, height: 500, size_bytes: 68,
        thumbnail_data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=".into() });
    m
}

#[test]
fn metadata_all_fields_clear_and_undo_roundtrip_preserves_audio() {
    let f = Fixture::new(false); let before = f.measure(); let original = f.info();
    let patch = populated(original.metadata.clone());
    assert_eq!(f.tags(patch.clone())["success_count"], 1);
    let after = f.info();
    assert_eq!(serde_json::to_value(&after.metadata).unwrap(), serde_json::to_value(&patch).unwrap());
    assert_eq!(after.id, original.id);
    assert!((f.measure().measured_lufs - before.measured_lufs).abs() < 0.0001);
    let clear = original.metadata.clone();
    assert_eq!(f.tags(clear.clone())["success_count"], 1);
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(), serde_json::to_value(clear).unwrap());
    undo_operation_at_path(&f.journal).unwrap();
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(), serde_json::to_value(&patch).unwrap());
    undo_operation_at_path(&f.journal).unwrap();
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(), serde_json::to_value(original.metadata).unwrap());
}

#[test]
fn gain_rescan_and_inverse_are_real_for_mono_and_stereo() {
    for mono in [true, false] {
        let f = Fixture::new(mono); let original_bytes = fs::read(&f.path).unwrap();
        let before = f.measure();
        assert_eq!(preflight_check_mp3_gain(&f.path, 2).unwrap().2, 2);
        apply_gain_steps_atomic(&f.path, &f.journal, "gain", 2, None, "mp3_gain").unwrap();
        let after = f.measure();
        assert!((after.measured_db_spl - before.measured_db_spl - 2.0 * GAIN_STEP_DB).abs() < 0.03);
        assert!((f.measure().measured_db_spl - after.measured_db_spl).abs() < 0.00001);
        undo_operation_at_path(&f.journal).unwrap();
        assert_eq!(fs::read(&f.path).unwrap(), original_bytes);
    }
}

#[test]
fn batch_ignores_stale_ui_db_and_replaygain_and_preserves_piggyback_gain() {
    let f = Fixture::new(false);
    let mut tagged = Probe::open(&f.path).unwrap().read().unwrap();
    tagged.insert_tag(lofty::tag::Tag::new(lofty::tag::TagType::Id3v2));
    tagged.primary_tag_mut().unwrap().insert_text(ItemKey::ReplayGainTrackGain, "-40.0 dB".into());
    tagged.save_to_path(&f.path, WriteOptions::default()).unwrap();
    let before = f.measure(); let t = f.info(); let old = t.metadata.clone(); let patch = populated(old.clone());
    let res = apply_lossless_gain_at_path(ApplyLosslessGainPayload {
        track_ids: vec![t.id.clone(), "missing".into()], file_paths: vec![t.path.clone(), f.dir.join("missing.mp3").to_string_lossy().into()],
        target_db_spl: before.measured_db_spl + 3.0, current_db_spls: vec![110.0, 110.0], allow_clipping: false,
        pending_patches: Some(vec![PendingTagPatch { track_id: t.id, patch: patch.clone() }]),
    }, &f.journal).unwrap();
    assert_eq!(res["modified_tracks"].as_array().unwrap().len(), 1);
    assert_eq!(res["warnings"].as_array().unwrap().len(), 1);
    assert!((f.measure().measured_db_spl - before.measured_db_spl - 2.0 * GAIN_STEP_DB).abs() < 0.03);
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(), serde_json::to_value(patch).unwrap());
    undo_operation_at_path(&f.journal).unwrap();
    assert!((f.measure().measured_db_spl - before.measured_db_spl).abs() < 0.001);
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(), serde_json::to_value(old).unwrap());
}

#[test]
fn invalid_audio_and_failed_tag_write_leave_source_unchanged() {
    let f = Fixture::new(false); let before = fs::read(&f.path).unwrap();
    let mut patch = f.info().metadata;
    patch.cover_art = Some(CoverArtInfo { mime_type: "image/png".into(), width: 1, height: 1, size_bytes: 0, thumbnail_data_url: "bad".into() });
    assert_eq!(f.tags(patch)["failed_count"], 1);
    assert_eq!(fs::read(&f.path).unwrap(), before);
    fs::write(f.dir.join("bad.mp3"), b"invalid").unwrap();
    assert!(measure_audio_file(f.dir.join("bad.mp3").to_str().unwrap(), 89.0).is_err());
    assert!(measure_audio_file(f.path.to_str().unwrap(), f64::NAN).is_err());
}

#[test]
fn repeated_batch_is_idempotent_and_clipping_is_limited() {
    let f = Fixture::new(false);
    let before = f.measure();
    let t = f.info();
    let run = |target| apply_lossless_gain_at_path(ApplyLosslessGainPayload {
        track_ids: vec![t.id.clone()], file_paths: vec![t.path.clone()], target_db_spl: target,
        current_db_spls: vec![60.0], allow_clipping: false, pending_patches: None,
    }, &f.journal).unwrap();
    let target = before.measured_db_spl + 3.0;
    run(target);
    let bytes = fs::read(&f.path).unwrap();
    let repeat = run(target);
    assert_eq!(repeat["modified_tracks"][0]["applied_steps"], 0);
    assert_eq!(fs::read(&f.path).unwrap(), bytes);
    let loud = run(110.0);
    assert!(!loud["warnings"].as_array().unwrap().is_empty());
    assert!(f.measure().measured_true_peak_dbtp <= 0.01);
}

#[test]
fn mixed_tag_batch_retains_success_and_reports_missing_file() {
    let f = Fixture::new(false); let t = f.info(); let patch = populated(t.metadata.clone());
    let result = apply_batch_tags_at_path(vec![
        TagPatch { track_id: t.id.clone(), path: t.path.clone(), patch: patch.clone() },
        TagPatch { track_id: "missing".into(), path: f.dir.join("missing.mp3").to_string_lossy().into(), patch },
    ], &f.journal).unwrap();
    assert_eq!(result["success_count"], 1); assert_eq!(result["failed_count"], 1);
    assert_eq!(result["updated_tracks"][0]["id"], t.id);
}

#[test]
fn text_edit_preserves_other_embedded_pictures_and_unknown_tags() {
    let f = Fixture::new(false); f.tags(populated(f.info().metadata));
    let mut tagged = Probe::open(&f.path).unwrap().read().unwrap();
    let tag = tagged.primary_tag_mut().unwrap();
    let pic = tag.pictures()[0].clone();
    let extra = lofty::picture::Picture::new_unchecked(lofty::picture::PictureType::CoverBack, pic.mime_type().cloned(), Some("Back".into()), pic.data().to_vec());
    tag.push_picture(extra);
    tag.insert_text(ItemKey::CopyrightMessage, "Preserved".into());
    tagged.save_to_path(&f.path, WriteOptions::default()).unwrap();
    let mut patch = f.info().metadata; patch.title = "Text only".into();
    assert_eq!(f.tags(patch)["success_count"], 1);
    let saved = Probe::open(&f.path).unwrap().read().unwrap(); let tag = saved.primary_tag().unwrap();
    assert_eq!(tag.pictures().len(), 2);
    assert_eq!(tag.get_string(&ItemKey::CopyrightMessage), Some("Preserved"));
}

#[test]
fn empty_zero_gain_granules_do_not_block_decrease_and_undo_is_exact() {
    for mono in [true, false] {
        let f = Fixture::new(mono); let before = f.measure(); let original = fs::read(&f.path).unwrap();
        let (_, _, safe) = preflight_check_mp3_gain(&f.path, -4).unwrap();
        assert_eq!(safe, -4);
        apply_gain_steps_atomic(&f.path, &f.journal, "lower", safe, None, "mp3_gain").unwrap();
        assert!((f.measure().measured_db_spl - before.measured_db_spl + 4.0 * GAIN_STEP_DB).abs() < 0.03);
        undo_operation_at_path(&f.journal).unwrap();
        assert_eq!(fs::read(&f.path).unwrap(), original);
    }
}

#[test]
fn active_gain_boundary_saturation_has_exact_inverse_even_with_piggyback() {
    let f = Fixture::new(false); let mut bytes = fs::read(&f.path).unwrap();
    let mut offset = 0; let mut last = None;
    while offset < bytes.len() {
        if let Some((length, side, side_len, mode, _)) = get_frame_info(&bytes, offset) {
            for &bit in get_gain_bit_offsets(mode) {
                let start = bit - 21;
                let active = (0..12).any(|k| bytes[side + (start+k)/8] & (1 << (7-(start+k)%8)) != 0);
                if active { last = Some((side, side_len, bit)); }
            }
            offset += length;
        } else { offset += 1; }
    }
    let (side, len, bit) = last.unwrap();
    write_global_gain(&mut bytes[side..side+len], bit, 0);
    fs::write(&f.path, &bytes).unwrap();
    let t = f.info(); let patch = PendingTagPatch { track_id:t.id, patch:populated(t.metadata.clone()) };
    assert_eq!(preflight_check_mp3_gain(&f.path, -3).unwrap().2, -3);
    apply_gain_steps_atomic(&f.path, &f.journal, "boundary", -3, Some(&patch), "mp3_gain").unwrap();
    let lines: Vec<serde_json::Value> = fs::read_to_string(&f.journal).unwrap().lines().map(|l| serde_json::from_str(l).unwrap()).collect();
    assert!(!lines.last().unwrap()["items"][0]["new_value"]["boundary_gains"].as_array().unwrap().is_empty());
    undo_operation_at_path(&f.journal).unwrap();
    // Lofty can change tag padding; compare every audio byte instead of container bytes.
    fn audio(data: &[u8]) -> &[u8] {
        if data.starts_with(b"ID3") {
            let size = data[6..10].iter().fold(0usize, |v,b| (v<<7) | (*b as usize & 127)); &data[10+size..]
        } else { data }
    }
    assert_eq!(audio(&fs::read(&f.path).unwrap()), audio(&bytes));
    assert_eq!(serde_json::to_value(f.info().metadata).unwrap(),serde_json::to_value(t.metadata).unwrap());
}

#[test]
fn measure_progress_reports_intermediate_samples_and_each_failure() {
    let f = Fixture::new(false); let mut events = Vec::new();
    let response = analyze_with_progress(vec![f.path.to_string_lossy().into(), f.dir.join("missing.mp3").to_string_lossy().into()],89.0,&mut |e| events.push(e));
    assert_eq!(response["results"].as_array().unwrap().len(),1);
    assert_eq!(response["errors"].as_array().unwrap().len(),1);
    assert!(events.iter().any(|e| e["status"]=="running" && e["completed"]==0));
    assert!(events.iter().any(|e| e["status"]=="done" && e["measurement"]["measured_db_spl"].is_number()));
    assert_eq!(events.last().unwrap()["status"],"failed");
    assert_eq!(events.last().unwrap()["completed"],2);
}

#[test]
fn gain_progress_reports_phases_and_explicit_noop_and_failure() {
    let f = Fixture::new(false); let t=f.info(); let m=f.measure(); let mut events=Vec::new();
    let response=apply_lossless_gain_with_progress(ApplyLosslessGainPayload {
        track_ids:vec![t.id,"missing".into()],file_paths:vec![t.path,f.dir.join("missing.mp3").to_string_lossy().into()],
        target_db_spl:m.measured_db_spl,current_db_spls:vec![],allow_clipping:false,pending_patches:None,
    },&f.journal,&mut |e| events.push(e)).unwrap();
    assert_eq!(response["outcomes"][0]["status"],"unchanged");
    assert_eq!(response["outcomes"][1]["status"],"failed");
    assert!(!f.journal.exists());
    assert!(events.iter().any(|e| e["track"]["loudness"]["measured_db_spl"].is_number()));
    assert_eq!(events.last().unwrap()["completed"],2);
}

#[test]
fn real_audio_copy_gain_regression() {
    // Optional local QA: source is read-only; all writes/Undo use a private copy.
    let Ok(source) = std::env::var("VXMP3_QA_AUDIO") else { return; };
    let f = Fixture::new(false); let original=fs::read(source).unwrap();fs::write(&f.path,&original).unwrap();
    let before=f.measure();let steps=calculate_gain_steps(before.measured_db_spl,89.0);
    assert_ne!(steps,0);
    let (_,_,safe)=preflight_check_mp3_gain(&f.path,steps).unwrap();assert_eq!(safe,steps);
    apply_gain_steps_atomic(&f.path,&f.journal,"real_copy",safe,None,"mp3_gain").unwrap();
    let after=f.measure();
    assert!((after.measured_db_spl-before.measured_db_spl-safe as f64*GAIN_STEP_DB).abs()<0.1);
    assert!((after.measured_db_spl-89.0).abs()<0.85);
    undo_operation_at_path(&f.journal).unwrap();assert_eq!(fs::read(&f.path).unwrap(),original);
}

#[test]
fn legacy_gain_journal_undo_includes_empty_granules() {
    use std::io::Write;
    let f=Fixture::new(false);let original=fs::read(&f.path).unwrap();let mut changed=original.clone();let mut offset=0;
    while offset<changed.len() {
        if let Some((length,side,len,mode,_))=get_frame_info(&changed,offset) {
            for &bit in get_gain_bit_offsets(mode) {
                let gain=read_global_gain(&changed[side..side+len],bit);
                write_global_gain(&mut changed[side..side+len],bit,gain+2);
            }
            offset+=length;
        } else {offset+=1;}
    }
    two_phase_atomic_commit(&f.path,&f.journal,"legacy","mp3_gain",serde_json::json!({}),
        serde_json::json!({"gain_steps":2,"undo_steps":-2}),|file| file.write_all(&changed)).unwrap();
    undo_operation_at_path(&f.journal).unwrap();
    assert_eq!(fs::read(&f.path).unwrap(),original);
}

#[test]
fn final_qa_undo_must_preserve_external_metadata_edit() {
    let f=Fixture::new(false);
    let original=f.info().metadata;
    f.tags(populated(original));
    let mut tagged=Probe::open(&f.path).unwrap().read().unwrap();
    tagged.primary_tag_mut().unwrap().insert_text(ItemKey::TrackTitle,"External edit must survive".into());
    tagged.save_to_path(&f.path,WriteOptions::default()).unwrap();
    let external=fs::read(&f.path).unwrap();
    let result=undo_operation_at_path(&f.journal).unwrap();
    assert_eq!(result["restored_count"],0,"Undo must refuse a file edited after commit");
    assert_eq!(fs::read(&f.path).unwrap(),external);
}

#[test]
fn final_qa_partial_undo_can_retry_failed_path_without_replaying_success() {
    let first=Fixture::new(false);let second=Fixture::new(true);
    let original1=fs::read(&first.path).unwrap();let original2=fs::read(&second.path).unwrap();
    let a=first.info();let b=second.info();
    apply_batch_tags_at_path(vec![TagPatch{track_id:a.id,path:a.path,patch:populated(a.metadata)},TagPatch{track_id:b.id,path:b.path,patch:populated(b.metadata)}],&first.journal).unwrap();
    let committed2=fs::read(&second.path).unwrap();fs::write(&second.path,b"external changed file").unwrap();
    let result=undo_operation_at_path(&first.journal).unwrap();assert_eq!(result["restored_count"],1);assert_eq!(result["success"],false);assert_eq!(fs::read(&first.path).unwrap(),original1);
    fs::write(&second.path,committed2).unwrap();let result=undo_operation_at_path(&first.journal).unwrap();assert_eq!(result["restored_count"],1);assert_eq!(result["success"],true);assert_eq!(fs::read(&first.path).unwrap(),original1);assert_eq!(fs::read(&second.path).unwrap(),original2);
}
#[test]
fn final_qa_prepared_crash_blocks_new_write_and_preserves_source() {
    let f=Fixture::new(false);let original=fs::read(&f.path).unwrap();
    fs::write(&f.journal,"{\"incomplete\":").unwrap();
    assert!(two_phase_atomic_commit(&f.path,&f.journal,"next","tag_edit",serde_json::json!({}),serde_json::json!({}),|file|{use std::io::Write;file.write_all(b"bad")}).is_err());
    assert_eq!(fs::read(&f.path).unwrap(),original);
}

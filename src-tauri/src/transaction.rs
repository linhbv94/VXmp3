use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;
use sha2::{Digest, Sha256};
use std::io::Read;
pub(crate) static MUTATION_LOCK:std::sync::Mutex<()>=std::sync::Mutex::new(());
pub(crate) fn journal_settled(path:&Path)->Result<(),String>{
    if !path.exists(){return Ok(())}
    let mut pending=std::collections::HashSet::new();
    for line in fs::read_to_string(path).map_err(|e|e.to_string())?.lines(){
        if line.trim().is_empty(){continue}
        let entry:OperationJournalEntry=serde_json::from_str(line).map_err(|_|"JOURNAL_UNCERTAIN: nhật ký chưa đầy đủ; cần kiểm tra trước khi ghi tiếp".to_string())?;
        for item in entry.items {let key=(entry.transaction_id.clone(),item.file_path);match entry.phase {JournalPhase::PREPARED=>{pending.insert(key);},JournalPhase::COMMITTED=>{pending.remove(&key);}}}
    }
    if pending.is_empty(){Ok(())}else{Err("JOURNAL_UNCERTAIN: có lượt ghi chưa xác minh; giữ file và backup, chưa ghi tiếp".into())}
}
pub(crate) fn file_sha256(path:&Path)->Result<String,String>{
    let mut file=File::open(path).map_err(|e|e.to_string())?;
    let mut hash=Sha256::new();let mut block=[0u8;65536];
    loop {let n=file.read(&mut block).map_err(|e|e.to_string())?;if n==0{break}hash.update(&block[..n]);}
    Ok(format!("{:x}",hash.finalize()))
}
fn source_matches(path:&Path,original:&fs::Metadata,hash:&str)->Result<bool,String>{
    let meta=fs::symlink_metadata(path).map_err(|e|e.to_string())?;
    if !meta.is_file()||meta.file_type().is_symlink()||meta.len()!=original.len()||meta.modified().ok()!=original.modified().ok(){return Ok(false)}
    #[cfg(unix)] {use std::os::unix::fs::MetadataExt;if meta.dev()!=original.dev()||meta.ino()!=original.ino()||meta.nlink()!=1{return Ok(false)}}
    Ok(file_sha256(path)?==hash)
}
#[cfg(test)] fn crash_point(phase:&str){if std::env::var("VXMP3_TEST_CRASH_PHASE").ok().as_deref()==Some(phase){std::process::abort()}}
fn backup_root(journal:&Path)->PathBuf {journal.parent().unwrap_or(Path::new(".")).join("file_backups")}
fn verified_backup(journal:&Path,state:&serde_json::Value)->Result<PathBuf,String>{
    let root=backup_root(journal).canonicalize().map_err(|e|e.to_string())?;
    let path=PathBuf::from(state["backup"].as_str().ok_or("BACKUP_MISSING")?);
    let meta=fs::symlink_metadata(&path).map_err(|e|e.to_string())?;
    if !meta.is_file()||meta.file_type().is_symlink()||path.canonicalize().map_err(|e|e.to_string())?.parent()!=Some(root.as_path()){return Err("BACKUP_INVALID".into())}
    if file_sha256(&path)?!=state["before_sha256"].as_str().unwrap_or(""){return Err("BACKUP_CHANGED".into())}Ok(path)
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JournalPhase {
    PREPARED,
    COMMITTED,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum JournalStatus {
    Prepared,
    Committed,
    Failed,
    RolledBack,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalItemRecord {
    pub file_path: String,
    pub temp_path: Option<String>,
    pub old_value: serde_json::Value,
    pub new_value: serde_json::Value,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationJournalEntry {
    pub transaction_id: String,
    pub timestamp_iso: String,
    pub operation_type: String,
    pub phase: JournalPhase,
    pub status: JournalStatus,
    pub total_files: usize,
    pub items: Vec<JournalItemRecord>,
}

/// Lấy đường dẫn tệp nhật ký journal.jsonl trong app data directory
pub fn get_journal_path(app_handle: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    let base_dir = app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    fs::create_dir_all(&base_dir).ok();
    base_dir.join("journal.jsonl")
}

/// Ghi nhật ký vào journal.jsonl
pub fn append_journal_entry(
    journal_path: &Path,
    entry: &OperationJournalEntry,
) -> io::Result<()> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(journal_path)?;
    let line = serde_json::to_string(entry)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    writeln!(file, "{}", line)?;
    file.sync_all()?;
    Ok(())
}

/// Thực thi Two-Phase Atomic Write với snapshot, backup và nhật ký bền vững
/// 1. Tạo tệp tạm `<path>.tmp_<uuid>`
/// 2. Ghi dữ liệu vào tệp tạm qua closure `writer`
/// 3. Gọi fsync (`sync_all`)
/// 4. Ghi journal trạng thái PREPARED (Nếu lỗi journal, dừng ngay lập tức, tệp gốc giữ nguyên!)
/// 5. Atomic Rename tệp tạm đè lên tệp gốc
/// 6. Ghi journal trạng thái COMMITTED
pub fn two_phase_atomic_commit<F>(
    orig_path: &Path,
    journal_path: &Path,
    transaction_id: &str,
    operation_type: &str,
    old_value: serde_json::Value,
    new_value: serde_json::Value,
    writer: F,
) -> Result<(), String>
where
    F: FnOnce(&mut File) -> io::Result<()>,
{
    journal_settled(journal_path)?;
    let orig_meta = fs::metadata(orig_path)
        .map_err(|e| format!("Không thể đọc thông tin tệp gốc: {}", e))?;
    if fs::symlink_metadata(orig_path).map_err(|e|e.to_string())?.file_type().is_symlink() || !orig_meta.is_file(){return Err("UNSUPPORTED_SOURCE: cần tệp thường, không symlink".into())}
    #[cfg(unix)] {use std::os::unix::fs::MetadataExt;if orig_meta.nlink()!=1{return Err("UNSUPPORTED_SOURCE: hardlink".into())}}
    let before_sha256=file_sha256(orig_path)?;
    let expected_len = orig_meta.len();
    let expected_mtime = orig_meta.modified().ok();

    let parent_dir = orig_path
        .parent()
        .ok_or_else(|| "Không tìm thấy thư mục cha".to_string())?;
    let ext = orig_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("tmp");
    let file_stem = orig_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");

    let temp_filename = format!("{}.tmp_{}.{}", file_stem, Uuid::new_v4(), ext);
    let temp_path = parent_dir.join(&temp_filename);

    // 1. Tạo và ghi tệp tạm với cả quyền READ và WRITE (để Lofty có thể probe/rewind)
    {
        let mut temp_file = OpenOptions::new()
            .create_new(true)
            .read(true)
            .write(true)
            .open(&temp_path)
            .map_err(|e| format!("Lỗi tạo tệp tạm: {}", e))?;

        writer(&mut temp_file)
            .map_err(|e| {
                fs::remove_file(&temp_path).ok();
                format!("Lỗi ghi dữ liệu tệp tạm: {}", e)
            })?;

        // 2. fsync
        temp_file
            .sync_all()
            .map_err(|e| {
                fs::remove_file(&temp_path).ok();
                format!("Lỗi fsync tệp tạm: {}", e)
            })?;
    }

    // 3. Kiểm định Snapshot tệp gốc trước khi ghi Journal & Rename (Chống ghi đè thay đổi bên ngoài)
    if let Ok(current_meta) = fs::metadata(orig_path) {
        if current_meta.len() != expected_len || (expected_mtime.is_some() && current_meta.modified().ok() != expected_mtime) || !source_matches(orig_path,&orig_meta,&before_sha256)? {
            fs::remove_file(&temp_path).ok();
            return Err("SOURCE_CHANGED: Tệp gốc đã bị thay đổi bởi ứng dụng khác trong quá trình xử lý, hủy bỏ thao tác để bảo vệ dữ liệu".to_string());
        }
    } else {
        fs::remove_file(&temp_path).ok();
        return Err("SOURCE_MISSING: Tệp gốc không còn tồn tại trên ổ đĩa".to_string());
    }

    fs::set_permissions(&temp_path,orig_meta.permissions()).map_err(|e|e.to_string())?;
    let after_sha256=file_sha256(&temp_path)?;
    let root=backup_root(journal_path);fs::create_dir_all(&root).map_err(|e|e.to_string())?;
    if fs::symlink_metadata(&root).map_err(|e|e.to_string())?.file_type().is_symlink(){return Err("BACKUP_ROOT_INVALID".into())}
    #[cfg(unix)] {use std::os::unix::fs::PermissionsExt;fs::set_permissions(&root,fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;}
    let backup=root.join(format!("{}.bin",Uuid::new_v4()));
    {let mut input=File::open(orig_path).map_err(|e|e.to_string())?;let mut output=OpenOptions::new().write(true).create_new(true).open(&backup).map_err(|e|e.to_string())?;
     std::io::copy(&mut input,&mut output).map_err(|e|e.to_string())?;output.sync_all().map_err(|e|e.to_string())?;}
    if file_sha256(&backup)?!=before_sha256||file_sha256(orig_path)?!=before_sha256 {let _=fs::remove_file(&temp_path);let _=fs::remove_file(&backup);return Err("SOURCE_CHANGED: backup không khớp".into())}
    let mut new_value=new_value;
    if !new_value.is_object(){new_value=serde_json::json!({"value":new_value});}
    new_value["_vx_file_state"]=serde_json::json!({"backup":backup,"before_sha256":before_sha256,"after_sha256":after_sha256});

    // 4. Ghi Journal Phase PREPARED
    let prepared_entry = OperationJournalEntry {
        transaction_id: transaction_id.to_string(),
        timestamp_iso: chrono::Utc::now().to_rfc3339(),
        operation_type: operation_type.to_string(),
        phase: JournalPhase::PREPARED,
        status: JournalStatus::Prepared,
        total_files: 1,
        items: vec![JournalItemRecord {
            file_path: orig_path.to_string_lossy().to_string(),
            temp_path: Some(temp_path.to_string_lossy().to_string()),
            old_value,
            new_value,
            status: "prepared".to_string(),
        }],
    };

    if let Err(e) = append_journal_entry(journal_path, &prepared_entry) {
        fs::remove_file(&temp_path).ok();
        return Err(format!(
            "JOURNAL_WRITE_FAILED: Không thể ghi nhật ký PREPARED ({}), hủy bỏ thay thế tệp gốc",
            e
        ));
    }

    #[cfg(test)] crash_point("prepared");
    // Revalidate after durable preparation; never replace a new external version.
    if !source_matches(orig_path,&orig_meta,&before_sha256)? {let _=fs::remove_file(&temp_path);return Err("SOURCE_CHANGED: trước commit".into())}
    // 5. Atomic Rename
    if let Err(e) = fs::rename(&temp_path, orig_path) {
        fs::remove_file(&temp_path).ok();
        return Err(format!("Lỗi atomic rename: {}", e));
    }

    #[cfg(test)] crash_point("renamed");
    // 6. Ghi Journal Phase COMMITTED
    let mut committed_entry = prepared_entry;
    committed_entry.phase = JournalPhase::COMMITTED;
    committed_entry.status = JournalStatus::Committed;
    if let Some(item) = committed_entry.items.first_mut() {
        item.status = "committed".to_string();
        item.temp_path = None;
    }
    // Ghi nhận trạng thái committed (nếu lỗi journal ở bước này, tệp đã thay thế thành công)
    #[cfg(unix)] File::open(parent_dir).and_then(|file|file.sync_all()).map_err(|e|format!("COMMIT_UNCERTAIN: {}",e))?;
    append_journal_entry(journal_path, &committed_entry).map_err(|e|format!("COMMIT_UNCERTAIN: {}",e))?;

    Ok(())
}

/// Quét dọn tệp tạm và phục hồi trạng thái khi ứng dụng khởi động
pub fn startup_crash_recovery(app_handle: &tauri::AppHandle) {
    let journal_path = get_journal_path(app_handle);
    if !journal_path.exists() {
        return;
    }

    // Keep incomplete records and staged data for review. Never delete paths supplied
    // by an old journal and never replay an uncertain commit at startup.
    let _=journal_path;
}

/// Khôi phục thẻ ID3/Metadata từ snapshot cũ vào tệp qua Two-Phase Commit
pub fn restore_tags_to_file(
    path: &Path,
    journal_path: &Path,
    tx_id: &str,
    patch: &crate::metadata::TrackMetadata,
) -> Result<(), String> {
    use std::io::Seek;

    let patch_clone = patch.clone();
    two_phase_atomic_commit(
        path,
        journal_path,
        tx_id,
        "tag_undo_restore",
        serde_json::Value::Null,
        serde_json::to_value(patch).unwrap_or_default(),
        |temp_file| {
            // Sao chép nguyên tệp vào tệp tạm
            let mut source = fs::File::open(path)?;
            std::io::copy(&mut source, temp_file)?;
            temp_file.rewind()?;

            crate::metadata::write_metadata_to_file(temp_file, &patch_clone)?;
            Ok(())
        },
    )
}

#[tauri::command]
pub async fn undo_last_operation(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let journal = get_journal_path(&app);
    tauri::async_runtime::spawn_blocking(move || {let _guard=MUTATION_LOCK.lock().map_err(|_|"MUTATION_BUSY")?;mutation_available()?;journal_settled(&journal)?;undo_operation_at_path(&journal)}).await.map_err(|e| e.to_string())?
}

pub(crate) fn undo_operation_at_path(journal_path: &Path) -> Result<serde_json::Value, String> {
    if !journal_path.exists() {
        return Err("Chưa có nhật ký thao tác nào để hoàn tác".to_string());
    }

    let content = fs::read_to_string(&journal_path)
        .map_err(|e| format!("Lỗi đọc nhật ký: {}", e))?;

    let mut undone_tx_ids = std::collections::HashSet::new();
    let mut restored_by_tx:std::collections::HashMap<String,std::collections::HashSet<String>>=std::collections::HashMap::new();
    let mut all_entries = Vec::new();

    for line in content.lines() {
        if let Ok(entry) = serde_json::from_str::<OperationJournalEntry>(line) {
            if entry.operation_type == "undo" {
                if let Some(item) = entry.items.first() {
                    if let Some(target_id) = item.old_value.get("target_transaction_id").and_then(|v| v.as_str()) {
                        if let Some(paths)=item.new_value.get("restored_paths").and_then(|v|v.as_array()) {
                        for path in paths.iter().filter_map(|v|v.as_str()){restored_by_tx.entry(target_id.into()).or_default().insert(path.into());}
                    } else if item.new_value.get("errors").and_then(|v|v.as_array()).is_none_or(|v|v.is_empty()) {undone_tx_ids.insert(target_id.to_string());}
                    }
                }
            }
            if matches!(entry.phase, JournalPhase::COMMITTED) && matches!(entry.status, JournalStatus::Committed) {
                all_entries.push(entry);
            }
        }
    }

    // Tìm transaction_id gần nhất chưa bị hoàn tác và không phải là bản thân thao tác undo
    let mut target_tx_id = None;
    let mut target_op_type = String::new();

    for entry in all_entries.iter().rev() {
        if entry.operation_type == "undo"
            || entry.operation_type == "undo_gain_step"
            || entry.operation_type == "tag_undo_restore"
        {
            continue;
        }
        if !undone_tx_ids.contains(&entry.transaction_id) && !all_entries.iter().filter(|e|e.transaction_id==entry.transaction_id).flat_map(|e|e.items.iter()).all(|i|restored_by_tx.get(&entry.transaction_id).is_some_and(|paths|paths.contains(&i.file_path))) {
            target_tx_id = Some(entry.transaction_id.clone());
            target_op_type = entry.operation_type.clone();
            break;
        }
    }

    let target_tx_id = match target_tx_id {
        Some(id) => id,
        None => return Err("Không có thao tác nào đủ điều kiện hoàn tác".to_string()),
    };

    // Lọc tất cả các entry thuộc transaction này
    let target_items: Vec<JournalItemRecord> = all_entries
        .into_iter()
        .filter(|e| e.transaction_id == target_tx_id)
        .flat_map(|e| e.items)
        .collect();

    let undo_tx_id = Uuid::new_v4().to_string();
    let mut restored_count = 0;
    let mut errors = Vec::new();
    let mut restored_paths=Vec::new();

    for item in &target_items {
        if restored_by_tx.get(&target_tx_id).is_some_and(|paths|paths.contains(&item.file_path)){continue}
        let p = Path::new(&item.file_path);
        if !p.exists() {
            errors.push(format!("Tệp không còn tồn tại: {}", item.file_path));
            continue;
        }

        let Some(state)=item.new_value.get("_vx_file_state") else {errors.push(format!("Chưa có bằng chứng file/backup cho nhật ký cũ: {}",item.file_path));continue};
        let current=match file_sha256(p){Ok(hash)=>hash,Err(e)=>{errors.push(e);continue}};
        if current!=state["after_sha256"].as_str().unwrap_or(""){errors.push(format!("SOURCE_CHANGED: không hoàn tác file đã sửa ngoài app: {}",item.file_path));continue}
        let backup=match verified_backup(journal_path,state){Ok(path)=>path,Err(e)=>{errors.push(e);continue}};
        match two_phase_atomic_commit(p,journal_path,&undo_tx_id,"tag_undo_restore",serde_json::Value::Null,serde_json::json!({}),|out|{let mut input=File::open(&backup)?;std::io::copy(&mut input,out)?;Ok(())}){
            Ok(())=>{restored_count+=1;restored_paths.push(item.file_path.clone());},Err(e)=>errors.push(e),
        }
    }

    // Ghi lại bản ghi undo vào journal
    let undo_journal_entry = OperationJournalEntry {
        transaction_id: undo_tx_id,
        timestamp_iso: chrono::Utc::now().to_rfc3339(),
        operation_type: "undo".to_string(),
        phase: JournalPhase::COMMITTED,
        status: JournalStatus::Committed,
        total_files: restored_count,
        items: vec![JournalItemRecord {
            file_path: target_tx_id.clone(),
            temp_path: None,
            old_value: serde_json::json!({ "target_transaction_id": target_tx_id }),
            new_value: serde_json::json!({ "restored_files": restored_count, "errors": errors, "restored_paths":restored_paths }),
            status: "committed".to_string(),
        }],
    };
    append_journal_entry(&journal_path, &undo_journal_entry).map_err(|e|format!("UNDO_JOURNAL_UNCERTAIN: {}",e))?;

    Ok(serde_json::json!({
        "success": errors.is_empty(),
        "undone_transaction_id": target_tx_id,
        "operation_type": target_op_type,
        "restored_count": restored_count,
        "errors": errors
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_journal_entry_serialization() {
        let entry = OperationJournalEntry {
            transaction_id: "test-uuid-123".to_string(),
            timestamp_iso: "2026-10-13T10:00:00Z".to_string(),
            operation_type: "mp3_gain".to_string(),
            phase: JournalPhase::COMMITTED,
            status: JournalStatus::Committed,
            total_files: 1,
            items: vec![JournalItemRecord {
                file_path: "/test/audio.mp3".to_string(),
                temp_path: None,
                old_value: serde_json::json!({ "gain_steps": 0 }),
                new_value: serde_json::json!({ "gain_steps": 2, "undo_steps": -2 }),
                status: "committed".to_string(),
            }],
        };

        let serialized = serde_json::to_string(&entry).unwrap();
        let deserialized: OperationJournalEntry = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.transaction_id, "test-uuid-123");
        assert_eq!(deserialized.items.len(), 1);
        assert_eq!(deserialized.items[0].new_value["undo_steps"], -2);
    }

    #[test]
    fn test_consecutive_undo_selection() {
        let entries = vec![
            OperationJournalEntry {
                transaction_id: "tx-gain-1".to_string(),
                timestamp_iso: "2026-10-13T10:00:00Z".to_string(),
                operation_type: "mp3_gain".to_string(),
                phase: JournalPhase::COMMITTED,
                status: JournalStatus::Committed,
                total_files: 1,
                items: vec![],
            },
            OperationJournalEntry {
                transaction_id: "tx-gain-2".to_string(),
                timestamp_iso: "2026-10-13T10:01:00Z".to_string(),
                operation_type: "mp3_gain".to_string(),
                phase: JournalPhase::COMMITTED,
                status: JournalStatus::Committed,
                total_files: 1,
                items: vec![],
            },
            // Giả lập Undo #1 đã chạy cho tx-gain-2
            OperationJournalEntry {
                transaction_id: "tx-undo-internal".to_string(),
                timestamp_iso: "2026-10-13T10:02:00Z".to_string(),
                operation_type: "undo_gain_step".to_string(),
                phase: JournalPhase::COMMITTED,
                status: JournalStatus::Committed,
                total_files: 1,
                items: vec![],
            },
            OperationJournalEntry {
                transaction_id: "tx-undo-record".to_string(),
                timestamp_iso: "2026-10-13T10:02:01Z".to_string(),
                operation_type: "undo".to_string(),
                phase: JournalPhase::COMMITTED,
                status: JournalStatus::Committed,
                total_files: 1,
                items: vec![JournalItemRecord {
                    file_path: "tx-gain-2".to_string(),
                    temp_path: None,
                    old_value: serde_json::json!({ "target_transaction_id": "tx-gain-2" }),
                    new_value: serde_json::json!({ "restored_files": 1 }),
                    status: "committed".to_string(),
                }],
            },
        ];

        let mut undone_tx_ids = std::collections::HashSet::new();
        for entry in &entries {
            if entry.operation_type == "undo" {
                if let Some(item) = entry.items.first() {
                    if let Some(target_id) = item.old_value.get("target_transaction_id").and_then(|v| v.as_str()) {
                        undone_tx_ids.insert(target_id.to_string());
                    }
                }
            }
        }

        let mut next_target = None;
        for entry in entries.iter().rev() {
            if entry.operation_type == "undo"
                || entry.operation_type == "undo_gain_step"
                || entry.operation_type == "tag_undo_restore"
            {
                continue;
            }
            if !undone_tx_ids.contains(&entry.transaction_id) {
                next_target = Some(entry.transaction_id.clone());
                break;
            }
        }

        // Lần Undo tiếp theo BẮT BUỘC phải là tx-gain-1 (không được là tx-undo-internal hay tx-gain-2)
        assert_eq!(next_target, Some("tx-gain-1".to_string()));
    }
}

static UPDATE_PREPARED:std::sync::atomic::AtomicBool=std::sync::atomic::AtomicBool::new(false);
pub(crate) fn mutation_available()->Result<(),String>{if UPDATE_PREPARED.load(std::sync::atomic::Ordering::SeqCst){Err("Đang cập nhật ứng dụng".into())}else{Ok(())}}
#[tauri::command]
pub fn prepare_app_update(app:tauri::AppHandle)->Result<(),String>{
    let _guard=MUTATION_LOCK.try_lock().map_err(|_|"Hãy đợi thao tác lưu/hoàn tác hoàn tất")?;
    journal_settled(&get_journal_path(&app))?;UPDATE_PREPARED.store(true,std::sync::atomic::Ordering::SeqCst);Ok(())
}
#[tauri::command]
pub fn cancel_app_update(){UPDATE_PREPARED.store(false,std::sync::atomic::Ordering::SeqCst);}

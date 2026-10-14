import {AppUpdates} from './components/AppUpdates';
import {useAppUpdater} from './services/app_updater';
import { useState, useEffect, useRef } from 'react';
import { Channel, invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { WindowBar } from './components/window_bar';
import { ControlBar } from './components/ControlBar';
import { TrackTable } from './components/TrackTable';
import { Inspector } from './components/Inspector';
import { MiniPlayer } from './components/MiniPlayer';
import { SettingsModal, ThemeMode, SettingsTabType } from './components/SettingsModal';
import { Language } from './i18n/app_translations';
import { AudioTrack, TrackMetadata, ViewPreset } from './types';
import { AudioAction, AudioProgressEvent, BatchProgress, TrackAudioProgress } from './types/audio_progress';
import { addRecentItem } from './services/recent_service';

export default function App() {
  const update=useAppUpdater();
  const updateBusy=['downloading','installing','installed'].includes(update.status);
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<TrackMetadata>>>(new Map());
  const [viewPreset, setViewPreset] = useState<ViewPreset>('all');
  const [targetDb, setTargetDb] = useState<number>(89.0);
  const operationLock = useRef(false);
  const pendingRef = useRef(pendingChanges);
  pendingRef.current = pendingChanges;
  const [isSaving, setIsSaving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gainScope, setGainScope] = useState<'all' | 'selected'>('all');
  const [audioStates, setAudioStates] = useState<{ measure: Map<string, TrackAudioProgress>; gain: Map<string, TrackAudioProgress> }>({ measure: new Map(), gain: new Map() });
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isApplyingGain, setIsApplyingGain] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>('general');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(()=>{const guard=(event:Event)=>{if(operationLock.current||pendingRef.current.size>0)event.preventDefault();};window.addEventListener('vxmp3-before-update',guard);return()=>window.removeEventListener('vxmp3-before-update',guard);},[]);

  // Theme & Language persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('vx_theme') as ThemeMode) || 'system';
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('vx_lang') as Language) || 'vi';
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // OLED shares dark semantics; follow OS changes while System is selected.
  useEffect(() => {
    localStorage.setItem('vx_theme', theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || theme === 'black' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
      document.documentElement.classList.toggle('black', theme === 'black');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  // Sync language
  useEffect(() => {
    localStorage.setItem('vx_lang', language);
  }, [language]);

  // Nạp lại dữ liệu thư mục hiện tại sau khi Undo hoặc cập nhật
  const refreshCurrentDirectory = async (targetFolder?: string) => {
    const dir = targetFolder || currentFolderPath;
    if (!dir) return;
    try {
      const res = await invoke<{
        success: boolean;
        tracks: AudioTrack[];
        total_scanned: number;
        unsupported_count: number;
      }>('scan_audio_directory', {
        dirPath: dir,
        recursive: false,
      });

      if (res.success) {
        setTracks(res.tracks);
        setPendingChanges(new Map());
      }
    } catch (err: any) {
      console.error('Lỗi làm mới thư mục:', err);
    }
  };

  // Mở thư mục và quét tệp
  const handleOpenFolder = async () => {
    if (operationLock.current || isSaving || isAnalyzing || isApplyingGain || isUndoing) return;
    try {
      const selectedPath = await invoke<string | null>('pick_directory');
      if (!selectedPath) return;

      const res = await invoke<{
        success: boolean;
        tracks: AudioTrack[];
        total_scanned: number;
        unsupported_count: number;
      }>('scan_audio_directory', {
        dirPath: selectedPath,
        recursive: false,
      });

      if (res.success) {
        setAudioStates({ measure: new Map(), gain: new Map() });
        setBatchProgress(null);
        setCurrentFolderPath(selectedPath);
        setTracks(res.tracks);
        setSelectedIds(new Set());
        setFocusedId(res.tracks[0]?.id ?? null);
        setPendingChanges(new Map());
        addRecentItem('vxmp3_recent_folders', selectedPath);
        showToast(`Đã nạp ${res.tracks.length} bài hát${res.unsupported_count ? `; ${res.unsupported_count} tệp không đọc được` : ' từ thư mục'}`);
      }
    } catch (err: any) {
      showToast(`Lỗi quét thư mục: ${err}`);
    }
  };

  // Mở trực tiếp thư mục từ danh sách Recent
  const handleOpenFolderPath = async (targetPath: string) => {
    if (operationLock.current || isSaving || isAnalyzing || isApplyingGain || isUndoing) return;
    try {
      const res = await invoke<{
        success: boolean;
        tracks: AudioTrack[];
        total_scanned: number;
        unsupported_count: number;
      }>('scan_audio_directory', {
        dirPath: targetPath,
        recursive: false,
      });

      if (res.success) {
        setAudioStates({ measure: new Map(), gain: new Map() });
        setBatchProgress(null);
        setCurrentFolderPath(targetPath);
        setTracks(res.tracks);
        setSelectedIds(new Set());
        setFocusedId(res.tracks[0]?.id ?? null);
        setPendingChanges(new Map());
        addRecentItem('vxmp3_recent_folders', targetPath);
        showToast(`Đã nạp ${res.tracks.length} bài hát${res.unsupported_count ? `; ${res.unsupported_count} tệp không đọc được` : ' từ thư mục'}`);
      }
    } catch (err: any) {
      showToast(`Lỗi quét thư mục: ${err}`);
    }
  };

  // Chọn dòng (Multi-select)
  const handleSelectTrack = (id: string, isShift: boolean, isCtrl: boolean) => {
    if (isShift && focusedId) {
      const idx1 = tracks.findIndex((t) => t.id === focusedId);
      const idx2 = tracks.findIndex((t) => t.id === id);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const newSet = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSet.add(tracks[i].id);
        }
        setSelectedIds(newSet);
        return;
      }
    }

    if (isCtrl) {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setSelectedIds(newSet);
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const handleFocusTrack = (id: string) => {
    setFocusedId(id);
  };

  // Inline edit commit vào in-memory pendingChanges
  const handleInlineEditCommit = (trackId: string, field: keyof TrackMetadata, value: any) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const current = next.get(trackId) || {};
      const updated = { ...current, [field]: value };
      const original = tracks.find((t) => t.id === trackId)?.metadata[field];
      if ((original ?? '') === (value ?? '')) delete updated[field];
      if (Object.keys(updated).length) next.set(trackId, updated); else next.delete(trackId);
      return next;
    });
  };

  // Sửa trường trên Inspector (cho 1 hoặc nhiều bài đang chọn)
  const handleFieldChange = (field: keyof TrackMetadata, value: any) => {
    const idsToUpdate = selectedIds.size > 0 ? Array.from(selectedIds) : (focusedId ? [focusedId] : []);
    if (idsToUpdate.length === 0) return;

    setPendingChanges((prev) => {
      const next = new Map(prev);
      for (const id of idsToUpdate) {
        const current = next.get(id) || {};
        next.set(id, { ...current, [field]: value });
      }
      return next;
    });
  };

  // Thêm / Thay thế ảnh bìa
  const handleCoverArtChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const idsToUpdate = selectedIds.size > 0 ? Array.from(selectedIds) : (focusedId ? [focusedId] : []);
      setPendingChanges((prev) => {
        const next = new Map(prev);
        for (const id of idsToUpdate) {
          const current = next.get(id) || {};
          next.set(id, {
            ...current,
            cover_art: {
              mime_type: file.type as any,
              width: 500,
              height: 500,
              size_bytes: file.size,
              thumbnail_data_url: dataUrl,
            },
          });
        }
        return next;
      });
      showToast('Đã gắn ảnh bìa mới (Bấm Lưu để commit)');
    };
    reader.readAsDataURL(file);
  };

  // Gỡ bỏ ảnh bìa
  const handleRemoveCoverArt = () => {
    const idsToUpdate = selectedIds.size > 0 ? Array.from(selectedIds) : (focusedId ? [focusedId] : []);
    setPendingChanges((prev) => {
      const next = new Map(prev);
      for (const id of idsToUpdate) {
        const current = next.get(id) || {};
        next.set(id, { ...current, cover_art: null });
      }
      return next;
    });
    showToast('Đã đánh dấu gỡ bỏ ảnh bìa');
  };

  // Lưu các thay đổi thẻ Pending (Cmd/Ctrl + S)
  const handleSavePending = async () => {
    if (operationLock.current || pendingRef.current.size === 0) return;
    operationLock.current = true;
    setIsSaving(true);
    const submitted = new Map(pendingRef.current);

    const updates: Array<{
      track_id: string;
      path: string;
      patch: TrackMetadata;
    }> = [];

    for (const [trackId, patch] of submitted.entries()) {
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        updates.push({
          track_id: trackId,
          path: track.path,
          patch: {
            ...track.metadata,
            ...patch,
          },
        });
      }
    }

    try {
      const res = await invoke<{
        transaction_id: string;
        success_count: number;
        failed_count: number;
        success_track_ids: string[];
        updated_tracks: AudioTrack[];
        errors?: Array<{ track_id: string; error_code: string; message: string }>;
      }>('apply_batch_tags', { updates });

      const successSet = new Set(res.success_track_ids);

      const fresh = new Map(res.updated_tracks.map((t) => [t.id, t]));
      setTracks((prev) => prev.map((track) => {
        const updated = fresh.get(track.id);
        return updated ? { ...updated, loudness: track.loudness } : track;
      }));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        for (const id of successSet) {
          if (JSON.stringify(next.get(id)) === JSON.stringify(submitted.get(id))) next.delete(id);
        }
        return next;
      });

      if (res.failed_count > 0) {
        showToast(`Đã lưu ${res.success_count} bài, thất bại ${res.failed_count} bài! ${res.errors?.[0]?.message ?? 'Vui lòng kiểm tra lại.'}`);
      } else {
        showToast(`Đã lưu thành công thẻ cho ${res.success_count} bài hát`);
      }
    } catch (err: any) {
      showToast(`Lỗi lưu thẻ: ${err}`);
    } finally {
      operationLock.current = false;
      setIsSaving(false);
    }
  };

  const progressChannel = (action: AudioAction, targets: AudioTrack[]) => {
    setAudioStates((prev) => ({ ...prev, [action]: new Map(tracks.map((t) => [t.path, {
      action, file_path: t.path, status: targets.some((target) => target.id === t.id) ? 'queued' : 'skipped',
      percent: 0, stage: targets.some((target) => target.id === t.id) ? 'Chờ' : 'Ngoài phạm vi lần chạy',
    } as TrackAudioProgress])) }));
    setBatchProgress({ action, total: targets.length, completed: 0, fraction: 0, filename: '', stage: 'Bắt đầu', running: true });
    const channel = new Channel<AudioProgressEvent>();
    channel.onmessage = (event) => {
      setAudioStates((prev) => ({ ...prev, [action]: new Map(prev[action]).set(event.file_path, event) }));
      setBatchProgress({ action, total: event.total, completed: event.completed,
        fraction: event.total ? Math.min(1, (event.completed + (event.status === 'running' ? event.percent ?? 0 : 0)) / event.total) : 1,
        stage: event.stage, filename: event.file_path.split(/[\\/]/).pop() || '', running: event.completed < event.total });
      if (event.track) {
        setTracks((prev) => prev.map((t) => t.path === event.file_path ? { ...event.track!, id: t.id } : t));
      } else if (event.measurement) {
        const m = event.measurement;
        setTracks((prev) => prev.map((t) => t.path === event.file_path ? { ...t, loudness: {
          ...m, predicted_true_peak_dbtp: m.measured_true_peak_dbtp + m.target_gain_db,
        } } : t));
      } else if (event.status === 'failed' && action === 'measure') {
        setTracks((prev) => prev.map((t) => t.path === event.file_path ? { ...t, loudness: null } : t));
      }
    };
    return channel;
  };

  const finishProgress = () => {
    setBatchProgress((prev) => prev ? { ...prev, running: false } : null);
    setAudioStates((prev) => {
      const finish = (states: Map<string, TrackAudioProgress>) => new Map([...states].map(([path, state]) => [path,
        state.status === 'queued' || state.status === 'running' ? { ...state, status: 'failed' as const, message: 'Lượt xử lý bị gián đoạn; chưa xác nhận hoàn tất' } : state]));
      return { measure: finish(prev.measure), gain: finish(prev.gain) };
    });
  };

  // Phân tích độ lớn âm lượng EBU R128 thật
  const handleAnalyzeLoudness = async () => {
    if (tracks.length === 0) {
      showToast('Vui lòng mở thư mục chứa nhạc trước khi đo âm lượng');
      return;
    }
    if (operationLock.current) return;
    operationLock.current = true;
    setIsAnalyzing(true);
    try {
      const paths = tracks.map((t) => t.path);
      const response = await invoke<{ results: Array<{
        file_path: string;
        measured_lufs: number;
        measured_db_spl: number;
        measured_true_peak_dbtp: number;
        clipping_risk: boolean;
        target_db_spl: number;
        target_gain_db: number;
        gain_step_db: number;
        mp3_gain_steps: number;
        mp3_undo_available: boolean;
      }>; errors: Array<{ file_path: string; message: string }> }>('batch_analyze_loudness', { paths, targetDbSpl: targetDb, onProgress: progressChannel('measure', tracks) });

      const results = response.results;
      const resultMap = new Map(results.map((r) => [r.file_path, r]));

      setTracks((prev) =>
        prev.map((t) => {
          const m = resultMap.get(t.path);
          if (m) {
            return {
              ...t,
              loudness: {
                measured_lufs: m.measured_lufs,
                measured_db_spl: m.measured_db_spl,
                measured_true_peak_dbtp: m.measured_true_peak_dbtp,
                predicted_true_peak_dbtp: m.measured_true_peak_dbtp + m.target_gain_db,
                clipping_risk: m.clipping_risk,
                target_db_spl: m.target_db_spl,
                target_gain_db: m.target_gain_db,
                gain_step_db: m.gain_step_db,
                mp3_gain_steps: m.mp3_gain_steps,
              },
            };
          }
          return { ...t, loudness: null };
        })
      );
      showToast(`Đã đo xong âm lượng thật cho ${results.length} bài hát${response.errors.length ? `; ${response.errors.length} lỗi: ${response.errors[0].message}` : ''}`);
    } catch (err: any) {
      showToast(`Lỗi đo âm lượng: ${err}`);
    } finally {
      finishProgress();
      setIsAnalyzing(false);
      operationLock.current = false;
    }
  };

  // 1-Click Cân bằng Lossless MP3Gain
  const handleApplyLosslessGain = async (scope: 'all' | 'selected' = 'all') => {
    if (tracks.length === 0) {
      showToast('Không có bài hát nào để cân bằng âm lượng');
      return;
    }

    const targetTracks = scope === 'selected' ? tracks.filter((t) => selectedIds.has(t.id)) : tracks;

    const mp3Tracks = targetTracks.filter((t) => t.extension === 'mp3');
    if (mp3Tracks.length === 0) {
      showToast('Chỉ tệp MP3 mới hỗ trợ cân bằng âm lượng Lossless không re-encode');
      return;
    }

    if (operationLock.current) return;
    operationLock.current = true;
    setGainScope(scope);
    setIsApplyingGain(true);
    const submitted = new Map(pendingRef.current);
    try {
      const trackIds = mp3Tracks.map((t) => t.id);
      const filePaths = mp3Tracks.map((t) => t.path);
      const currentDbSpls = mp3Tracks.map((t) => t.loudness?.measured_db_spl ?? 89.0);

      // Smart Piggybacking: Gom các pending changes của các bài này nếu có
      const pendingPatches: Array<{ track_id: string; patch: TrackMetadata }> = [];
      for (const t of mp3Tracks) {
        const patch = submitted.get(t.id);
        if (patch) {
          pendingPatches.push({
            track_id: t.id,
            patch: {
              ...t.metadata,
              ...patch,
            },
          });
        }
      }

      const res = await invoke<{
        transaction_id: string;
        modified_tracks: Array<{
          track_id: string;
          path: string;
          applied_steps: number;
          actual_db_change: number;
          new_db_spl: number;
          tags_merged: boolean;
          track: AudioTrack;
          status: string;
        }>;
        outcomes: Array<{ track_id: string; path: string; status: string; message?: string }>;
        warnings?: Array<{ track_id: string; message: string }>;
      }>('apply_lossless_mp3_gain', {
        onProgress: progressChannel('gain', mp3Tracks),
        payload: {
          track_ids: trackIds,
          file_paths: filePaths,
          target_db_spl: targetDb,
          current_db_spls: currentDbSpls,
          allow_clipping: false,
          pending_patches: pendingPatches.length > 0 ? pendingPatches : null,
        },
      });

      // Per-file result is already remeasured and read back by the backend.
      const freshByPath = new Map(res.modified_tracks.map((m) => [m.path, m.track]));
      setTracks((prev) => prev.map((t) => {
        const updated = freshByPath.get(t.path);
        return updated ? { ...updated, id: t.id } : t;
      }));

      // Dọn dẹp pendingChanges nếu đã được merged qua smart piggybacking
      if (pendingPatches.length > 0) {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          for (const m of res.modified_tracks) {
            if (m.tags_merged && JSON.stringify(next.get(m.track_id)) === JSON.stringify(submitted.get(m.track_id))) {
              next.delete(m.track_id);
            }
          }
          return next;
        });
      }

      const count = (status: string) => res.outcomes.filter((o) => o.status === status).length;
      showToast(`Cân bằng: ${count('changed')} đã chỉnh · ${count('unchanged')} không cần đổi · ${count('limited')} giới hạn · ${count('failed')} lỗi`);

    } catch (err: any) {
      showToast(`Lỗi cân bằng âm lượng: ${err}`);
    } finally {
      finishProgress();
      setIsApplyingGain(false);
      operationLock.current = false;
    }
  };

  // Hoàn tác (Undo) thật từ Journal
  const handleUndo = async () => {
    if (operationLock.current) return;
    if (pendingRef.current.size > 0) { showToast('Hãy lưu các chỉnh sửa thẻ trước khi hoàn tác'); return; }
    operationLock.current = true;
    setIsUndoing(true);
    try {
      const res = await invoke<{
        success: boolean;
        undone_transaction_id: string;
        operation_type: string;
        restored_count: number;
        errors?: string[];
      }>('undo_last_operation');

      if (res.success || res.restored_count > 0) {
        if (res.restored_count > 0) {
          showToast(`Đã hoàn tác (${res.operation_type}) cho ${res.restored_count} tệp`);
        } else {
          showToast(`Không có tệp nào cần phục hồi`);
        }
        await refreshCurrentDirectory();
        setAudioStates({ measure: new Map(), gain: new Map() });
        setBatchProgress(null);
      }
      if (res.errors?.length) showToast(`Hoàn tác ${res.restored_count} tệp; ${res.errors.join('; ')}`);
    } catch (err: any) {
      showToast(`Không thể hoàn tác: ${err}`);
    } finally { operationLock.current = false; setIsUndoing(false); }
  };

  const openSettings = (tab: SettingsTabType = 'general') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };
  const selectAll = () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) active.select();
    else if (active instanceof HTMLElement && active.isContentEditable) document.execCommand('selectAll');
    else if (!isSettingsOpen) setSelectedIds(new Set(tracks.map((track) => track.id)));
  };
  const menuActions = useRef({ open: handleOpenFolder, save: handleSavePending, select: selectAll, settings: openSettings });
  menuActions.current = { open: handleOpenFolder, save: handleSavePending, select: selectAll, settings: openSettings };
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    const unlisteners: Array<() => void> = [];
    const actions: Array<[string, () => void]> = [
      ['trigger-open-folder', () => menuActions.current.open()],
      ['trigger-save-tags', () => menuActions.current.save()],
      ['trigger-select-all', () => menuActions.current.select()],
      ['trigger-open-settings', () => menuActions.current.settings()],
      ['trigger-open-about', () => menuActions.current.settings('about')],
    ];
    for (const [event, action] of actions) {
      listen(event, action).then((unlisten) => {
        if (disposed) unlisten(); else unlisteners.push(unlisten);
      }).catch(console.error);
    }
    return () => { disposed = true; unlisteners.forEach((unlisten) => unlisten()); };
  }, []);

  // Phím tắt toàn cục
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isSettingsOpen) handleSavePending();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        if (!isInput) {
          e.preventDefault();
          selectAll();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === ',') {
        e.preventDefault();
        openSettings();
      }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o' && !isSettingsOpen) {
        e.preventDefault();
        handleOpenFolder();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [tracks, pendingChanges, isSettingsOpen]);

  const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
  const focusedTrack = tracks.find((t) => t.id === focusedId) || null;
  const inspectedTracks = selectedTracks.length > 0 ? selectedTracks : (focusedTrack ? [focusedTrack] : []);
  const currentPatch = inspectedTracks.length === 1 ? pendingChanges.get(inspectedTracks[0].id) || null
    : inspectedTracks.length > 1 ? Object.fromEntries(Object.entries(pendingChanges.get(inspectedTracks[0].id) || {})
      .filter(([field, value]) => inspectedTracks.every((t) => pendingChanges.get(t.id)?.[field as keyof TrackMetadata] === value))) : null;
  const busy = updateBusy || isSaving || isAnalyzing || isApplyingGain || isUndoing;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. Top WindowBar (32px standard chrome token) */}
      <AppUpdates language={language} notice/>
      <WindowBar
        onOpenFolder={handleOpenFolder}
        onOpenFolderPath={handleOpenFolderPath}
        onOpenSettings={() => openSettings()}
        onSavePending={!busy && pendingChanges.size > 0 ? handleSavePending : undefined}
        onSelectAll={selectAll}
        onDeselectAll={() => setSelectedIds(new Set())}
        onViewPresetChange={setViewPreset}
        language={language}
        onOpenAbout={() => openSettings('about')}
        busy={busy}
      />

      {/* 2. Top ControlBar (Action toolbar directly below WindowBar) */}
      <ControlBar
        targetDb={targetDb}
        onTargetDbChange={setTargetDb}
        onAnalyzeLoudness={handleAnalyzeLoudness}
        onApplyLosslessGain={() => handleApplyLosslessGain('all')}
        onApplySelectedGain={() => handleApplyLosslessGain('selected')}
        selectedCount={selectedIds.size}
        gainScope={gainScope}
        onSavePending={handleSavePending}
        onUndo={handleUndo}
        pendingCount={pendingChanges.size}
        busy={busy}
        isSaving={isSaving}
        isAnalyzing={isAnalyzing}
        isApplyingGain={isApplyingGain}
        viewPreset={viewPreset}
        onViewPresetChange={setViewPreset}
        onOpenSettings={() => openSettings()}
        totalTracks={tracks.length}
      />

      {batchProgress && <div className="shrink-0 bg-slate-100 dark:bg-white/[0.03]" aria-live="polite">
        <div className="flex items-center justify-between gap-3 px-4 py-1 text-[10px] text-slate-600 dark:text-slate-400">
          <span className="truncate">{batchProgress.running ? `${batchProgress.action === 'measure' ? 'Đo dB' : 'Cân bằng'} · ${batchProgress.filename} · ${batchProgress.stage}` : 'Đã kết thúc lượt xử lý; xem kết quả từng bài'}</span>
          <span className="shrink-0 font-mono">{batchProgress.completed}/{batchProgress.total} · {Math.floor(batchProgress.fraction * 100)}%</span>
        </div>
        <div role="progressbar" aria-label="Tiến trình tổng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(batchProgress.fraction * 100)} className="h-[2px] bg-slate-200 dark:bg-white/10">
          <div className={`h-full transition-[width] duration-100 ${batchProgress.action === 'measure' ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${batchProgress.fraction * 100}%` }} />
        </div>
      </div>}

      {/* 3. Main Workspace (Left Detail Item List + Right Inspector) */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <TrackTable
          tracks={tracks}
          selectedIds={selectedIds}
          focusedId={focusedId}
          onSelectTrack={handleSelectTrack}
          onFocusTrack={handleFocusTrack}
          pendingChanges={pendingChanges}
          onInlineEditCommit={handleInlineEditCommit}
          viewPreset={viewPreset}
          targetDb={targetDb}
          measureStates={audioStates.measure}
          gainStates={audioStates.gain}
          disabled={busy}
        />

        <div inert={busy} className="flex shrink-0 min-h-0">
        <Inspector
          selectedTracks={inspectedTracks}
          pendingPatch={currentPatch}
          onFieldChange={handleFieldChange}
          onCoverArtChange={handleCoverArtChange}
          onRemoveCoverArt={handleRemoveCoverArt}
        />
        </div>
      </div>

      {/* 4. Bottom Mini Player */}
      <MiniPlayer currentTrack={focusedTrack} targetDb={targetDb} />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        targetDb={targetDb}
        onTargetDbChange={setTargetDb}
        theme={theme}
        onThemeChange={setTheme}
        language={language}
        onLanguageChange={setLanguage}
        initialTab={settingsTab}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/30 text-xs font-medium text-cyan-200 shadow-2xl shadow-black/80 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

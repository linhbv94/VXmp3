import React, { useState, useRef, useEffect } from 'react';
import { DbLevelCell } from './db_level_cell';
import { TrackAudioProgress } from '../types/audio_progress';
import { useVirtualizer } from '../hooks/useVirtualizer';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Music2
} from 'lucide-react';
import { AudioTrack, ViewPreset, TrackMetadata } from '../types';

interface TrackTableProps {
  tracks: AudioTrack[];
  selectedIds: Set<string>;
  focusedId: string | null;
  onSelectTrack: (id: string, isShift: boolean, isCtrl: boolean) => void;
  onFocusTrack: (id: string) => void;
  pendingChanges: Map<string, Partial<TrackMetadata>>;
  onInlineEditCommit: (trackId: string, field: keyof TrackMetadata, value: any) => void;
  viewPreset: ViewPreset;
  targetDb: number;
  measureStates: Map<string, TrackAudioProgress>;
  gainStates: Map<string, TrackAudioProgress>;
  disabled: boolean;
}

export const TrackTable: React.FC<TrackTableProps> = ({
  tracks,
  selectedIds,
  focusedId,
  onSelectTrack,
  onFocusTrack,
  pendingChanges,
  onInlineEditCommit,
  viewPreset,
  targetDb,
  measureStates,
  gainStates,
  disabled,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Trạng thái ô đang inline edit
  const [editingCell, setEditingCell] = useState<{
    trackId: string;
    field: keyof TrackMetadata;
    value: string;
    originalValue: string;
  } | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const getCellDisplayValue = (track: AudioTrack, field: keyof TrackMetadata): string => {
    const pending = pendingChanges.get(track.id);
    const val = pending?.[field] !== undefined ? pending[field] : track.metadata[field];
    return val !== null && val !== undefined ? String(val) : '';
  };

  // Tự động focus vào input khi kích hoạt inline edit (chỉ khi đổi cell)
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell?.trackId, editingCell?.field]);

  // Phím F2 để kích hoạt inline edit ô Title của bài đang focus
  useEffect(() => {
    const handleTableKeyDown = (e: KeyboardEvent) => {
      if (!disabled && e.key === 'F2' && focusedId && !editingCell && !(e.target as HTMLElement).closest('input, textarea, [contenteditable]') && !document.querySelector('[role="dialog"]')) {
        const focusedTrack = tracks.find((t) => t.id === focusedId);
        if (focusedTrack) {
          e.preventDefault();
          setEditingCell({
            trackId: focusedTrack.id,
            field: 'title',
            value: getCellDisplayValue(focusedTrack, 'title'),
            originalValue: getCellDisplayValue(focusedTrack, 'title'),
          });
        }
      }
    };
    window.addEventListener('keydown', handleTableKeyDown);
    return () => window.removeEventListener('keydown', handleTableKeyDown);
  }, [focusedId, editingCell, tracks, pendingChanges, disabled]);

  const handleCellClick = (trackId: string, field: keyof TrackMetadata, currentValue: string) => {
    if (disabled) return;
    onSelectTrack(trackId, false, false);
    onFocusTrack(trackId);
    setEditingCell({ trackId, field, value: currentValue, originalValue: currentValue });
  };

  const editValue = (field: keyof TrackMetadata, value: string) => field === 'year'
    ? (value ? Number.parseInt(value, 10) || null : null) : value;

  // Stage every keystroke: Cmd/Ctrl+S also saves the currently focused cell.
  const changeEditing = (value: string) => {
    if (!editingCell) return;
    setEditingCell({ ...editingCell, value });
    onInlineEditCommit(editingCell.trackId, editingCell.field, editValue(editingCell.field, value));
  };
  const commitEditing = () => setEditingCell(null);
  const cancelEditing = () => {
    if (editingCell) onInlineEditCommit(editingCell.trackId, editingCell.field, editValue(editingCell.field, editingCell.originalValue));
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: keyof TrackMetadata) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitEditing();
      // Chuyển xuống hàng bên dưới
      const nextIndex = e.shiftKey ? Math.max(0, index - 1) : Math.min(tracks.length - 1, index + 1);
      if (tracks[nextIndex]) {
        onSelectTrack(tracks[nextIndex].id, false, false);
        onFocusTrack(tracks[nextIndex].id);
        setEditingCell({
          trackId: tracks[nextIndex].id,
          field,
          value: getCellDisplayValue(tracks[nextIndex], field),
          originalValue: getCellDisplayValue(tracks[nextIndex], field),
        });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      commitEditing();
      // Chuyển sang cột bên cạnh
      const fields: Array<keyof TrackMetadata> = ['title', 'artist', 'album', 'year', 'genre'];
      const currentIdx = fields.indexOf(field);
      if (currentIdx !== -1) {
        const nextField = e.shiftKey
          ? fields[Math.max(0, currentIdx - 1)]
          : fields[Math.min(fields.length - 1, currentIdx + 1)];
        setEditingCell({
          trackId: tracks[index].id,
          field: nextField,
          value: getCellDisplayValue(tracks[index], nextField),
          originalValue: getCellDisplayValue(tracks[index], nextField),
        });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelEditing();
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 select-none p-8 text-center">
        <Music2 size={48} className="text-slate-600 mb-3 stroke-[1.5]" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Danh sách tệp nhạc trống</p>
        <p className="text-xs text-slate-600 mt-1">
          Kéo thả thư mục chứa tệp MP3 vào đây hoặc bấm nút "Mở thư mục" trên thanh tiêu đề.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden select-none">
      <div className="flex-1 min-h-0 overflow-x-auto flex flex-col">
      {/* Table Header */}
      <div style={{ minWidth: viewPreset === 'all' ? 1370 : viewPreset === 'tags' ? 1010 : 680 }} className="h-9 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center px-3 z-10 shrink-0">
        <div className="w-10 text-center">#</div>
        <div className="w-10 text-center">🖼️</div>
        <div className="w-56 px-2 truncate">Tên tệp</div>

        {/* Các cột Tag (Ẩn ở chế độ mp3gain) */}
        {viewPreset !== 'mp3gain' && (
          <>
            <div className="w-20 px-2 truncate">Thẻ</div>
            <div className="flex-1 min-w-[140px] px-2 truncate">Tiêu đề (Title)</div>
            <div className="w-36 px-2 truncate">Nghệ sĩ (Artist)</div>
            <div className="w-36 px-2 truncate">Album</div>
            <div className="w-16 text-center">Năm</div>
            <div className="w-24 px-2 truncate">Thể loại</div>
          </>
        )}

        {/* Các cột Âm lượng MP3Gain (Ẩn ở chế độ tags) */}
        {viewPreset !== 'tags' && (
          <>
            <div className="w-20 text-right px-2">dB hiện tại</div>
            <div className="w-20 text-right px-2">Mục tiêu</div>
            <div className="w-20 text-right px-2">Gain chênh</div>
            <div className="w-16 text-center">Nấc MP3</div>
            <div className="w-16 text-center">⚠️ Clip</div>
          </>
        )}
      </div>

      {/* Virtualized Body */}
      <div ref={parentRef} style={{ minWidth: viewPreset === 'all' ? 1370 : viewPreset === 'tags' ? 1010 : 680 }} className="flex-1 overflow-y-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const track = tracks[virtualRow.index];
            const isSelected = selectedIds.has(track.id);
            const isFocused = focusedId === track.id;
            const pendingPatch = pendingChanges.get(track.id);

            // Giá trị hiển thị ưu tiên pending
            const title = pendingPatch?.title ?? track.metadata.title;
            const artist = pendingPatch?.artist ?? track.metadata.artist;
            const album = pendingPatch?.album ?? track.metadata.album;
            const year = pendingPatch?.year !== undefined ? pendingPatch.year : track.metadata.year;
            const genre = pendingPatch?.genre ?? track.metadata.genre;

            const isPendingRow = Boolean(pendingPatch && Object.keys(pendingPatch).length > 0);

            // Tính toán gain hiển thị
            const currentDb = track.loudness?.measured_db_spl;
            const gainDiff = currentDb != null ? (targetDb - currentDb) : null;
            const mp3Steps = gainDiff != null ? Math.round(gainDiff / 1.50515) : null;
            const hasClipping = track.loudness?.clipping_risk ?? false;

            return (
              <div
                key={track.id}
                onClick={(e) => {
                  onSelectTrack(track.id, e.shiftKey, e.metaKey || e.ctrlKey);
                  onFocusTrack(track.id);
                }}
                className={`absolute top-0 left-0 w-full h-[36px] flex items-center px-3 text-xs border-b border-white/5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 text-slate-900 dark:text-white'
                    : isFocused
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/5'
                } ${isPendingRow ? 'border-l-2 border-l-cyan-400' : ''}`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Track Number */}
                <div className="w-10 text-center text-slate-500 font-mono text-[11px]">
                  {track.metadata.track_number ? String(track.metadata.track_number).padStart(2, '0') : String(virtualRow.index + 1).padStart(2, '0')}
                </div>

                {/* Cover Art Thumbnail */}
                <div className="w-10 flex items-center justify-center">
                  {track.metadata.cover_art ? (
                    <img
                      src={track.metadata.cover_art.thumbnail_data_url}
                      alt="Cover"
                      className="w-5 h-5 rounded object-cover shadow-xs border border-slate-200 dark:border-white/10"
                    />
                  ) : (
                    <span className="text-slate-600 text-[10px]">—</span>
                  )}
                </div>

                {/* File name */}
                <div className="w-56 px-2 truncate font-mono text-[11px] text-slate-700 dark:text-slate-300" title={track.filename}>
                  {track.filename}
                </div>

                {/* Các cột Thẻ Tag */}
                {viewPreset !== 'mp3gain' && (
                  <>
                    <div className="w-20 px-2 truncate text-slate-500 text-[10px]">
                      {track.tag_version}
                    </div>

                    {/* Tiêu đề (Title) - Có hỗ trợ Inline Edit */}
                    <div
                      className="flex-1 min-w-[140px] px-2 truncate"
                      role={editingCell?.trackId === track.id && editingCell?.field === 'title' ? undefined : 'button'}
                      aria-label={`Sửa Title của ${track.filename}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') { e.preventDefault(); handleCellClick(track.id, 'title', getCellDisplayValue(track, 'title')); } }}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return; e.stopPropagation(); handleCellClick(track.id, 'title', title); }}
                    >
                      {editingCell?.trackId === track.id && editingCell?.field === 'title' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => changeEditing(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitEditing}
                          onKeyDown={(e) => handleKeyDown(e, virtualRow.index, 'title')}
                          className="w-full px-1.5 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span className={pendingPatch?.title !== undefined ? 'text-cyan-300 font-medium' : ''}>
                          {title || <span className="text-slate-600 italic">Trống</span>}
                        </span>
                      )}
                    </div>

                    {/* Nghệ sĩ (Artist) */}
                    <div
                      className="w-36 px-2 truncate"
                      role={editingCell?.trackId === track.id && editingCell?.field === 'artist' ? undefined : 'button'}
                      aria-label={`Sửa Artist của ${track.filename}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') { e.preventDefault(); handleCellClick(track.id, 'artist', getCellDisplayValue(track, 'artist')); } }}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return; e.stopPropagation(); handleCellClick(track.id, 'artist', artist); }}
                    >
                      {editingCell?.trackId === track.id && editingCell?.field === 'artist' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => changeEditing(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitEditing}
                          onKeyDown={(e) => handleKeyDown(e, virtualRow.index, 'artist')}
                          className="w-full px-1.5 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span className={pendingPatch?.artist !== undefined ? 'text-cyan-300 font-medium' : ''}>
                          {artist || <span className="text-slate-600 italic">—</span>}
                        </span>
                      )}
                    </div>

                    {/* Album */}
                    <div
                      className="w-36 px-2 truncate"
                      role={editingCell?.trackId === track.id && editingCell?.field === 'album' ? undefined : 'button'}
                      aria-label={`Sửa Album của ${track.filename}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') { e.preventDefault(); handleCellClick(track.id, 'album', getCellDisplayValue(track, 'album')); } }}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return; e.stopPropagation(); handleCellClick(track.id, 'album', album); }}
                    >
                      {editingCell?.trackId === track.id && editingCell?.field === 'album' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => changeEditing(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitEditing}
                          onKeyDown={(e) => handleKeyDown(e, virtualRow.index, 'album')}
                          className="w-full px-1.5 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span className={pendingPatch?.album !== undefined ? 'text-cyan-300 font-medium' : ''}>
                          {album || <span className="text-slate-600 italic">—</span>}
                        </span>
                      )}
                    </div>

                    {/* Năm */}
                    <div
                      className="w-16 text-center text-slate-600 dark:text-slate-400"
                      role={editingCell?.trackId === track.id && editingCell?.field === 'year' ? undefined : 'button'}
                      aria-label={`Sửa Year của ${track.filename}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') { e.preventDefault(); handleCellClick(track.id, 'year', getCellDisplayValue(track, 'year')); } }}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return; e.stopPropagation(); handleCellClick(track.id, 'year', String(year || '')); }}
                    >
                      {editingCell?.trackId === track.id && editingCell?.field === 'year' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => changeEditing(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitEditing}
                          onKeyDown={(e) => handleKeyDown(e, virtualRow.index, 'year')}
                          className="w-full px-1 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs text-white text-center focus:outline-none"
                        />
                      ) : (
                        <span className={pendingPatch?.year !== undefined ? 'text-cyan-300 font-medium' : ''}>
                          {year || '—'}
                        </span>
                      )}
                    </div>

                    {/* Thể loại */}
                    <div
                      className="w-24 px-2 truncate text-slate-600 dark:text-slate-400"
                      role={editingCell?.trackId === track.id && editingCell?.field === 'genre' ? undefined : 'button'}
                      aria-label={`Sửa Genre của ${track.filename}`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === 'Enter') { e.preventDefault(); handleCellClick(track.id, 'genre', getCellDisplayValue(track, 'genre')); } }}
                      onClick={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') return; e.stopPropagation(); handleCellClick(track.id, 'genre', genre || ''); }}
                    >
                      {editingCell?.trackId === track.id && editingCell?.field === 'genre' ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingCell.value}
                          onChange={(e) => changeEditing(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={commitEditing}
                          onKeyDown={(e) => handleKeyDown(e, virtualRow.index, 'genre')}
                          className="w-full px-1.5 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span className={pendingPatch?.genre !== undefined ? 'text-cyan-300 font-medium' : ''}>
                          {genre || '—'}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* Các cột Âm lượng MP3Gain */}
                {viewPreset !== 'tags' && (
                  <>
                    <div className="w-20 shrink-0 px-1">
                      <DbLevelCell value={currentDb} progress={measureStates.get(track.path)} />
                    </div>
                    <div className="w-20 shrink-0 px-1">
                      <DbLevelCell value={targetDb} target progress={gainStates.get(track.path)} />
                    </div>

                    {/* Gain chênh lệch */}
                    <div className="w-20 text-right px-2 font-mono text-[11px]">
                      {gainDiff !== null ? (
                        <span className={gainDiff > 0 ? 'text-emerald-400' : gainDiff < 0 ? 'text-amber-400' : 'text-slate-600 dark:text-slate-400'}>
                          {gainDiff > 0 ? `+${gainDiff.toFixed(1)}` : gainDiff.toFixed(1)} dB
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>

                    {/* Nấc thay đổi MP3 */}
                    <div className="w-16 text-center font-mono text-[11px]">
                      {mp3Steps !== null ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
                          {mp3Steps > 0 ? `+${mp3Steps}` : mp3Steps}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>

                    {/* Cảnh báo Clipping */}
                    <div className="w-16 flex items-center justify-center">
                      {!track.loudness ? (
                        <span title="Chưa đo âm lượng">—</span>
                      ) : hasClipping ? (
                        <span title="Nguy cơ vỡ tiếng: Dự báo đỉnh sóng vượt 0.0 dBTP">
                          <AlertTriangle size={14} className="text-amber-400" />
                        </span>
                      ) : (
                        <span title="An toàn (Không vỡ tiếng)">
                          <CheckCircle2 size={13} className="text-emerald-500/50" />
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};

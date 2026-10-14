import React from 'react';
import { 
  Volume2, 
  Activity, 
  Save, 
  Undo2,
  ListChecks, 
  LayoutGrid, 
  Tag, 
  Sliders,
  Loader2
} from 'lucide-react';
import { ViewPreset } from '../types';

interface ControlBarProps {
  targetDb: number;
  onTargetDbChange: (db: number) => void;
  onAnalyzeLoudness: () => void;
  onApplyLosslessGain: () => void;
  onApplySelectedGain: () => void;
  selectedCount: number;
  gainScope: 'all' | 'selected';
  onSavePending: () => void;
  onUndo: () => void;
  pendingCount: number;
  busy: boolean;
  isSaving: boolean;
  isAnalyzing: boolean;
  isApplyingGain: boolean;
  viewPreset: ViewPreset;
  onViewPresetChange: (preset: ViewPreset) => void;
  onOpenSettings?: () => void;
  totalTracks: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  targetDb,
  onTargetDbChange,
  onAnalyzeLoudness,
  onApplyLosslessGain,
  onApplySelectedGain,
  selectedCount,
  gainScope,
  onSavePending,
  onUndo,
  pendingCount,
  busy,
  isSaving,
  isAnalyzing,
  isApplyingGain,
  viewPreset,
  onViewPresetChange,
  onOpenSettings: _onOpenSettings,
  totalTracks,
}) => {
  return (
    <div className="h-12 border-b border-slate-200 dark:border-white/10 glass-panel px-4 flex items-center justify-between select-none shrink-0 z-30 gap-4 overflow-x-auto">
      {/* Cụm điều khiển trái: Thông tin bài hát */}
      <div className="flex shrink-0 items-center gap-3 titlebar-no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {totalTracks > 0 && (
          <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
            {totalTracks.toLocaleString()} bài hát
          </span>
        )}
      </div>

      {/* Cụm điều khiển giữa: Cân bằng Âm lượng MP3Gain & Thao tác */}
      <div className="flex shrink-0 items-center gap-2.5 titlebar-no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Thiết lập mức âm lượng mục tiêu */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
          <Volume2 size={14} className="text-cyan-400" />
          <span className="text-slate-600 dark:text-slate-400">Mục tiêu:</span>
          <select
            disabled={busy}
            value={targetDb}
            onChange={(e) => onTargetDbChange(parseFloat(e.target.value))}
            className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
          >
            <option value={89.0} className="bg-slate-900 text-slate-800 dark:text-slate-200">89.0 dB (ReplayGain Chuẩn)</option>
            <option value={92.0} className="bg-slate-900 text-slate-800 dark:text-slate-200">92.0 dB (Vừa phải)</option>
            <option value={96.0} className="bg-slate-900 text-slate-800 dark:text-slate-200">96.0 dB (Âm lượng lớn)</option>
          </select>
        </div>

        {/* Nút Đo độ lớn dB thật */}
        <button
          type="button"
          onClick={onAnalyzeLoudness}
          disabled={totalTracks === 0 || busy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            totalTracks === 0 || isAnalyzing || isApplyingGain
              ? 'bg-slate-100 dark:bg-white/5 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
              : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30 cursor-pointer shadow-xs'
          }`}
          title="Phân tích độ lớn âm lượng EBU R128 & ITU-R BS.1770 cho danh sách bài hát"
        >
          {isAnalyzing ? (
            <Loader2 size={14} className="animate-spin text-cyan-400" />
          ) : (
            <Activity size={14} className="text-cyan-400" />
          )}
          <span>{isAnalyzing ? 'Đang đo...' : 'Đo dB'}</span>
        </button>

        {/* Nút 1-Click Cân bằng MP3Gain */}
        <button
          type="button"
          onClick={onApplyLosslessGain}
          disabled={totalTracks === 0 || busy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            totalTracks === 0 || isApplyingGain || isAnalyzing
              ? 'bg-slate-100 dark:bg-white/5 text-slate-500 border-white/5 opacity-50 cursor-not-allowed'
              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30 shadow-xs cursor-pointer'
          }`}
          title="Đo và cân bằng tất cả MP3 trong danh sách; bỏ qua tệp khác và giới hạn gain để tránh clipping"
        >
          {isApplyingGain && gainScope === 'all' ? (
            <Loader2 size={14} className="animate-spin text-amber-300" />
          ) : (
            <Volume2 size={14} className="text-amber-400" />
          )}
          <span>{isApplyingGain && gainScope === 'all' ? 'Đang cân bằng...' : 'Cân bằng cả list'}</span>
        </button>

        <button type="button" onClick={onApplySelectedGain} disabled={selectedCount === 0 || busy}
          title="Đo và cân bằng riêng các MP3 đang chọn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
          {isApplyingGain && gainScope === 'selected' ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
          <span>{isApplyingGain && gainScope === 'selected' ? 'Đang cân bằng...' : `Cân bằng đã chọn${selectedCount ? ` (${selectedCount})` : ''}`}</span>
        </button>

        {/* Nút Lưu thay đổi thẻ Pending - Hoạt động thật an toàn */}
        <button
          type="button"
          onClick={onSavePending}
          disabled={pendingCount === 0 || busy}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            pendingCount > 0
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10 cursor-pointer shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
          }`}
          title="Lưu tất cả các chỉnh sửa thẻ vào đĩa (Cmd/Ctrl + S)"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span>Lưu {pendingCount > 0 && `(${pendingCount})`}</span>
        </button>

        {/* Nút Hoàn tác (Undo) thật từ Journal */}
        <button
          type="button"
          disabled={busy}
          onClick={onUndo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
          title="Hoàn tác lần lưu/cân bằng gần nhất (Undo)"
        >
          <Undo2 size={14} />
          <span>Hoàn tác</span>
        </button>
      </div>

      {/* Cụm điều khiển phải: Chế độ xem & Cài đặt */}
      <div className="flex shrink-0 items-center gap-2 titlebar-no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* View Preset Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => onViewPresetChange('all')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewPreset === 'all'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
            }`}
            title="Chế độ Đầy đủ (Tất cả các cột)"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewPresetChange('tags')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewPreset === 'tags'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
            }`}
            title="Chế độ Thẻ nhạc (Metadata Tagging)"
          >
            <Tag size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewPresetChange('mp3gain')}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              viewPreset === 'mp3gain'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'
            }`}
            title="Chế độ MP3Gain (Chuyên cân bằng âm lượng)"
          >
            <Sliders size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

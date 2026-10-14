import { TrackAudioProgress } from '../types/audio_progress';

export function DbLevelCell({ value, progress, target = false }: {
  value?: number; progress?: TrackAudioProgress; target?: boolean;
}) {
  const running = progress?.status === 'running';
  const displayedValue = running && !target ? progress.preview_db ?? value : value;
  const queued = progress?.status === 'queued';
  const failed = progress?.status === 'failed';
  const limited = progress?.status === 'limited';
  const terminalLabel = failed ? 'Lỗi' : limited ? 'Giới hạn' : progress?.status === 'unchanged' ? 'Không đổi'
    : progress?.status === 'skipped' ? 'Bỏ qua' : progress?.status === 'changed' ? 'Đã chỉnh' : '';
  const fill = running ? (progress.percent == null ? undefined : progress.percent * 100)
    : value == null ? 0 : Math.max(0, Math.min(100, (value - 60) * 2));
  const detail = progress?.message || (running ? `${progress.stage}${!target && progress.preview_db != null ? ' · dB tạm tính đến phần đã quét' : ''}${progress.percent != null ? ` · ${Math.round(progress.percent * 100)}%` : ''}`
    : queued ? 'Chờ xử lý' : target ? 'Mức loudness mục tiêu; gain MP3 theo nấc khoảng 1,5 dB' : 'Loudness toàn bài, dB quy ước = 107 + LUFS');
  return (
    <div className="flex flex-col items-end gap-0.5" title={detail}>
      <div role={running ? 'progressbar' : undefined} aria-label={`${target ? 'Cân bằng' : 'Đo'} dB: ${progress?.stage || 'Mức âm lượng'}`}
        aria-valuemin={running ? 0 : undefined} aria-valuemax={running ? 100 : undefined}
        aria-valuenow={running && progress.percent != null ? Math.round(progress.percent * 100) : undefined}
        aria-valuetext={detail}
        className={`db-level-cell relative w-[68px] h-[20px] rounded-md border overflow-hidden font-mono text-[10px] flex items-center justify-center ${
          failed ? 'border-rose-500/60 text-rose-600 dark:text-rose-300' : limited ? 'border-amber-500/60 text-amber-700 dark:text-amber-300'
          : 'border-slate-300 dark:border-white/20 text-slate-800 dark:text-slate-100'} ${queued ? 'opacity-45' : ''}`}>
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 ${running ? 'db-loading-fill' : ''} ${
          failed ? 'bg-rose-500/15' : limited || target ? 'bg-amber-500/25' : 'bg-cyan-500/25'} ${running && fill == null ? 'db-indeterminate-fill' : ''}`}
          style={{ width: fill == null ? '35%' : `${fill}%` }} />
        <span className="relative z-10 tabular-nums">{displayedValue == null ? '…' : `${displayedValue.toFixed(1)} dB`}</span>
        {running && <span aria-hidden="true" className="absolute right-0 top-0 h-full w-0.5 bg-current opacity-70 animate-pulse" />}
      </div>
      {(running || queued || terminalLabel) && <span className={`text-[8px] leading-[8px] font-sans truncate max-w-[72px] ${failed ? 'text-rose-500' : limited ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {running ? progress.percent == null ? 'Đang xử lý' : `${Math.round(progress.percent * 100)}%` : queued ? 'Chờ' : terminalLabel}
      </span>}
    </div>
  );
}

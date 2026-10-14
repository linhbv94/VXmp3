import React from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useAppUpdater, checkForUpdates, installUpdate, restartAfterUpdate, dismissUpdateNotice } from '../services/app_updater';

export const AppUpdates: React.FC<{ language: 'vi' | 'en'; notice?: boolean }> = ({ language, notice = false }) => {
  const update = useAppUpdater();
  const vi = language === 'vi';
  const busy = ['checking', 'downloading', 'installing'].includes(update.status);
  if (notice && !update.noticeVisible) return null;

  const messages = {
    idle: vi ? 'Tự kiểm tra phiên bản mới khi mở ứng dụng.' : 'Updates are checked automatically on startup.',
    checking: vi ? 'Đang kiểm tra cập nhật…' : 'Checking for updates…',
    current: vi ? 'Bạn đang dùng phiên bản mới nhất.' : 'You are up to date.',
    available: vi ? `Có phiên bản mới v${update.version}.` : `Version ${update.version} is available.`,
    downloading: vi ? `Đang tải cập nhật${update.progress === undefined ? '…' : `: ${update.progress}%`}` : `Downloading update${update.progress === undefined ? '…' : `: ${update.progress}%`}`,
    installing: vi ? 'Đang cài đặt cập nhật…' : 'Installing update…',
    installed: vi ? 'Đã cập nhật. Khởi động lại để dùng phiên bản mới.' : 'Update installed. Restart to use the new version.',
    error: vi ? 'Chưa cập nhật được. Kiểm tra kết nối và thử lại.' : 'Update failed. Check your connection and try again.',
    disabled: vi ? 'Cập nhật hoạt động trong bản đã cài, ở cửa sổ chính. Nếu đã đóng cửa sổ chính, hãy mở lại ứng dụng.' : 'Updates are available in installed builds, in the main window. Reopen the app if the main window was closed.',
  };

  return (
    <section
      aria-label={vi ? 'Cập nhật ứng dụng' : 'Application updates'}
      className={notice
        ? 'fixed bottom-5 right-5 z-[70] max-w-sm rounded-xl border border-cyan-500/30 bg-white dark:bg-[#141821] p-4 text-xs text-slate-800 dark:text-slate-200 shadow-xl'
        : 'rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3.5 text-xs text-left text-slate-700 dark:text-slate-300'}
    >
      <div className="flex items-start justify-between gap-3">
        <p role="status" aria-live="polite">{messages[update.status]}</p>
        {notice && !busy && (
          <button type="button" onClick={dismissUpdateNotice} aria-label={vi ? 'Đóng' : 'Dismiss'} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10">
            <X size={14} />
          </button>
        )}
      </div>
      {update.status === 'available' && (
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {vi ? 'Ứng dụng sẽ tải, cài và khởi động lại. Hoàn tất thao tác đang làm trước khi cập nhật.' : 'The app will download, install and restart. Finish your current work before updating.'}
        </p>
      )}
      {update.error && (
        <details className="mt-2 break-words text-slate-500 dark:text-slate-400">
          <summary>{vi ? 'Chi tiết lỗi' : 'Error details'}</summary>
          <p className="mt-1">{update.error}</p>
        </details>
      )}
      {update.status !== 'disabled' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => { void (update.status === 'available' ? installUpdate() : update.status === 'installed' ? restartAfterUpdate() : checkForUpdates()); }}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-wait"
        >
          {update.status === 'available' ? <Download size={14} /> : <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />}
          {update.status === 'available'
            ? (vi ? 'Cập nhật & khởi động lại' : 'Update & restart')
            : update.status === 'installed'
              ? (vi ? 'Khởi động lại' : 'Restart')
              : (vi ? 'Kiểm tra cập nhật' : 'Check for updates')}
        </button>
      )}
    </section>
  );
};

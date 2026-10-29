import {isTauri} from '@tauri-apps/api/core';
import React, { useState, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  Volume2, 
  Settings, 
  Minus, 
  Square, 
  X,
  FolderOpen
} from 'lucide-react';
import { Language, t } from '../i18n/app_translations';
import { ViewPreset } from '../types';
import { RecentButton } from './recent_button';

interface WindowBarProps {
  onOpenFolder: () => void;
  onOpenFolderPath?: (path: string) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onSavePending?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onViewPresetChange?: (preset: ViewPreset) => void;
  language: Language;
  busy?: boolean;
}

export const WindowBar: React.FC<WindowBarProps> = ({
  onOpenFolder,
  onOpenFolderPath,
  onOpenSettings,
  onOpenAbout,
  onSavePending,
  onSelectAll,
  onDeselectAll,
  onViewPresetChange,
  language = 'vi',
  busy = false,
}) => {
  const i18n = t(language);
  const isMac =
    typeof navigator !== 'undefined' &&
    (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent));

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isMac && isTauri()) {
      getCurrentWindow().setDecorations(false).catch(() => {});
    }
  }, [isMac]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.button === 0 &&
      !(e.target as HTMLElement).closest('button, input, select, textarea, [role="button"], [data-no-drag]')
    ) {
      getCurrentWindow().startDragging().catch(() => {});
    }
  };

  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      await getCurrentWindow().toggleMaximize();
    } catch {}
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch {}
  };

  // Windows Menu Bar Structure (per desktop UI standards: no icon/title on Windows, menus on the left)
  const windowsMenus: Record<string, Array<{ label: string; shortcut?: string; action: () => void; disabled?: boolean }>> = {
    [i18n.menu_file]: [
      { label: i18n.open_folder, shortcut: 'Cmd/Ctrl+O', action: onOpenFolder, disabled: busy },
      ...(onSavePending ? [{ label: i18n.save_tags, shortcut: 'Cmd/Ctrl+S', action: onSavePending }] : []),
      { label: i18n.settings, shortcut: 'Cmd/Ctrl+,', action: onOpenSettings },
      { label: i18n.close_window, shortcut: 'Alt+F4', action: handleClose },
    ],
    [i18n.menu_edit]: [
      ...(onSelectAll ? [{ label: i18n.select_all, shortcut: 'Cmd/Ctrl+A', action: onSelectAll }] : []),
      ...(onDeselectAll ? [{ label: i18n.deselect_all, shortcut: 'Esc', action: onDeselectAll }] : []),
      { label: i18n.tool_undo_disabled, shortcut: 'Cmd/Ctrl+Z', action: () => {}, disabled: true },
    ],
    [i18n.menu_view]: [
      ...(onViewPresetChange ? [
        { label: i18n.view_all, action: () => onViewPresetChange('all') },
        { label: i18n.view_tags, action: () => onViewPresetChange('tags') },
        { label: i18n.view_mp3gain, action: () => onViewPresetChange('mp3gain') },
      ] : []),
    ],
    [i18n.menu_tools]: [
      { label: i18n.tool_analyze_disabled, action: () => {}, disabled: true },
      { label: i18n.tool_gain_disabled, action: () => {}, disabled: true },
    ],
    [i18n.menu_help]: [
      { label: i18n.settings, action: onOpenSettings },
      { label: i18n.about, action: onOpenAbout },
    ],
  };

  return (
    <div
      data-tauri-drag-region
      data-vx-titlebar-root
      data-vx-titlebar-profile="standard_32"
      onMouseDown={handleMouseDown}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={`h-8 w-full bg-slate-50/95 dark:bg-[#0f1117]/95 border-b border-slate-200 dark:border-white/10 flex items-center justify-between ${
        isMac ? 'pl-[82px] pr-3' : 'pl-2 pr-2'
      } select-none text-xs shrink-0 z-40 backdrop-blur-md`}
    >
      {/* Left: Brand + Menus (Windows) */}
      <div className="flex items-center gap-3">
        <div data-vx-titlebar-brand className="flex items-center gap-1.5 shrink-0 cursor-default">
          <Volume2 data-vx-titlebar-glyph className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0 stroke-[2]" />
          <span data-vx-titlebar-title data-vx-titlebar-name className="text-slate-900 dark:text-white text-xs font-semibold shrink-0 leading-4 tracking-normal">
            {i18n.app_title}
          </span>
        </div>

        {/* Windows Menus */}
        {!isMac && (
          <div
            ref={menuRef} data-vx-windows-menu
            data-no-drag
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-0.5 text-slate-700 dark:text-slate-300 shrink-0"
          >
            {Object.keys(windowsMenus).map((menuKey) => (
              <div key={menuKey} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === menuKey ? null : menuKey)}
                  onMouseEnter={() => {
                    if (activeMenu !== null) setActiveMenu(menuKey);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white ${
                    activeMenu === menuKey ? 'bg-slate-200 dark:bg-white/15 text-cyan-800 dark:text-cyan-300 font-semibold' : ''
                  }`}
                >
                  {menuKey}
                </button>

                {activeMenu === menuKey && (
                  <div className="absolute left-0 top-full mt-1 min-w-[210px] rounded-lg bg-white dark:bg-slate-900/95 backdrop-blur-md py-1 z-50 shadow-2xl border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-100">
                    {windowsMenus[menuKey].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => {
                          if (!item.disabled) {
                            item.action();
                            setActiveMenu(null);
                          }
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors ${
                          item.disabled
                            ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            : 'hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-slate-800 dark:text-slate-200 hover:text-cyan-900 dark:hover:text-cyan-200 cursor-pointer'
                        }`}
                      >
                        <span className="truncate mr-2">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">{item.shortcut}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div
        data-no-drag
        data-vx-titlebar-actions
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2"
      >
        {/* Open Folder Button with Recent Dropdown */}
        <RecentButton
          type="folder"
          storageKey="vxmp3_recent_folders"
          label={i18n.open_folder}
          title={i18n.open_folder_tooltip}
          icon={<FolderOpen className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />}
          disabled={busy}
          onMainClick={onOpenFolder}
          onSelectRecent={(path) => {
            if (onOpenFolderPath) onOpenFolderPath(path);
            else onOpenFolder();
          }}
          dropdownAlign="right"
          emptyLabel={i18n.recent_folders_empty}
        />

        {/* Settings Button */}
        <button
          type="button"
          data-vx-titlebar-settings
          onClick={onOpenSettings}
          aria-label={i18n.settings}
          className="w-7 h-7 rounded-[6px] flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors leading-none cursor-pointer"
          title={i18n.settings}
        >
          <Settings className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Windows style window controls (Hidden on macOS) */}
        {!isMac && (
          <div className="flex items-center ml-2 border-l border-slate-200 dark:border-white/10 pl-1.5">
            <button
              type="button"
              onClick={handleMinimize}
              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
              title={i18n.win_minimize}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleMaximize}
              className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"
              title={i18n.win_maximize}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-400 rounded transition-colors"
              title={i18n.win_close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

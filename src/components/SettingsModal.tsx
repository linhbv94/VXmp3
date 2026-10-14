import {AppUpdates} from './AppUpdates';
import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  X, 
  Sliders, 
  Volume2, 
  Keyboard, 
  Sparkles, 
  Info, 
  Coffee, 
  RotateCcw, 
  ExternalLink, 
  Heart,
  ShieldAlert
} from 'lucide-react';
import { Language, t } from '../i18n/app_translations';
import qrImage from '../assets/support_qr.png';
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import packageInfo from '../../package.json';

export type SettingsTabType = 'general' | 'gain' | 'shortcuts' | 'updates' | 'about' | 'support';
export type ThemeMode = 'system' | 'dark' | 'light' | 'black';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDb: number;
  onTargetDbChange: (db: number) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  initialTab?: SettingsTabType;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  targetDb,
  onTargetDbChange,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);
  const i18n = t(language);
  const [version, setVersion] = useState(packageInfo.version);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isTauri()) getVersion().then(setVersion).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') ?? [])];
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previousFocus?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onTargetDbChange(89.0);
    onThemeChange('system');
    onLanguageChange('vi');
  };

  const shortcutItems = [
    { label: i18n.sc_play_pause, key: 'Space' },
    { label: i18n.sc_save_pending, key: 'Cmd/Ctrl + S' },
    { label: i18n.sc_select_all, key: 'Cmd/Ctrl + A' },
    { label: i18n.sc_inline_edit, key: 'F2 / Double Click' },
    { label: i18n.sc_nav_vertical, key: 'Enter / Shift + Enter' },
    { label: i18n.sc_nav_horizontal, key: 'Tab / Shift + Tab' },
    { label: i18n.sc_cancel_edit, key: 'Escape' },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
    >
      {/* Top 32px Drag Strip across modal backdrop */}
      <div
        data-tauri-drag-region
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        onMouseDown={(e) => {
          if (e.button === 0) getCurrentWindow().startDragging().catch(() => {});
        }}
        className="absolute top-0 left-0 w-full h-8 z-10 pointer-events-auto"
      />

      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={i18n.settings_title}
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 w-full max-w-2xl h-[560px] max-h-[calc(100dvh-32px)] bg-white dark:bg-[#141821] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col text-xs transition-colors duration-200"
      >
        {/* Header */}
        <div
          data-tauri-drag-region
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          onMouseDown={(e) => {
            if (
              e.button === 0 &&
              !(e.target as HTMLElement).closest('button, input, select, textarea, [role="button"]')
            ) {
              getCurrentWindow().startDragging().catch(() => {});
            }
          }}
          className="h-14 px-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-black/20 shrink-0 cursor-default select-none"
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {i18n.settings_title} VXmp3
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
            title={i18n.btn_close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Sidebar + Main Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Tab Sidebar (w-48, 192px) */}
          <aside className="w-48 border-r border-slate-200 dark:border-white/10 p-3 space-y-1.5 bg-slate-50/50 dark:bg-black/20 overflow-y-auto shrink-0">
            {/* Nhóm 1: Core Features */}
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{i18n.tab_general}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gain')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'gain'
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{i18n.tab_gain}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'shortcuts'
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>{i18n.tab_shortcuts}</span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-slate-200 dark:border-white/10" />

            {/* Nhóm 2: Information & Support */}
            <button
              type="button"
              onClick={() => setActiveTab('updates')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>{i18n.tab_updates}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>{i18n.tab_about}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('support')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-left transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold shadow-2xs'
                  : 'text-amber-700/90 dark:text-amber-400/90 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-200'
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">{i18n.tab_support}</span>
            </button>
          </aside>

          {/* Tab Content Panel */}
          <main className="flex-1 min-h-0 p-6 overflow-y-auto space-y-6 bg-white dark:bg-[#141821]">
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Theme Mode */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-3">
                    {i18n.sec_theme}
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'system', label: i18n.theme_system },
                      { id: 'dark', label: i18n.theme_dark },
                      { id: 'light', label: i18n.theme_light },
                      { id: 'black', label: i18n.theme_black },
                    ].map((tItem) => {
                      const isSelected = theme === tItem.id;
                      return (
                        <label
                          key={tItem.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-50/80 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-xs ring-1 ring-cyan-500/30'
                              : 'bg-slate-50/70 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/70 dark:hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="theme"
                            checked={isSelected}
                            onChange={() => onThemeChange(tItem.id as ThemeMode)}
                            className="text-cyan-600 accent-cyan-600"
                          />
                          <span className="font-medium text-xs">{tItem.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-3">
                    {i18n.sec_language}
                  </h4>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="language"
                        checked={language === 'vi'}
                        onChange={() => onLanguageChange('vi')}
                        className="text-cyan-600 accent-cyan-600 w-4 h-4"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                        🇻🇳 {i18n.lang_vi}
                      </span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="language"
                        checked={language === 'en'}
                        onChange={() => onLanguageChange('en')}
                        className="text-cyan-600 accent-cyan-600 w-4 h-4"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                        🇺🇸 {i18n.lang_en}
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {i18n.lang_scope_note}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: LOUDNESS & GAIN */}
            {activeTab === 'gain' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-1">
                    {i18n.sec_target_db}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {i18n.target_db_desc}
                  </p>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        targetDb === 89.0
                          ? 'bg-cyan-50/80 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-xs ring-1 ring-cyan-500/30'
                          : 'bg-slate-50/70 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="target_db"
                        checked={targetDb === 89.0}
                        onChange={() => onTargetDbChange(89.0)}
                        className="mt-0.5 accent-cyan-600 text-cyan-600"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {i18n.target_89_label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {i18n.target_89_desc}
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        targetDb === 96.0
                          ? 'bg-cyan-50/80 dark:bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-xs ring-1 ring-cyan-500/30'
                          : 'bg-slate-50/70 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="target_db"
                        checked={targetDb === 96.0}
                        onChange={() => onTargetDbChange(96.0)}
                        className="mt-0.5 accent-cyan-600 text-cyan-600"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {i18n.target_96_label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {i18n.target_96_desc}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Clipping Protection: Disabled with clear notice */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-2">
                    {i18n.sec_clipping}
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-white/10 opacity-70">
                    <label className="flex items-start gap-2.5 cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="mt-0.5 accent-cyan-600 rounded cursor-not-allowed"
                      />
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {i18n.clipping_checkbox}
                        </span>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>{i18n.clipping_disabled_note}</span>
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* AutoSave Option: Disabled with clear notice */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-2">
                    {i18n.sec_autosave}
                  </h4>
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-white/10 opacity-70">
                    <label className="flex items-start gap-2.5 cursor-not-allowed">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="mt-0.5 accent-cyan-600 rounded cursor-not-allowed"
                      />
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {i18n.autosave_checkbox}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {i18n.autosave_disabled_note}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 mb-2">
                  {i18n.sec_shortcuts_title}
                </h4>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  {shortcutItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5"
                    >
                      <span className="text-slate-600 dark:text-slate-400 truncate mr-2">{item.label}</span>
                      <kbd className="font-mono text-cyan-800 dark:text-cyan-300 font-semibold bg-white dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 shadow-2xs shrink-0">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: UPDATES */}
            {activeTab === 'updates' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        <span>{i18n.updates_title}</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {i18n.updates_desc}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 rounded-full border border-cyan-300 dark:border-cyan-500/30">
                      v{version}
                    </span>
                  </div>
                </div>

                <AppUpdates language={language}/>
              </div>
            )}

            {/* TAB 5: ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Khung 1: Thông tin ứng dụng */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/20">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white shrink-0 font-bold text-2xl">
                    <Volume2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        VXmp3
                      </h3>
                      <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 rounded-full border border-cyan-300 dark:border-cyan-500/30">
                        v{version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {i18n.about_tagline}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                      <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                        {i18n.about_author}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <a
                        href="https://github.com/linhbv94"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-mono text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>github.com/linhbv94</span>
                      </a>
                      <span className="text-slate-400 text-[11px]">{i18n.about_repo_status}</span>
                    </div>
                  </div>
                </div>

                {/* Khung 2: Giới thiệu ngắn 2-3 câu công dụng thực */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{i18n.about_summary_title}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {i18n.about_summary_text}
                  </p>
                </div>

                {/* Khung 3: Công nghệ nền tảng */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {i18n.about_tech_title}
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{i18n.about_tech_1} (lofty metadata engine, symphonia decoder, ebur128)</li>
                    <li>{i18n.about_tech_2}</li>
                    <li>{i18n.about_tech_3}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 6: SUPPORT AUTHOR */}
            {activeTab === 'support' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Banner mở đầu ấm áp */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{i18n.support_title}</span>
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {i18n.support_thank_note}
                    </p>
                  </div>
                </div>

                {/* Card QR VietQR chuẩn, nền trắng sắc nét đặt ở vị trí trung tâm */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80 flex flex-col items-center justify-center">
                    <img
                      src={qrImage}
                      alt="VietQR Code"
                      className="w-52 h-auto object-contain rounded-lg"
                    />
                    <span className="text-[11px] font-semibold text-emerald-800 mt-2 font-mono tracking-wider">
                      VietQR • Napas247
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 max-w-sm leading-relaxed">
                    {i18n.support_scan_hint}
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-black/30 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{i18n.btn_defaults}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            {i18n.btn_close}
          </button>
        </div>
      </div>
    </div>
  );
};

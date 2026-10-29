import type {Language} from '../i18n/app_translations';
import {SettingsShell,GeneralSettings,UpdatesSettings,AboutSettings,SupportSettings,commonSettingsTabs} from './shared/settings_ui';
import {AppUpdates} from './AppUpdates';
import {useState,useEffect} from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {Volume2,Keyboard,ShieldAlert} from 'lucide-react';
import {t} from '../i18n/app_translations';
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
  initialTab?: SettingsTabType | null;
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
  initialTab = null,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab || 'general');
  const i18n = t(language);
  const [version, setVersion] = useState(packageInfo.version);

  useEffect(() => {
    if (isTauri()) getVersion().then(setVersion).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);



  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onTargetDbChange(89.0);
    onThemeChange('system');
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

return (<SettingsShell theme={theme} appName="VXmp3" language={language} tabs={[commonSettingsTabs(language)[0], {id:'gain',label:i18n.tab_gain,icon:<Volume2 size={16}/>} ,{id:'shortcuts',label:i18n.tab_shortcuts,icon:<Keyboard size={16}/>} , ...commonSettingsTabs(language).slice(1)]} activeTab={activeTab} onTabChange={id=>setActiveTab(id as SettingsTabType)} onClose={onClose} onReset={handleResetDefaults}   onDrag={() => { if (isTauri()) void getCurrentWindow().startDragging(); }}>{activeTab === 'gain' && (<div className="space-y-5 animate-in fade-in duration-150">
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
              </div>)}
{activeTab === 'shortcuts' && (<div className="space-y-4 animate-in fade-in duration-150">
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
              </div>)}
{activeTab === 'general' && <GeneralSettings language={language} theme={theme} themes={['system','dark','light','black']} onThemeChange={onThemeChange} onLanguageChange={onLanguageChange} />}
{activeTab === 'updates' && <UpdatesSettings language={language} version={version}><AppUpdates language={language}/></UpdatesSettings>}
{activeTab === 'about' && <AboutSettings language={language} appName="VXmp3" version={version} tagline={i18n.about_tagline} description={i18n.about_summary_text} repository="https://github.com/linhbv94/VXmp3" icon={<Volume2/>} technologies={[i18n.about_tech_1,i18n.about_tech_2,i18n.about_tech_3]} />}
{activeTab === 'support' && <SupportSettings language={language} qrSource={qrImage}/>}</SettingsShell>);
};

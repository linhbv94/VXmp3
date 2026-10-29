import { useEffect, useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { createUpdateController } from './update_controller';
import packageInfo from '../../package.json';

export const appVersion = packageInfo.version;
const controller = createUpdateController({
  enabled: isTauri() && !import.meta.env.DEV && getCurrentWindow().label === 'main',
  currentVersion: appVersion,
  check,
  relaunch,
  beforeInstall:async()=>{if(!window.dispatchEvent(new Event('vxmp3-before-update',{cancelable:true})))throw new Error('Hãy lưu thay đổi và đợi thao tác hiện tại hoàn tất trước khi cập nhật.');await invoke('prepare_app_update');},
  installFailed:async()=>{await invoke('cancel_app_update');},
});
export const { checkForUpdates, installUpdate, restartAfterUpdate, dismissUpdateNotice } = controller;

export function useAppUpdater() {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot);
  // Startup and Settings share one store, including under React StrictMode.
  useEffect(controller.start, []);
  return state;
}

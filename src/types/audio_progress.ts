import { AudioTrack, LoudnessData } from './index';
export type AudioAction = 'measure' | 'gain';
export type AudioStatus = 'queued' | 'running' | 'done' | 'changed' | 'unchanged' | 'limited' | 'failed' | 'skipped';
export interface TrackAudioProgress {
  action: AudioAction;
  file_path: string;
  status: AudioStatus;
  percent: number | null;
  preview_db?: number | null;
  stage: string;
  message?: string;
}
export interface AudioProgressEvent extends TrackAudioProgress {
  completed: number;
  total: number;
  measurement?: LoudnessData;
  track?: AudioTrack;
  tags_merged?: boolean;
}
export interface BatchProgress {
  action: AudioAction;
  total: number;
  completed: number;
  fraction: number;
  stage: string;
  filename: string;
  running: boolean;
}

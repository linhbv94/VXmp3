import React, { useState, useEffect, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { 
  Play, 
  Pause, 
  Volume2, 
  SlidersHorizontal, 
  Music
} from 'lucide-react';
import { AudioTrack } from '../types';

interface MiniPlayerProps {
  currentTrack: AudioTrack | null;
  targetDb: number;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ currentTrack, targetDb: _targetDb }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Tạo phần tử audio thuần
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Khi đổi bài hát
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      try {
        const assetUrl = convertFileSrc(currentTrack.path);
        audioRef.current.src = assetUrl;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      } catch (err) {
        console.warn('Lỗi gán nguồn audio:', err);
      }
    }
  }, [currentTrack]);

  // Điều chỉnh âm lượng
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (target.closest('input, textarea, select, button, a, [contenteditable="true"]') || document.querySelector('[role="dialog"]')) return;
      if (!currentTrack) return;
      event.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentTrack, isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return (
      <footer className="h-14 border-t border-slate-200 dark:border-white/10 glass-panel px-4 flex items-center justify-between text-xs text-slate-500 select-none shrink-0 z-30">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-slate-600" />
          <span>Bấm Space để nghe thử bài hát đang chọn</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="h-14 border-t border-slate-200 dark:border-white/10 glass-panel px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Thông tin bài đang phát */}
      <div className="flex items-center gap-3 w-72 truncate">
        {currentTrack.metadata.cover_art ? (
          <img
            src={currentTrack.metadata.cover_art.thumbnail_data_url}
            alt="Thumb"
            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-white/10 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
            <Music size={16} className="text-cyan-400" />
          </div>
        )}
        <div className="truncate">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {currentTrack.metadata.title || currentTrack.filename}
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
            {currentTrack.metadata.artist || 'Chưa rõ nghệ sĩ'}
          </p>
        </div>
      </div>

      {/* Điều khiển phát & Seekbar */}
      <div className="flex-1 max-w-xl flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer shadow-md shadow-cyan-500/20"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
          >
            {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
          </button>
        </div>

        <div className="w-full flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || currentTrack.duration_seconds || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span>{formatTime(duration || currentTrack.duration_seconds)}</span>
        </div>
      </div>

      {/* Nút A/B Gain & Volume slider */}
      <div className="flex items-center gap-3 w-72 justify-end">
        {/* Pill Button A/B Gain Preview - Disabled per QA Codex */}
        <button
          type="button"
          disabled={true}
          className="px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border bg-slate-100 dark:bg-white/5 text-slate-600 border-white/5 cursor-not-allowed opacity-50 transition-all"
          title="Chưa hỗ trợ A/B Gain (chờ engine đo EBU R128 thật)"
        >
          <SlidersHorizontal size={11} />
          <span>A/B Gain (Chưa hỗ trợ)</span>
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Volume2 size={14} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title="Âm lượng nghe thử"
          />
        </div>
      </div>
    </footer>
  );
};

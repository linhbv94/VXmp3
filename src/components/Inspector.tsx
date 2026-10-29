import React, { useRef } from 'react';
import { 
  Music, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Layers, 
  FileText
} from 'lucide-react';
import { AudioTrack, TrackMetadata } from '../types';
import { Language, t } from '../i18n/app_translations';

interface InspectorProps {
  selectedTracks: AudioTrack[];
  pendingPatch: Partial<TrackMetadata> | null;
  onFieldChange: (field: keyof TrackMetadata, value: any) => void;
  onCoverArtChange: (file: File) => void;
  onRemoveCoverArt: () => void;
  language?: Language;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedTracks,
  pendingPatch,
  onFieldChange,
  onCoverArtChange,
  onRemoveCoverArt,
  language = 'vi',
}) => {
  const i18n = t(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (selectedTracks.length === 0) {
    return (
      <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-white/10 glass-panel p-6 flex flex-col items-center justify-center text-center text-slate-500 select-none">
        <Music size={40} className="mb-3 text-slate-600 stroke-[1.5]" />
        <p className="text-sm font-medium">{i18n.inspector_empty_title}</p>
        <p className="text-xs text-slate-600 mt-1">
          {i18n.inspector_empty_desc}
        </p>
      </aside>
    );
  }

  const isMulti = selectedTracks.length > 1;
  const singleTrack = selectedTracks[0];

  // Giá trị hiển thị ưu tiên: pendingPatch -> singleTrack metadata (nếu 1 bài) -> rỗng (nếu multi)
  const getValue = (field: keyof TrackMetadata): any => {
    if (pendingPatch && pendingPatch[field] !== undefined) {
      return pendingPatch[field] ?? '';
    }
    if (!isMulti && singleTrack) {
      return singleTrack.metadata[field] ?? '';
    }
    return '';
  };

  const cover = pendingPatch?.cover_art !== undefined ? pendingPatch.cover_art : singleTrack?.metadata.cover_art;
  const currentCover = !isMulti && cover ? cover.thumbnail_data_url : null;

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onCoverArtChange(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCoverArtChange(e.target.files[0]);
    }
  };

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-white/10 glass-panel flex flex-col h-full overflow-hidden select-none">
      {/* Header Inspector */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMulti ? (
            <Layers size={16} className="text-cyan-400" />
          ) : (
            <FileText size={16} className="text-cyan-400" />
          )}
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {isMulti ? i18n.inspector_multi_title.replace('{count}', String(selectedTracks.length)) : i18n.inspector_single_title}
          </h2>
        </div>

        {pendingPatch && Object.keys(pendingPatch).length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
            {i18n.inspector_unsaved}
          </span>
        )}
      </div>

      {/* Form cuộn */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Khung Cover Art (Ảnh bìa) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {i18n.inspector_cover_label}
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
            className="relative group aspect-square rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 overflow-hidden flex flex-col items-center justify-center transition-all hover:border-cyan-500/40"
          >
            {currentCover ? (
              <>
                <img
                  src={currentCover}
                  alt="Cover Art"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all cursor-pointer shadow-md"
                    title={i18n.inspector_cover_replace}
                  >
                    <Upload size={14} />
                  </button>
                  <button
                    onClick={onRemoveCoverArt}
                    className="p-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 transition-all cursor-pointer shadow-md"
                    title={i18n.inspector_cover_remove}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 text-center cursor-pointer"
              >
                <ImageIcon size={32} className="text-slate-600 mb-2 group-hover:text-cyan-400 transition-colors" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-cyan-300">
                  {isMulti ? i18n.inspector_cover_drop_multi : i18n.inspector_cover_drop_single}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{i18n.inspector_cover_hint}</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>
        </div>

        {/* Các trường Text Boxes */}
        <div className="space-y-3">
          {/* Tiêu đề (chỉ hiện khi chọn 1 bài) */}
          {!isMulti && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {i18n.field_title}
              </label>
              <input
                type="text"
                value={getValue('title')}
                onChange={(e) => onFieldChange('title', e.target.value)}
                placeholder={i18n.field_title_placeholder}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          )}

          {/* Nghệ sĩ */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              {i18n.field_artist}
            </label>
            <input
              type="text"
              value={getValue('artist')}
              onChange={(e) => onFieldChange('artist', e.target.value)}
              placeholder={isMulti ? i18n.field_multi_placeholder : i18n.field_artist_placeholder}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Album */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              {i18n.field_album}
            </label>
            <input
              type="text"
              value={getValue('album')}
              onChange={(e) => onFieldChange('album', e.target.value)}
              placeholder={isMulti ? i18n.field_multi_placeholder : i18n.field_album_placeholder}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Nghệ sĩ Album */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              {i18n.field_album_artist}
            </label>
            <input
              type="text"
              value={getValue('album_artist')}
              onChange={(e) => onFieldChange('album_artist', e.target.value)}
              placeholder={i18n.field_album_artist_placeholder}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Dòng kép: Năm & Thể loại */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {i18n.field_year}
              </label>
              <input
                type="number"
                value={getValue('year') || ''}
                onChange={(e) => onFieldChange('year', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="2024"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {i18n.field_genre}
              </label>
              <input
                type="text"
                value={getValue('genre')}
                onChange={(e) => onFieldChange('genre', e.target.value)}
                placeholder="V-Pop, Pop..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Dòng kép: Track Number & Total Tracks (chỉ hiện khi 1 bài) */}
          {!isMulti && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {i18n.field_track_number}
                </label>
                <input
                  type="number"
                  value={getValue('track_number') || ''}
                  onChange={(e) => onFieldChange('track_number', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="01"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {i18n.field_total_tracks}
                </label>
                <input
                  type="number"
                  value={getValue('total_tracks') || ''}
                  onChange={(e) => onFieldChange('total_tracks', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="10"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Ghi chú (Comment) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              {i18n.field_comment}
            </label>
            <textarea
              rows={2}
              value={getValue('comment')}
              onChange={(e) => onFieldChange('comment', e.target.value)}
              placeholder={i18n.field_comment_placeholder}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { Search, Globe, Filter, Play, Pause, BookmarkPlus, Check, Loader2, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { FishAudioRemoteModel, Voice } from '../../../shared/src/types';
import { ApiClient } from '../services/api';

interface CommunityVoiceBrowserProps {
  onSelectVoice: (voice: Voice) => void;
  onSaveCustomVoice?: (voice: Voice) => void;
  savedVoiceIds?: Set<string>;
}

export const CommunityVoiceBrowser: React.FC<CommunityVoiceBrowserProps> = ({
  onSelectVoice,
  onSaveCustomVoice,
  savedVoiceIds = new Set()
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'task_count' | 'created_at'>('score');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const [models, setModels] = useState<FishAudioRemoteModel[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.getRemoteVoices({
        title: searchTerm.trim() || undefined,
        language: selectedLanguage || undefined,
        sort_by: sortBy,
        page_number: page,
        page_size: pageSize
      });
      setModels(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Fish Audio community voices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [page, sortBy, selectedLanguage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchModels();
  };

  const handleTogglePlay = (audioUrl: string) => {
    if (!audioUrl) return;

    if (currentAudioUrl === audioUrl && isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setCurrentAudioUrl(audioUrl);
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
    };
    audio.onerror = () => {
      setIsPlaying(false);
    };

    audio.play().catch(() => setIsPlaying(false));
  };

  const handleUseVoice = (model: FishAudioRemoteModel) => {
    const voice: Voice = {
      id: model._id,
      name: model.title,
      language: model.languages && model.languages[0] ? model.languages[0] : 'English',
      style: model.tags && model.tags[0] ? model.tags[0] : 'Community Voice',
      gender: 'Neutral',
      description: model.description || 'Fish Audio Community Voice Model',
      category: 'Documentary',
      isCustom: true
    };

    if (onSaveCustomVoice && !savedVoiceIds.has(model._id)) {
      onSaveCustomVoice(voice);
    }
    onSelectVoice(voice);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      {/* Header and Filter Controls */}
      <div className="bg-slate-50 dark:bg-studio-950/60 p-4 rounded-xl border border-studio-border">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Fish Audio models by voice name, accent, style..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-studio-border bg-white dark:bg-studio-900 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-lg border border-studio-border bg-white dark:bg-studio-900 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="">All Languages</option>
              <option value="en">English (en)</option>
              <option value="zh">Chinese (zh)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="es">Spanish (es)</option>
              <option value="fr">French (fr)</option>
              <option value="de">German (de)</option>
              <option value="ko">Korean (ko)</option>
              <option value="ru">Russian (ru)</option>
              <option value="ar">Arabic (ar)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="py-2 px-3 text-xs rounded-lg border border-studio-border bg-white dark:bg-studio-900 focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
            >
              <option value="score">Most Popular</option>
              <option value="task_count">Most Used</option>
              <option value="created_at">Recently Added</option>
            </select>

            <button
              type="submit"
              className="py-2 px-4 text-xs font-semibold bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-90 transition shrink-0"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchModels}
            className="font-medium underline hover:text-red-700 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid of Models */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-slate-500" />
          <p className="text-xs font-medium">Browsing Fish Audio global directory...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 dark:bg-studio-950/40 rounded-xl border border-studio-border">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No voice models found</p>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search term or language filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {models.map((model) => {
            const sampleAudioUrl =
              model.samples && model.samples.length > 0 && model.samples[0].audio
                ? model.samples[0].audio
                : null;
            const isPlayingThis = isPlaying && currentAudioUrl === sampleAudioUrl;
            const isSaved = savedVoiceIds.has(model._id);

            return (
              <div
                key={model._id}
                className="p-4 rounded-xl border border-studio-border bg-white dark:bg-studio-900 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {model.title}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-studio-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {model.languages && model.languages[0] ? model.languages[0] : 'en'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] mb-3">
                    {model.description || 'Fish Audio AI cloned voice model.'}
                  </p>

                  {/* Tags */}
                  {model.tags && model.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {model.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-50 dark:bg-studio-800 border border-studio-border text-slate-600 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-studio-border flex items-center justify-between gap-2">
                  {sampleAudioUrl ? (
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(sampleAudioUrl)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                        isPlayingThis
                          ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                          : 'bg-slate-50 dark:bg-studio-800 border-studio-border hover:bg-slate-100 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isPlayingThis ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                      <span>{isPlayingThis ? 'Pause' : 'Sample'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">No sample</span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleUseVoice(model)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition shadow-sm ml-auto"
                  >
                    {isSaved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                    <span>{isSaved ? 'Use Voice' : 'Save & Use'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {!isLoading && models.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-studio-border text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800 dark:text-slate-200">{total}</span> voices
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-studio-border hover:bg-slate-100 dark:hover:bg-studio-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, Layers, Play } from 'lucide-react';
import { api, animeApi } from '../api/client';
import { ContentItem, StreamSource, Season, Episode, WatchProgress, AnimeDubber } from '../types';
import { VideoPlayer } from '../features/player/VideoPlayer';
import { Skeleton } from '../components/ui/Skeleton';
import { BookmarkButton } from '../features/bookmarks/BookmarkButton';

export const WatchPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const episodeParam = searchParams.get('episode');

  const [content, setContent] = useState<ContentItem | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dubbers, setDubbers] = useState<AnimeDubber[]>([]);
  const [selectedDubberId, setSelectedDubberId] = useState<number | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [initialProgress, setInitialProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWatchData = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const contentRes = await api.get<ContentItem>(`/content/${slug}`);
        setContent(contentRes.data);

        let activeEp: Episode | null = null;

        // If series or anime, load seasons and select episode
        if (contentRes.data.contentType.code === 'series' || contentRes.data.contentType.code === 'anime') {
          const seasonsRes = await api.get<Season[]>(`/content/${contentRes.data.id}/seasons`);
          setSeasons(seasonsRes.data);

          const allEps = seasonsRes.data.flatMap(s => s.episodes);
          if (episodeParam) {
            activeEp = allEps.find(e => e.id === parseInt(episodeParam, 10)) || null;
          }
          if (!activeEp && allEps.length > 0) {
            activeEp = allEps[0];
          }
          setCurrentEpisode(activeEp);

          // If anime, also fetch available dubbers
          if (contentRes.data.contentType.code === 'anime') {
            try {
              const dubbersRes = await animeApi.getDubbers(contentRes.data.id);
              setDubbers(dubbersRes.data);
              if (dubbersRes.data.length > 0 && selectedDubberId === null) {
                setSelectedDubberId(dubbersRes.data[0].id);
              }
            } catch {
              // Ignore dubbers fetch error
            }
          }
        }

        // Load stream sources for this content (and episode if applicable)
        const sourcesRes = await api.get<StreamSource[]>(`/content/${contentRes.data.id}/sources`, {
          episode_id: activeEp?.id || undefined,
          dubber_id: selectedDubberId || undefined,
        });
        setSources(sourcesRes.data);

        // Load user saved progress if available
        try {
          const progressRes = await api.get<WatchProgress | null>(`/watch/progress/${contentRes.data.id}`, {
            episode_id: activeEp?.id || undefined,
          });
          if (progressRes.data && progressRes.data.progressSeconds > 10) {
            setInitialProgress(progressRes.data.progressSeconds);
          }
        } catch {
          // Progress fetch is optional for guest users
        }
      } catch (e) {
        console.error('Failed to load watch data', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadWatchData();
  }, [slug, episodeParam, selectedDubberId]);

  const handleSelectEpisode = (ep: Episode) => {
    setCurrentEpisode(ep);
    setSearchParams({ episode: String(ep.id) });
  };

  const handleSelectDubber = async (dubberId: number) => {
    setSelectedDubberId(dubberId);
    if (!content) return;
    try {
      const sourcesRes = await api.get<StreamSource[]>(`/content/${content.id}/sources`, {
        episode_id: currentEpisode?.id || undefined,
        dubber_id: dubberId,
      });
      setSources(sourcesRes.data);
    } catch (e) {
      console.error('Failed to change dubber', e);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-full aspect-video rounded-3xl" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white">Видео не найдено</h2>
        <Link to="/catalog" className="text-xs text-[#FF002F] underline mt-2 block">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back to Overview Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/content/${content.slug}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>К описанию «{content.title}»</span>
        </Link>
        <BookmarkButton
          contentId={content.id}
          initialBookmark={content.userBookmark}
        />
      </div>

      {/* Main Cinema Player Container */}
      <VideoPlayer
        contentId={content.id}
        sources={sources}
        currentEpisode={currentEpisode}
        initialProgressSeconds={initialProgress}
      />

      {/* Anime Voiceover Studio Selection */}
      {dubbers.length > 0 && (
        <div className="space-y-2 py-3 px-4 rounded-2xl bg-black border border-white/10">
          <span className="text-xs font-semibold text-gray-400">Студия озвучки (Anixart Open API):</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dubbers.map((d) => {
              const isSelected = selectedDubberId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => handleSelectDubber(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                      : 'bg-black text-gray-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {d.name} {d.isSub && '(Субтитры)'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Title & Info Bar below player */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            {content.title}
          </h1>
          {content.originalTitle && (
            <p className="text-xs text-gray-400 font-medium">
              {content.originalTitle}
            </p>
          )}
          {currentEpisode && (
            <p className="text-xs text-[#FF002F] font-semibold mt-1">
              Серия {currentEpisode.episodeNumber}: {currentEpisode.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{content.releaseYear}</span>
          <span>•</span>
          <span>{content.ageRating}</span>
          <span>•</span>
          <span>Рейтинг: <b className="text-emerald-400">{content.ratingCache.toFixed(1)}</b></span>
        </div>
      </div>

      {/* Episode Selection for Series and Anime */}
      {seasons.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FF002F]" />
            <h3 className="text-base font-bold text-white">Выбор серии</h3>
          </div>

          <div className="space-y-4">
            {seasons.map((season) => (
              <div key={season.id} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400">
                  {season.title || `Сезон ${season.seasonNumber}`}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {season.episodes.map((ep) => {
                    const isCurrent = currentEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleSelectEpisode(ep)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                          isCurrent
                            ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red font-bold'
                            : 'bg-[#000000] hover:bg-[#111111] text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'fill-current' : 'text-gray-500'}`} />
                        <span className="text-xs truncate">Серия {ep.episodeNumber}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

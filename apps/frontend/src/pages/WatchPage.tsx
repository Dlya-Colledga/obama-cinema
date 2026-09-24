import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api, animeApi } from '../api/client';
import { ContentItem, StreamSource, Season, Episode, WatchProgress, AnimeDubber } from '../types';
import { VideoPlayer } from '../features/player/VideoPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
        if (
          contentRes.data.contentType.code === 'series' ||
          contentRes.data.contentType.code === 'anime'
        ) {
          const seasonsRes = await api.get<Season[]>(`/content/${contentRes.data.id}/seasons`);
          setSeasons(seasonsRes.data);

          const allEps = seasonsRes.data.flatMap((s) => s.episodes);
          if (episodeParam) {
            activeEp = allEps.find((e) => e.id === parseInt(episodeParam, 10)) || null;
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
          const progressRes = await api.get<WatchProgress | null>(
            `/watch/progress/${contentRes.data.id}`,
            {
              episode_id: activeEp?.id || undefined,
            }
          );
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

  const handleSelectEpisode = async (ep: Episode) => {
    setCurrentEpisode(ep);
    setSearchParams({ episode: String(ep.id) });
    if (!content) return;
    try {
      const sourcesRes = await api.get<StreamSource[]>(`/content/${content.id}/sources`, {
        episode_id: ep.id,
        dubber_id: selectedDubberId || undefined,
      });
      setSources(sourcesRes.data);
    } catch (e) {
      console.error('Failed to change episode sources', e);
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 select-none">
        {/* Back to Overview Breadcrumb Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>

        {/* Main Cinema Player Skeleton */}
        <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 relative">
          <Skeleton className="w-full h-full rounded-none opacity-30" />
        </div>

        {/* Title & Info Bar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-white/5">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-64 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white">Видео не найдено</h2>
        <Link to="/catalog">
          <Button variant="link" className="mt-2 text-primary">
            Вернуться в каталог
          </Button>
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
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft className="size-4" />
          <span>К описанию «{content.title}»</span>
        </Link>
        <BookmarkButton contentId={content.id} initialBookmark={content.userBookmark} />
      </div>

      {/* Main Cinema Player with Integrated Inside Dubbers & Episodes */}
      <VideoPlayer
        contentId={content.id}
        contentTitle={content.title}
        sources={sources}
        currentEpisode={currentEpisode}
        onSelectEpisode={handleSelectEpisode}
        seasons={seasons}
        dubbers={dubbers}
        selectedDubberId={selectedDubberId}
        onSelectDubber={handleSelectDubber}
        initialProgressSeconds={initialProgress}
      />

      {/* Title & Info Bar below player */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">{content.title}</h1>
          {content.originalTitle && (
            <p className="text-xs text-muted-foreground font-medium">{content.originalTitle}</p>
          )}
          {currentEpisode && (
            <p className="text-xs text-primary font-semibold mt-1">
              Серия {currentEpisode.episodeNumber}: {currentEpisode.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{content.releaseYear}</span>
          <span>•</span>
          <span>{content.ageRating}</span>
          <span>•</span>
          <span>
            Рейтинг: <b className="text-emerald-400">{content.ratingCache.toFixed(1)}</b>
          </span>
        </div>
      </div>
    </div>
  );
};

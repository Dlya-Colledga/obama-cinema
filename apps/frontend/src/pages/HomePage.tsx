import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, ChevronRight, Clock } from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, WatchProgress } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { ContentCard } from '../features/catalog/components/ContentCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { BookmarkButton } from '../features/bookmarks/BookmarkButton';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<ContentItem[]>([]);
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [featuredRes, unfinishedRes] = await Promise.all([
          api.get<ContentItem[]>('/catalog/featured'),
          user ? api.get<WatchProgress[]>('/watch/unfinished') : Promise.resolve({ data: [] }),
        ]);

        setFeatured(featuredRes.data);
        if (featuredRes.data.length > 0) {
          setHeroItem(featuredRes.data[0]);
        }
        if (unfinishedRes.data) {
          setContinueWatching(unfinishedRes.data);
        }
      } catch (e) {
        console.error('Home data load error', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <Skeleton className="w-full aspect-[21/9] rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const movies = featured.filter(i => i.contentType.code === 'movie');
  const series = featured.filter(i => i.contentType.code === 'series');
  const anime = featured.filter(i => i.contentType.code === 'anime');

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      {heroItem && (
        <section className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[650px] overflow-hidden select-none">
          {/* Backdrop Image */}
          <img
            src={heroItem.bannerUrl || heroItem.posterUrl}
            alt={heroItem.title}
            className="w-full h-full object-cover object-center"
          />

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/70 to-transparent w-full sm:w-2/3" />

          {/* Hero Content */}
          <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
            <div className="max-w-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="type">{heroItem.contentType.name}</Badge>
                <Badge variant="rating" ratingValue={heroItem.ratingCache} className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{heroItem.ratingCache.toFixed(1)}</span>
                </Badge>
                <Badge variant="age">{heroItem.ageRating}</Badge>
                <span className="text-xs text-gray-300 font-medium">{heroItem.releaseYear}</span>
                {heroItem.genres.length > 0 && (
                  <span className="text-xs text-gray-400">
                    • {heroItem.genres.slice(0, 3).map(g => g.name).join(', ')}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                {heroItem.title}
              </h1>

              <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 leading-relaxed drop-shadow">
                {heroItem.description}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <Link to={`/watch/${heroItem.slug}`}>
                  <Button size="lg" leftIcon={<Play className="w-5 h-5 fill-current" />}>
                    Смотреть онлайн
                  </Button>
                </Link>
                <BookmarkButton
                  contentId={heroItem.id}
                  initialBookmark={heroItem.userBookmark}
                />
                <Link to={`/content/${heroItem.slug}`}>
                  <Button variant="ghost" size="lg">
                    О фильме
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Continue Watching Row (if user has active progress) */}
        {continueWatching.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded-full bg-[#FF002F]" />
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#FF002F]" /> Продолжить просмотр
                </h2>
              </div>
              <Link to="/history" className="text-xs text-gray-400 hover:text-[#FF002F] flex items-center transition-colors">
                Вся история <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueWatching.map((item) => {
                const percent = item.durationSeconds > 0
                  ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
                  : 0;

                return (
                  <Link
                    key={item.contentId}
                    to={`/watch/${item.content?.slug}${item.episodeId ? `?episode=${item.episodeId}` : ''}`}
                    className="group relative flex gap-4 p-3 rounded-2xl bg-[#000000] border border-white/5 hover:border-[#FF002F]/40 hover:shadow-glow-red transition-all"
                  >
                    <div className="relative w-28 aspect-[16/10] rounded-xl overflow-hidden bg-black shrink-0">
                      <img
                        src={item.content?.bannerUrl || item.content?.posterUrl}
                        alt={item.content?.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                        <Play className="w-6 h-6 text-white fill-current group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                        <div className="h-full bg-[#FF002F]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-[11px] text-[#FF002F] font-semibold">
                        {item.content?.contentType.name}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-[#FF002F] transition-colors">
                        {item.content?.title}
                      </h4>
                      {item.episode && (
                        <p className="text-xs text-gray-400 truncate">
                          Серия {item.episode.episodeNumber}: {item.episode.title}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-500 mt-1">
                        Просмотрено {percent}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Popular Movies Carousel */}
        {movies.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded-full bg-[#FF002F]" />
                <h2 className="text-xl font-bold text-white">Популярные фильмы</h2>
              </div>
              <Link to="/catalog?type=movie" className="text-xs text-gray-400 hover:text-[#FF002F] flex items-center transition-colors">
                Смотреть все <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movies.slice(0, 6).map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Top TV Series */}
        {series.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded-full bg-[#FF002F]" />
                <h2 className="text-xl font-bold text-white">Популярные сериалы</h2>
              </div>
              <Link to="/catalog?type=series" className="text-xs text-gray-400 hover:text-[#FF002F] flex items-center transition-colors">
                Смотреть все <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {series.slice(0, 6).map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Anime Hits */}
        {anime.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded-full bg-[#FF002F]" />
                <h2 className="text-xl font-bold text-white">Горячее аниме</h2>
              </div>
              <Link to="/catalog?type=anime" className="text-xs text-gray-400 hover:text-[#FF002F] flex items-center transition-colors">
                Смотреть все <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {anime.slice(0, 6).map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Calendar, Clock, Globe, Film, Layers } from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, Season } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { RatingWidget } from '../features/ratings/RatingWidget';
import { BookmarkButton } from '../features/bookmarks/BookmarkButton';
import { CommentSection } from '../features/comments/CommentSection';

export const ContentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const res = await api.get<ContentItem>(`/content/${slug}`);
        setContent(res.data);

        // If series or anime, load seasons and episodes
        if (res.data.contentType.code === 'series' || res.data.contentType.code === 'anime') {
          const seasonsRes = await api.get<Season[]>(`/content/${res.data.id}/seasons`);
          setSeasons(seasonsRes.data);
          if (seasonsRes.data.length > 0) {
            setSelectedSeasonNumber(seasonsRes.data[0].seasonNumber);
          }
        }
      } catch (e) {
        console.error('Failed to load content details', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Skeleton className="w-full aspect-[21/9] rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="aspect-[2/3] rounded-2xl" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Контент не найден</h2>
        <p className="text-xs text-gray-400">Возможно, тайтл был удалён или ссылка некорректна.</p>
        <Link to="/catalog">
          <Button size="sm">Перейти в каталог</Button>
        </Link>
      </div>
    );
  }

  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNumber);

  return (
    <div className="pb-20">
      {/* Backdrop Header Section */}
      <section className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[500px] overflow-hidden select-none">
        <img
          src={content.bannerUrl || content.posterUrl}
          alt={content.title}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/70 to-transparent" />
      </section>

      {/* Main Content Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 sm:-mt-40 relative z-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* HD Poster */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="aspect-[2/3] w-full rounded-3xl overflow-hidden bg-[#000000] border border-white/10 shadow-2xl relative group">
              <img
                src={content.posterUrl}
                alt={content.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Badge variant="type">{content.contentType.name}</Badge>
                <Badge variant="age">{content.ageRating}</Badge>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              <Link to={`/watch/${content.slug}`} className="w-full">
                <Button size="lg" className="w-full" leftIcon={<Play className="w-5 h-5 fill-current" />}>
                  Смотреть онлайн
                </Button>
              </Link>
              <div className="flex gap-2">
                <div className="flex-grow">
                  <BookmarkButton
                    contentId={content.id}
                    initialBookmark={content.userBookmark}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Details & Metadata */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {content.title}
              </h1>
              {content.originalTitle && (
                <p className="text-sm sm:text-base text-gray-400 mt-1 font-medium">
                  {content.originalTitle}
                </p>
              )}
            </div>

            {/* Interactive Rating & Score */}
            <div className="p-4 rounded-2xl bg-[#000000] border border-white/5 flex flex-wrap items-center justify-between gap-4">
              <RatingWidget
                contentId={content.id}
                initialRating={content.userRating}
                ratingCache={content.ratingCache}
                votesCount={content.votesCount}
                onRatingChanged={(newScore, newVotes, userRate) => {
                  setContent({
                    ...content,
                    ratingCache: newScore,
                    votesCount: newVotes,
                    userRating: userRate,
                  });
                }}
              />
            </div>

            {/* Quick Meta Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/5 space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#FF002F]" /> Год премьеры
                </span>
                <p className="text-xs font-bold text-white">{content.releaseYear}</p>
              </div>

              {content.durationMinutes && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-white/5 space-y-1">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF002F]" /> Длительность
                  </span>
                  <p className="text-xs font-bold text-white">{content.durationMinutes} мин</p>
                </div>
              )}

              {content.countries.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#000000] border border-white/5 space-y-1">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-[#FF002F]" /> Страна
                  </span>
                  <p className="text-xs font-bold text-white truncate">
                    {content.countries.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#000000] border border-white/5 space-y-1">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-[#FF002F]" /> Категория
                </span>
                <p className="text-xs font-bold text-white">{content.contentType.name}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">О сюжете</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {content.description}
              </p>
            </div>

            {/* Genres Tag Cloud */}
            {content.genres.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Жанры</h4>
                <div className="flex flex-wrap gap-2">
                  {content.genres.map((g) => (
                    <Link
                      key={g.slug}
                      to={`/catalog?genre=${g.slug}`}
                      className="px-3 py-1 rounded-xl text-xs bg-[#1f080b] hover:bg-[#2c0b10] text-gray-300 hover:text-white border border-white/5 transition-colors"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Seasons & Episodes Section (for series and anime) */}
        {seasons.length > 0 && (
          <section className="space-y-4 bg-[#000000] rounded-3xl p-6 sm:p-8 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-[#FF002F]" />
              <h3 className="text-lg font-bold text-white">Сезоны и серии</h3>
            </div>

            {/* Season Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {seasons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedSeasonNumber === s.seasonNumber
                      ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                      : 'bg-[#000000] text-gray-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {s.title || `Сезон ${s.seasonNumber}`}
                </button>
              ))}
            </div>

            {/* Episodes List Grid */}
            {activeSeason && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                {activeSeason.episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    to={`/watch/${content.slug}?episode=${ep.id}`}
                    className="group p-3.5 rounded-2xl bg-[#000000] border border-white/5 hover:border-[#FF002F]/40 hover:shadow-glow-red flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#22090c] group-hover:bg-[#FF002F] text-white flex items-center justify-center shrink-0 transition-colors">
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-[#FF002F] font-semibold block">
                          Серия {ep.episodeNumber}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-[#FF002F] transition-colors">
                          {ep.title || `Эпизод ${ep.episodeNumber}`}
                        </h5>
                      </div>
                    </div>
                    {ep.durationMinutes && (
                      <span className="text-[11px] text-gray-500 shrink-0">
                        {ep.durationMinutes} мин
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Comments & Discussion */}
        <CommentSection contentId={content.id} />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Calendar, Clock, Globe, Film, Layers } from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, Season } from '../types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RatingWidget } from '../features/ratings/RatingWidget';
import { CommentSection } from '../features/comments/CommentSection';
import { NetflixTrailerHero } from '../features/player/NetflixTrailerHero';

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
        <Skeleton className="w-full aspect-[21/9] min-h-[480px] rounded-3xl" />
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
        <p className="text-xs text-muted-foreground">Возможно, тайтл был удалён или ссылка некорректна.</p>
        <Link to="/catalog">
          <Button size="sm">Перейти в каталог</Button>
        </Link>
      </div>
    );
  }

  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber);

  return (
    <div className="pb-20 space-y-10">
      {/* Netflix-style Title Card Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <NetflixTrailerHero content={content} />
      </div>

      {/* Main Content Details & Metadata Below Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Interactive Rating & Score */}
        <div className="p-4 rounded-2xl bg-card border border-white/5 flex flex-wrap items-center justify-between gap-4">
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
          <Card className="border-white/5 bg-card">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3.5 text-primary" /> Год премьеры
              </span>
              <p className="text-xs font-bold text-white">{content.releaseYear}</p>
            </CardContent>
          </Card>

          {content.durationMinutes && (
            <Card className="border-white/5 bg-card">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" /> Длительность
                </span>
                <p className="text-xs font-bold text-white">{content.durationMinutes} мин</p>
              </CardContent>
            </Card>
          )}

          {content.countries.length > 0 && (
            <Card className="border-white/5 bg-card">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Globe className="size-3.5 text-primary" /> Страна
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {content.countries.map((c) => c.name).join(', ')}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-white/5 bg-card">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Film className="size-3.5 text-primary" /> Категория
              </span>
              <p className="text-xs font-bold text-white">{content.contentType.name}</p>
            </CardContent>
          </Card>
        </div>

        {/* Description / Synopsis */}
        <div className="space-y-3 bg-card rounded-3xl p-6 sm:p-8 border border-white/5">
          <h3 className="text-base font-bold text-white">О сюжете</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {content.description}
          </p>
          {content.genres.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Жанры
              </h4>
              <div className="flex flex-wrap gap-2">
                {content.genres.map((g) => (
                  <Link
                    key={g.slug}
                    to={`/catalog?genre=${g.slug}`}
                    className="px-3 py-1 rounded-xl text-xs bg-secondary hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seasons & Episodes Section (for series and anime) */}
        {seasons.length > 0 && (
          <section className="space-y-4 bg-card rounded-3xl p-6 sm:p-8 border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-white">Сезоны и серии</h3>
            </div>

            {/* Season Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {seasons.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedSeasonNumber === s.seasonNumber ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                  className="rounded-xl whitespace-nowrap"
                >
                  {s.title || `Сезон ${s.seasonNumber}`}
                </Button>
              ))}
            </div>

            {/* Episodes List Grid */}
            {activeSeason && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                {activeSeason.episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    to={`/watch/${content.slug}?episode=${ep.id}`}
                    className="group p-3.5 rounded-2xl bg-background border border-white/5 hover:border-primary/40 hover:shadow-glow-red flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-secondary group-hover:bg-primary text-white flex items-center justify-center shrink-0 transition-colors">
                        <Play className="size-4 fill-current translate-x-0.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] text-primary font-semibold block">
                          Серия {ep.episodeNumber}
                        </span>
                        <h5 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                          {ep.title || `Эпизод ${ep.episodeNumber}`}
                        </h5>
                      </div>
                    </div>
                    {ep.durationMinutes && (
                      <span className="text-[11px] text-muted-foreground shrink-0">
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

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Calendar, Clock, Globe, Film, Layers, Volume2, VolumeX } from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, Season } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RatingWidget } from '../features/ratings/RatingWidget';
import { BookmarkButton } from '../features/bookmarks/BookmarkButton';
import { CommentSection } from '../features/comments/CommentSection';

export const ContentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Netflix-style trailer background video states
  const [isMuted, setIsMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!slug) return;
      setIsLoading(true);
      setVideoFailed(false);
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

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextMuted ? 'mute' : 'unMute',
          args: '',
        }),
        '*'
      );
    }
  };

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

  const hasTrailer = Boolean(content.trailerYoutubeId) && !videoFailed;
  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeasonNumber);

  return (
    <div className="pb-20 space-y-10">
      {/* Netflix-style Title Card Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black min-h-[480px] md:min-h-[560px] lg:min-h-[620px] flex items-end sm:items-center">
          {hasTrailer ? (
            <>
              {/* Background Video Trailer (YouTube embed with autoplay loop) */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${content.trailerYoutubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${content.trailerYoutubeId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1`}
                  title={content.title}
                  className="w-[170%] h-[170%] -left-[35%] -top-[35%] absolute object-cover border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onError={() => setVideoFailed(true)}
                />
                {/* Vignettes and cinematic gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 sm:via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
              </div>

              {/* Sound & Age Rating Controls */}
              <div className="absolute top-4 right-4 sm:top-auto sm:bottom-6 sm:right-6 z-20 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                  className="size-10 sm:size-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                >
                  {isMuted ? <VolumeX className="size-4 sm:size-5" /> : <Volume2 className="size-4 sm:size-5" />}
                </button>
                <div className="px-2.5 sm:px-3 py-1 rounded-md border-l-2 border-white/40 bg-black/70 backdrop-blur-md text-xs font-semibold text-white/90">
                  {content.ageRating}
                </div>
              </div>

              {/* Left-aligned Title, Poster & Actions */}
              <div className="relative z-10 w-full max-w-4xl p-6 sm:p-10 md:p-12 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8">
                {/* Cover / Poster Thumbnail */}
                <div className="w-32 sm:w-40 md:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-background border border-white/20 shadow-2xl shrink-0 group relative">
                  <img
                    src={content.posterUrl}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="type">{content.contentType.name}</Badge>
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="space-y-4 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge variant="age">{content.ageRating}</Badge>
                    <span className="text-xs font-bold text-gray-300 px-2 py-0.5 rounded-full bg-white/10 border border-white/5">
                      {content.releaseYear}
                    </span>
                    {content.durationMinutes && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="size-3 text-primary" /> {content.durationMinutes} мин
                      </span>
                    )}
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      ★ {content.ratingCache.toFixed(1)}
                    </span>
                  </div>

                  <div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                      {content.title}
                    </h1>
                    {content.originalTitle && (
                      <p className="text-sm sm:text-base text-gray-400 mt-1 font-medium truncate">
                        {content.originalTitle}
                      </p>
                    )}
                  </div>

                  {content.genres.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      {content.genres.slice(0, 4).map((g) => (
                        <span
                          key={g.slug}
                          className="text-xs text-gray-300 bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10 backdrop-blur-sm"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                    <Link to={`/watch/${content.slug}`}>
                      <Button size="lg" leftIcon={<Play className="size-5 fill-current" />}>
                        Смотреть онлайн
                      </Button>
                    </Link>
                    <BookmarkButton
                      contentId={content.id}
                      initialBookmark={content.userBookmark}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Fallback when no trailer: stretched blurred backdrop with centered title card */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <img
                  src={content.bannerUrl || content.posterUrl}
                  alt=""
                  className="w-full h-full object-cover scale-125 filter blur-3xl opacity-35"
                />
                <div className="absolute inset-0 bg-radial from-transparent via-black/75 to-black" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
              </div>

              {/* Title & info centered proudly in the middle ("нагло встает по середине") */}
              <div className="relative z-10 w-full max-w-2xl mx-auto p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5 my-auto">
                {/* Centered Poster card */}
                <div className="w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden bg-background border border-white/20 shadow-2xl shadow-primary/10 relative group">
                  <img
                    src={content.posterUrl}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="type">{content.contentType.name}</Badge>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="age">{content.ageRating}</Badge>
                  <span className="text-xs font-bold text-gray-300 px-2 py-0.5 rounded-full bg-white/10 border border-white/5">
                    {content.releaseYear}
                  </span>
                  {content.durationMinutes && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="size-3 text-primary" /> {content.durationMinutes} мин
                    </span>
                  )}
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    ★ {content.ratingCache.toFixed(1)}
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {content.title}
                  </h1>
                  {content.originalTitle && (
                    <p className="text-sm sm:text-base text-gray-400 font-medium">
                      {content.originalTitle}
                    </p>
                  )}
                </div>

                {/* Genres */}
                {content.genres.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {content.genres.map((g) => (
                      <span
                        key={g.slug}
                        className="text-xs text-gray-300 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link to={`/watch/${content.slug}`}>
                    <Button size="lg" leftIcon={<Play className="size-5 fill-current" />}>
                      Смотреть онлайн
                    </Button>
                  </Link>
                  <BookmarkButton
                    contentId={content.id}
                    initialBookmark={content.userBookmark}
                  />
                </div>
              </div>
            </>
          )}
        </div>
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

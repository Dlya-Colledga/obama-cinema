import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Volume2, VolumeX } from 'lucide-react';
import { ContentItem } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkButton } from '../bookmarks/BookmarkButton';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: {
          width?: string | number;
          height?: string | number;
          videoId?: string;
          playerVars?: {
            autoplay?: 0 | 1;
            mute?: 0 | 1;
            controls?: 0 | 1;
            showinfo?: 0 | 1;
            rel?: 0 | 1;
            loop?: 0 | 1;
            playlist?: string;
            disablekb?: 0 | 1;
            fs?: 0 | 1;
            playsinline?: 0 | 1;
            modestbranding?: 0 | 1;
            iv_load_policy?: 1 | 3;
            origin?: string;
            enablejsapi?: 0 | 1;
          };
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  destroy: () => void;
}

interface NetflixTrailerHeroProps {
  content: ContentItem;
}

export const NetflixTrailerHero: React.FC<NetflixTrailerHeroProps> = ({ content }) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check if desktop viewport (PC) - strictly disable background trailer on mobile devices
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const loopIntervalRef = useRef<number | null>(null);

  const trailerId = content.trailerYoutubeId;
  const youtubeUrl = trailerId
    ? `https://www.youtube.com/watch?v=${trailerId}`
    : content.trailerUrl || null;

  // Initialize YouTube Iframe API exclusively on desktop PCs
  useEffect(() => {
    if (!isDesktop || !trailerId) {
      setIsPlaying(false);
      return;
    }

    let isMounted = true;
    setIsPlaying(false);
    setHasError(false);

    if (revealTimeoutRef.current) {
      clearInterval(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }

    // Load YouTube API script if not already present (desktop only)
    if (!window.YT || !window.YT.Player) {
      const existingScript = document.getElementById('youtube-iframe-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    const setupPlayer = () => {
      if (!isMounted || !containerRef.current || !window.YT?.Player) return;

      try {
        // Create an inner host element to be replaced by YouTube player
        const hostElement = document.createElement('div');
        hostElement.className = 'w-full h-full';
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(hostElement);

        ytPlayerRef.current = new window.YT.Player(hostElement, {
          width: '100%',
          height: '100%',
          videoId: trailerId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            showinfo: 0,
            rel: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            modestbranding: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return;
              event.target.mute();
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              // 1 === PLAYING
              if (event.data === 1) {
                // Ensure video plays for at least 2.5s before revealing to the user
                // YouTube's center overlay (pause/10s buttons) takes ~2.0-2.2s to fully fade away
                if (revealTimeoutRef.current) {
                  clearInterval(revealTimeoutRef.current);
                }
                const startTime = Date.now();
                revealTimeoutRef.current = window.setInterval(() => {
                  if (!isMounted || !ytPlayerRef.current) return;
                  try {
                    const current = ytPlayerRef.current.getCurrentTime?.() ?? 0;
                    const elapsed = (Date.now() - startTime) / 1000;
                    if (current >= 2.5 || elapsed >= 4.0) {
                      setIsPlaying(true);
                      if (revealTimeoutRef.current) {
                        clearInterval(revealTimeoutRef.current);
                        revealTimeoutRef.current = null;
                      }
                    }
                  } catch {
                    // ignore
                  }
                }, 100);
              } else if (event.data === 2) {
                // 2 === PAUSED: immediately hide video so pause button is never visible
                if (revealTimeoutRef.current) {
                  clearInterval(revealTimeoutRef.current);
                  revealTimeoutRef.current = null;
                }
                setIsPlaying(false);
              } else if (event.data === 0) {
                // 0 === ENDED: seamlessly loop replay
                if (revealTimeoutRef.current) {
                  clearInterval(revealTimeoutRef.current);
                  revealTimeoutRef.current = null;
                }
                setIsPlaying(false);
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
            },
            onError: () => {
              if (isMounted) {
                setHasError(true);
              }
            },
          },
        });

        // Background seamless loop monitor (restarts video just before it ends to prevent YouTube related videos / end screen)
        if (loopIntervalRef.current) {
          clearInterval(loopIntervalRef.current);
        }
        loopIntervalRef.current = window.setInterval(() => {
          if (!isMounted || !ytPlayerRef.current) return;
          try {
            const player = ytPlayerRef.current;
            if (typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
              const current = player.getCurrentTime();
              const duration = player.getDuration();
              if (duration > 0 && current >= duration - 0.5) {
                player.seekTo(0, true);
              }
            }
          } catch {
            // ignore
          }
        }, 250);
      } catch (e) {
        console.warn('YouTube Player initialization failed', e);
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCb) prevCb();
        setupPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (revealTimeoutRef.current) {
        clearInterval(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
        loopIntervalRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, [trailerId, isDesktop]);

  // Programmatic mute/unmute: does NOT reload iframe and does NOT affect browser history!
  const toggleMute = () => {
    if (!ytPlayerRef.current) return;
    const nextMuted = !isMuted;
    if (nextMuted) {
      ytPlayerRef.current.mute();
    } else {
      ytPlayerRef.current.unMute();
      ytPlayerRef.current.setVolume(100);
    }
    setIsMuted(nextMuted);
  };

  const hasActiveTrailer = Boolean(trailerId) && !hasError;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black min-h-[480px] md:min-h-[560px] lg:min-h-[620px] flex items-end sm:items-center">
      {hasActiveTrailer ? (
        <>
          {/* Static backdrop poster behind video while buffering or on mobile */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <img
              src={content.bannerUrl || content.posterUrl}
              alt=""
              className="w-full h-full object-cover opacity-65 filter blur-sm scale-105 brightness-110"
            />
          </div>

          {/* YouTube Video Container - strictly desktop PC only */}
          {isDesktop && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <div
                className={`w-[180%] h-[180%] -left-[40%] -top-[40%] absolute transition-opacity duration-700 pointer-events-none filter brightness-115 contrast-[1.03] ${
                  isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div ref={containerRef} className="w-full h-full pointer-events-none" />
              </div>
            </div>
          )}

          {/* Cinematic gradient vignettes: strong on the left for text legibility, clear and bright on the right for video */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 via-35% sm:via-black/60 sm:via-45% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-15% to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent pointer-events-none" />

          {/* Controls: strictly desktop PC only */}
          {isDesktop && (
            <div className="absolute top-4 right-4 sm:top-auto sm:bottom-6 sm:right-6 z-20 flex items-center gap-2.5">
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Смотреть трейлер на YouTube"
                  aria-label="Смотреть трейлер на YouTube"
                  className="size-10 sm:size-11 rounded-full bg-black/75 hover:bg-[#FF0000] border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg group cursor-pointer"
                >
                  <svg
                    className="size-4 sm:size-5 fill-current group-hover:scale-110 transition-transform"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
                className="size-10 sm:size-11 rounded-full bg-black/75 hover:bg-black/95 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              >
                {isMuted ? <VolumeX className="size-4 sm:size-5" /> : <Volume2 className="size-4 sm:size-5" />}
              </button>

              <div className="px-2.5 sm:px-3 py-1 rounded-md border-l-2 border-white/40 bg-black/75 backdrop-blur-md text-xs font-semibold text-white/90">
                {content.ageRating}
              </div>
            </div>
          )}

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
          {/* Centered fallback when trailer is absent: stretched blurred cover */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <img
              src={content.bannerUrl || content.posterUrl}
              alt=""
              className="w-full h-full object-cover scale-125 filter blur-3xl opacity-35"
            />
            <div className="absolute inset-0 bg-radial from-transparent via-black/75 to-black" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
          </div>

          {/* Centered card content ("нагло встает по середине") */}
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
  );
};

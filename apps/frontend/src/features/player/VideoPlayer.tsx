import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Film,
  SkipForward,
  SkipBack,
  FastForward,
  List,
  Mic,
  Check,
  X,
  Search,
  Keyboard,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client';
import { StreamSource, Episode, Season, AnimeDubber } from '../../types';
import { useAuth } from '../auth/AuthContext';

export interface VideoPlayerProps {
  contentId: number;
  contentTitle?: string;
  sources: StreamSource[];
  selectedSource?: StreamSource | null;
  onSelectSource?: (source: StreamSource) => void;
  currentEpisode?: Episode | null;
  onSelectEpisode?: (episode: Episode) => void;
  allEpisodes?: Episode[];
  seasons?: Season[];
  dubbers?: AnimeDubber[];
  selectedDubberId?: number | null;
  onSelectDubber?: (dubberId: number) => void;
  initialProgressSeconds?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  contentId,
  contentTitle = '',
  sources,
  selectedSource: controlledSelectedSource,
  onSelectSource,
  currentEpisode = null,
  onSelectEpisode,
  allEpisodes: propAllEpisodes,
  seasons = [],
  dubbers = [],
  selectedDubberId = null,
  onSelectDubber,
  initialProgressSeconds = 0,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Source selection state (controlled or local)
  const [localSource, setLocalSource] = useState<StreamSource | null>(sources[0] || null);
  const activeSource = controlledSelectedSource !== undefined ? controlledSelectedSource : localSource;

  const handleSourceSelect = (src: StreamSource) => {
    if (onSelectSource) {
      onSelectSource(src);
    } else {
      setLocalSource(src);
    }
  };

  useEffect(() => {
    if (sources.length > 0 && !controlledSelectedSource && !localSource) {
      // Prioritize HLS / MP4 custom player stream first, then iframe
      const customSrc = sources.find((s) => s.playerType === 'hls' || s.playerType === 'mp4');
      setLocalSource(customSrc || sources[0]);
    }
  }, [sources, controlledSelectedSource, localSource]);

  // Flattened episodes list
  const episodesList = useMemo<Episode[]>(() => {
    if (propAllEpisodes && propAllEpisodes.length > 0) return propAllEpisodes;
    if (seasons.length > 0) {
      return seasons.flatMap((s) => s.episodes);
    }
    return currentEpisode ? [currentEpisode] : [];
  }, [propAllEpisodes, seasons, currentEpisode]);

  // Current episode index & navigation
  const currentEpIndex = useMemo(() => {
    if (!currentEpisode) return -1;
    return episodesList.findIndex((e) => e.id === currentEpisode.id);
  }, [episodesList, currentEpisode]);

  const prevEpisode = currentEpIndex > 0 ? episodesList[currentEpIndex - 1] : null;
  const nextEpisode =
    currentEpIndex >= 0 && currentEpIndex < episodesList.length - 1
      ? episodesList[currentEpIndex + 1]
      : null;

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('cinema_player_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasSeekedInitial, setHasSeekedInitial] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  // Quality levels from HLS
  const [hlsLevels, setHlsLevels] = useState<{ index: number; height: number; bitrate: number }[]>([]);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(-1); // -1 = Auto

  // Inside-player UI overlay drawers
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const [showDubbersDrawer, setShowDubbersDrawer] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [searchEpisodeQuery, setSearchEpisodeQuery] = useState('');
  const [searchDubberQuery, setSearchDubberQuery] = useState('');
  const [selectedSeasonTab, setSelectedSeasonTab] = useState<number>(1);

  // Auto next episode countdown state
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Controls auto-hide timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !showEpisodesDrawer && !showDubbersDrawer && !showSettingsMenu && !showHotkeysModal) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, showEpisodesDrawer, showDubbersDrawer, showSettingsMenu, showHotkeysModal]);

  // Video source loading & HLS setup
  useEffect(() => {
    if (!activeSource || activeSource.playerType === 'iframe') {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const streamUrl = activeSource.streamUrl;
    const isHls =
      activeSource.playerType === 'hls' ||
      streamUrl.includes('.m3u8') ||
      streamUrl.includes('manifest');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setHlsLevels([]);
    setCurrentLevelIndex(-1);
    setIsBuffering(true);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((lvl, index) => ({
          index,
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setHlsLevels(levels);
        setIsBuffering(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevelIndex(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      setIsBuffering(false);
    } else {
      video.src = streamUrl;
      setIsBuffering(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSource]);

  // Synchronize volume and mute to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync progress every 10 seconds while playing
  const syncProgress = useCallback(
    async (timeSec: number, durSec: number) => {
      if (!user || durSec <= 0 || timeSec <= 5) return;
      try {
        await api.post('/watch/progress', {
          content_id: contentId,
          episode_id: currentEpisode?.id || null,
          progress_seconds: Math.floor(timeSec),
          duration_seconds: Math.floor(durSec),
        });
      } catch {
        // Ignore background sync errors
      }
    },
    [contentId, currentEpisode, user]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && isPlaying) {
        syncProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, syncProgress]);

  // Handle Initial seek when metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (
        !hasSeekedInitial &&
        initialProgressSeconds > 5 &&
        initialProgressSeconds < videoRef.current.duration - 10
      ) {
        videoRef.current.currentTime = initialProgressSeconds;
        setHasSeekedInitial(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Update buffer
      const buf = videoRef.current.buffered;
      if (buf.length > 0) {
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= cur && cur <= buf.end(i)) {
            setBufferedTime(buf.end(i));
            break;
          }
        }
      }
    }
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const seekRelative = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const nextTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    v.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    localStorage.setItem('cinema_player_volume', String(val));
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSpeedSelect = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettingsMenu(false);
  };

  const handleQualitySelect = (levelIdx: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
      setCurrentLevelIndex(levelIdx);
    }
    setShowSettingsMenu(false);
  };

  // Skip opening calculation
  const skipSegment = useMemo(() => {
    if (!activeSource?.skipSegments || activeSource.skipSegments.length === 0) {
      return null;
    }
    for (const [start, end] of activeSource.skipSegments) {
      if (currentTime >= start && currentTime < end) {
        return { start, end };
      }
    }
    return null;
  }, [activeSource, currentTime]);

  const handleSkipOpening = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (skipSegment) {
      v.currentTime = skipSegment.end;
      setCurrentTime(skipSegment.end);
    } else {
      // Default anime opening skip: +85 seconds
      seekRelative(85);
    }
  }, [skipSegment, seekRelative]);

  // Video ended -> auto-next episode
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (nextEpisode && onSelectEpisode) {
      setNextCountdown(5);
    }
  };

  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      if (nextEpisode && onSelectEpisode) {
        onSelectEpisode(nextEpisode);
      }
      setNextCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextCountdown, nextEpisode, onSelectEpisode]);

  // Global player keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger hotkeys if user is typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          seekRelative(-10);
          resetControlsTimeout();
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          seekRelative(10);
          resetControlsTimeout();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, prev + 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = false;
            }
            setIsMuted(false);
            localStorage.setItem('cinema_player_volume', String(next));
            return next;
          });
          resetControlsTimeout();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, prev - 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = next === 0;
            }
            setIsMuted(next === 0);
            localStorage.setItem('cinema_player_volume', String(next));
            return next;
          });
          resetControlsTimeout();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyN':
          if (nextEpisode && onSelectEpisode) {
            e.preventDefault();
            onSelectEpisode(nextEpisode);
          }
          break;
        case 'KeyP':
          if (prevEpisode && onSelectEpisode) {
            e.preventDefault();
            onSelectEpisode(prevEpisode);
          }
          break;
        case 'KeyS':
          e.preventDefault();
          handleSkipOpening();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    nextEpisode,
    prevEpisode,
    onSelectEpisode,
    handleSkipOpening,
    resetControlsTimeout,
  ]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered episodes for inside-player episode drawer
  const activeSeason = seasons.find((s) => s.seasonNumber === selectedSeasonTab) || seasons[0];
  const episodesToDisplay = useMemo(() => {
    const base = activeSeason ? activeSeason.episodes : episodesList;
    if (!searchEpisodeQuery.trim()) return base;
    const q = searchEpisodeQuery.toLowerCase().trim();
    return base.filter(
      (ep) =>
        String(ep.episodeNumber).includes(q) ||
        (ep.title && ep.title.toLowerCase().includes(q))
    );
  }, [activeSeason, episodesList, searchEpisodeQuery]);

  // Filtered dubbers for inside-player dubber drawer
  const dubbersToDisplay = useMemo(() => {
    if (!searchDubberQuery.trim()) return dubbers;
    const q = searchDubberQuery.toLowerCase().trim();
    return dubbers.filter((d) => d.name.toLowerCase().includes(q));
  }, [dubbers, searchDubberQuery]);

  const currentDubber = dubbers.find((d) => d.id === selectedDubberId);

  // Alternative player sources
  const iframeSources = sources.filter((s) => s.playerType === 'iframe');
  const customSources = sources.filter((s) => s.playerType === 'hls' || s.playerType === 'mp4');

  if (!activeSource) {
    return (
      <div className="w-full aspect-video rounded-3xl bg-[#000000] border border-[#FF002F]/20 flex flex-col items-center justify-center p-8 text-center text-gray-400">
        <Film className="w-12 h-12 text-[#FF002F] mb-3 opacity-60 animate-pulse" />
        <h4 className="text-base font-bold text-white mb-1">
          Источник видео готовится к трансляции
        </h4>
        <p className="text-xs max-w-sm">
          Мы подключаем качественные видеопотоки. Пожалуйста, обновите страницу через несколько
          секунд.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      {/* Alternative Player Switcher Tabs (Kodik / Obama Cinema) */}
      {sources.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 shrink-0 font-medium mr-1">
            <Film className="w-3.5 h-3.5 text-[#FF002F]" /> Плеер:
          </span>

          {/* Custom Player Button */}
          {customSources.length > 0 && (
            <button
              onClick={() => handleSourceSelect(customSources[0])}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                activeSource.playerType !== 'iframe'
                  ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                  : 'bg-[#000000] text-gray-300 border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Плеер Obama Cinema (Кастомный)</span>
              <span className="text-[10px] opacity-75">
                ({customSources[0].quality || 'HLS'})
              </span>
            </button>
          )}

          {/* Alternative Iframe Player Buttons (e.g. Kodik) */}
          {iframeSources.map((src) => {
            const isSelected = activeSource.id === src.id;
            return (
              <button
                key={src.id}
                onClick={() => handleSourceSelect(src)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                    : 'bg-[#000000] text-gray-300 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3 h-3 text-white/80" />
                <span>{src.translationTitle || src.provider}</span>
                <span className="text-[10px] opacity-75">({src.quality})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Video Cinema Container */}
      <div
        id="player-container"
        ref={containerRef}
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
        className={`relative group w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl select-none ${
          !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
        }`}
      >
        {activeSource.playerType === 'iframe' ? (
          /* Alternative Embedded Iframe Player (e.g. Kodik) */
          <iframe
            src={activeSource.streamUrl}
            title="Alternative Video Player"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          /* Custom Video Player with Integrated Controls, Episodes & Dubbers */
          <>
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={handleVideoEnded}
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
            />

            {/* Buffering Spinner */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-xs">
                <div className="w-14 h-14 border-4 border-white/20 border-t-[#FF002F] rounded-full animate-spin shadow-glow-red" />
              </div>
            )}

            {/* Floating Skip Opening Button */}
            {(skipSegment || (currentTime < 180 && duration > 300)) && isPlaying && (
              <div className="absolute bottom-20 right-6 z-30 transition-all animate-in fade-in zoom-in duration-300">
                <button
                  onClick={handleSkipOpening}
                  className="px-4 py-2 rounded-2xl bg-black/85 hover:bg-[#FF002F] text-white border border-[#FF002F]/40 hover:border-[#FF002F] shadow-glow-red backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <FastForward className="w-4 h-4 fill-current" />
                  <span>
                    {skipSegment
                      ? `Пропустить опенинг (${formatTime(skipSegment.end)})`
                      : 'Пропустить опенинг (+85с)'}
                  </span>
                </button>
              </div>
            )}

            {/* Next Episode Countdown Overlay */}
            {nextCountdown !== null && nextEpisode && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="max-w-md w-full p-6 rounded-3xl bg-[#000000] border border-[#FF002F]/40 shadow-2xl space-y-4">
                  <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
                    Следующая серия
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Серия {nextEpisode.episodeNumber}: {nextEpisode.title || 'Следующая серия'}
                  </h3>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#FF002F] h-full transition-all duration-1000 ease-linear shadow-glow-red"
                      style={{ width: `${(nextCountdown / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (onSelectEpisode) onSelectEpisode(nextEpisode);
                        setNextCountdown(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#FF002F] hover:bg-[#FF002F]/90 text-white font-bold text-xs shadow-glow-red transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Смотреть сейчас ({nextCountdown}с)
                    </button>
                    <button
                      onClick={() => setNextCountdown(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-semibold text-xs transition-all"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ambient Vignette & Overlay Controls */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/60 transition-opacity duration-300 flex flex-col justify-between p-4 sm:p-6 pointer-events-none ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Header Title & Current Metadata Overlay */}
              <div className="flex items-center justify-between text-xs text-gray-300 pointer-events-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                    {contentTitle || 'Воспроизведение'}
                  </span>
                  {currentEpisode && (
                    <span className="font-semibold text-primary bg-[#FF002F]/15 px-3 py-1.5 rounded-xl backdrop-blur-md border border-[#FF002F]/30 shadow-glow-red">
                      Серия {currentEpisode.episodeNumber}
                      {currentEpisode.title ? `: ${currentEpisode.title}` : ''}
                    </span>
                  )}
                  {currentDubber && (
                    <span className="hidden sm:inline-flex items-center gap-1 font-medium text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                      <Mic className="w-3 h-3 text-[#FF002F]" />
                      {currentDubber.name}
                    </span>
                  )}
                </div>

                {/* Hotkeys Quick Helper Icon */}
                <button
                  onClick={() => setShowHotkeysModal(true)}
                  title="Горячие клавиши"
                  className="p-2 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white backdrop-blur-md transition-all cursor-pointer"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>

              {/* Center Giant Play / Pause Button */}
              <div className="flex items-center justify-center pointer-events-auto">
                {!isPlaying && !isBuffering && (
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF002F] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" />
                  </button>
                )}
              </div>

              {/* Bottom Control Bar */}
              <div className="space-y-3 pointer-events-auto">
                {/* Timeline / Progress Scrub Bar */}
                <div className="relative flex items-center group/timeline">
                  {/* Buffer bar */}
                  <div
                    className="absolute left-0 top-0 h-1.5 bg-white/25 rounded-lg pointer-events-none transition-all"
                    style={{
                      width: `${duration > 0 ? (bufferedTime / duration) * 100 : 0}%`,
                    }}
                  />
                  {/* Interactive range input */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#FF002F] hover:h-2.5 transition-all relative z-10"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left Controls: Play, Prev/Next, Seek, Volume, Time */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-2 text-white hover:text-[#FF002F] transition-colors cursor-pointer"
                      title={isPlaying ? 'Пауза (Space)' : 'Воспроизведение (Space)'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current" />
                      )}
                    </button>

                    {/* Prev Episode */}
                    {prevEpisode && onSelectEpisode && (
                      <button
                        onClick={() => onSelectEpisode(prevEpisode)}
                        className="p-2 text-gray-300 hover:text-white transition-colors cursor-pointer"
                        title={`Предыдущая серия (${prevEpisode.episodeNumber})`}
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    )}

                    {/* Next Episode */}
                    {nextEpisode && onSelectEpisode && (
                      <button
                        onClick={() => onSelectEpisode(nextEpisode)}
                        className="p-2 text-gray-300 hover:text-[#FF002F] transition-colors cursor-pointer"
                        title={`Следующая серия (${nextEpisode.episodeNumber})`}
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}

                    {/* Seek -10s / +10s */}
                    <button
                      onClick={() => seekRelative(-10)}
                      className="p-2 text-gray-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
                      title="-10 сек (←)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => seekRelative(10)}
                      className="p-2 text-gray-300 hover:text-white transition-colors cursor-pointer hidden sm:block"
                      title="+10 сек (→)"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Volume with Smooth Hover Slider */}
                    <div className="flex items-center gap-1.5 group/vol">
                      <button
                        onClick={toggleMute}
                        className="p-2 text-white hover:text-[#FF002F] transition-colors cursor-pointer"
                        title={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-14 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF002F] hover:h-1.5 transition-all"
                      />
                    </div>

                    {/* Time Counter */}
                    <span className="text-xs font-semibold text-gray-300 ml-1">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right Controls: Inside Dubbers, Inside Episodes, Settings, Fullscreen */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* 🎙️ INSIDE DUBBERS SELECTOR BUTTON */}
                    {dubbers.length > 0 && (
                      <button
                        onClick={() => {
                          setShowDubbersDrawer((prev) => !prev);
                          setShowEpisodesDrawer(false);
                          setShowSettingsMenu(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          showDubbersDrawer
                            ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                            : 'bg-black/60 hover:bg-white/10 border-white/10 text-gray-200 hover:text-white backdrop-blur-md'
                        }`}
                        title="Выбрать озвучку"
                      >
                        <Mic className="w-3.5 h-3.5 text-[#FF002F]" />
                        <span className="hidden sm:inline">
                          {currentDubber ? currentDubber.name : 'Озвучка'}
                        </span>
                        <span className="sm:hidden">Озвучка</span>
                      </button>
                    )}

                    {/* 📑 INSIDE EPISODES SELECTOR BUTTON */}
                    {episodesList.length > 1 && (
                      <button
                        onClick={() => {
                          setShowEpisodesDrawer((prev) => !prev);
                          setShowDubbersDrawer(false);
                          setShowSettingsMenu(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          showEpisodesDrawer
                            ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                            : 'bg-black/60 hover:bg-white/10 border-white/10 text-gray-200 hover:text-white backdrop-blur-md'
                        }`}
                        title="Выбрать серию"
                      >
                        <List className="w-3.5 h-3.5 text-[#FF002F]" />
                        <span>Серии ({episodesList.length})</span>
                      </button>
                    )}

                    {/* ⚙️ SETTINGS MENU BUTTON (Speed & Quality) */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSettingsMenu((prev) => !prev);
                          setShowEpisodesDrawer(false);
                          setShowDubbersDrawer(false);
                        }}
                        className={`p-2 rounded-xl text-gray-300 hover:text-white border transition-all cursor-pointer ${
                          showSettingsMenu
                            ? 'bg-[#FF002F] text-white border-[#FF002F]'
                            : 'bg-black/60 hover:bg-white/10 border-white/10 backdrop-blur-md'
                        }`}
                        title="Настройки качества и скорости"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      {/* Settings Dropdown Popover */}
                      {showSettingsMenu && (
                        <div className="absolute right-0 bottom-full mb-3 w-56 rounded-2xl bg-[#000000] border border-white/15 p-3 shadow-2xl backdrop-blur-xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95">
                          {/* Playback Speed */}
                          <div>
                            <span className="text-[11px] font-bold text-gray-400 block mb-1.5">
                              Скорость воспроизведения:
                            </span>
                            <div className="grid grid-cols-4 gap-1">
                              {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => handleSpeedSelect(rate)}
                                  className={`py-1 rounded-lg text-center font-bold transition-all ${
                                    playbackRate === rate
                                      ? 'bg-[#FF002F] text-white shadow-glow-red'
                                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                  }`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quality Selection (HLS) */}
                          {hlsLevels.length > 0 && (
                            <div className="border-t border-white/10 pt-2.5">
                              <span className="text-[11px] font-bold text-gray-400 block mb-1.5">
                                Качество видео:
                              </span>
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleQualitySelect(-1)}
                                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left font-semibold ${
                                    currentLevelIndex === -1
                                      ? 'bg-[#FF002F] text-white'
                                      : 'hover:bg-white/10 text-gray-300'
                                  }`}
                                >
                                  <span>Авто (Адаптивное)</span>
                                  {currentLevelIndex === -1 && <Check className="w-3.5 h-3.5" />}
                                </button>
                                {hlsLevels.map((lvl) => (
                                  <button
                                    key={lvl.index}
                                    onClick={() => handleQualitySelect(lvl.index)}
                                    className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left font-semibold ${
                                      currentLevelIndex === lvl.index
                                        ? 'bg-[#FF002F] text-white'
                                        : 'hover:bg-white/10 text-gray-300'
                                    }`}
                                  >
                                    <span>{lvl.height}p</span>
                                    {currentLevelIndex === lvl.index && (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 text-white hover:text-[#FF002F] transition-colors cursor-pointer"
                      title={isFullscreen ? 'Выйти из полноэкранного режима (F)' : 'На весь экран (F)'}
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5" />
                      ) : (
                        <Maximize className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* INSIDE-PLAYER EPISODES SLIDE-OVER DRAWER */}
            {showEpisodesDrawer && (
              <div className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-[#000000]/95 border-l border-white/15 backdrop-blur-xl z-50 flex flex-col p-4 sm:p-5 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-[#FF002F]" />
                    <h4 className="text-sm font-black text-white">Список серий</h4>
                    <span className="text-xs text-gray-400 font-bold">
                      ({episodesList.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowEpisodesDrawer(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Season tabs if more than 1 season */}
                {seasons.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                    {seasons.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSeasonTab(s.seasonNumber)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                          selectedSeasonTab === s.seasonNumber
                            ? 'bg-[#FF002F] text-white shadow-glow-red'
                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        {s.title || `Сезон ${s.seasonNumber}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск по номеру или названию..."
                    value={searchEpisodeQuery}
                    onChange={(e) => setSearchEpisodeQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF002F]"
                  />
                </div>

                {/* Episodes Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {episodesToDisplay.map((ep) => {
                    const isCurrent = currentEpisode?.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => {
                          if (onSelectEpisode) {
                            onSelectEpisode(ep);
                          }
                          setShowEpisodesDrawer(false);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all border ${
                          isCurrent
                            ? 'bg-[#FF002F]/20 border-[#FF002F] shadow-glow-red text-white'
                            : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? 'bg-[#FF002F] text-white shadow-glow-red'
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current translate-x-0.5" />
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-bold block ${
                                isCurrent ? 'text-[#FF002F]' : 'text-gray-200'
                              }`}
                            >
                              Серия {ep.episodeNumber}
                            </span>
                            {ep.title && (
                              <p className="text-[11px] text-gray-400 truncate">{ep.title}</p>
                            )}
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#FF002F] shrink-0 bg-[#FF002F]/20 px-2 py-0.5 rounded-md">
                            Играет
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {episodesToDisplay.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">Серии не найдены</div>
                  )}
                </div>
              </div>
            )}

            {/* INSIDE-PLAYER DUBBERS SLIDE-OVER DRAWER */}
            {showDubbersDrawer && (
              <div className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-[#000000]/95 border-l border-white/15 backdrop-blur-xl z-50 flex flex-col p-4 sm:p-5 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#FF002F]" />
                    <h4 className="text-sm font-black text-white">Озвучка и перевод</h4>
                    <span className="text-xs text-gray-400 font-bold">({dubbers.length})</span>
                  </div>
                  <button
                    onClick={() => setShowDubbersDrawer(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search input */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск студии или даббера..."
                    value={searchDubberQuery}
                    onChange={(e) => setSearchDubberQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF002F]"
                  />
                </div>

                {/* Dubbers Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {dubbersToDisplay.map((d) => {
                    const isSelected = selectedDubberId === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          if (onSelectDubber) {
                            onSelectDubber(d.id);
                          }
                          setShowDubbersDrawer(false);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all border ${
                          isSelected
                            ? 'bg-[#FF002F]/20 border-[#FF002F] shadow-glow-red text-white'
                            : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#FF002F] text-white shadow-glow-red'
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-bold block truncate ${
                                isSelected ? 'text-white' : 'text-gray-200'
                              }`}
                            >
                              {d.name}
                            </span>
                            {d.isSub && (
                              <span className="text-[10px] text-blue-400 font-semibold">
                                Субтитры
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {d.episodesCount > 0 && (
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md font-semibold">
                              {d.episodesCount} сер.
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-[#FF002F]" />}
                        </div>
                      </button>
                    );
                  })}

                  {dubbersToDisplay.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">
                      Студии озвучки не найдены
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HOTKEYS REFERENCE MODAL */}
            {showHotkeysModal && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="max-w-md w-full p-6 rounded-3xl bg-[#000000] border border-white/20 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-5 h-5 text-[#FF002F]" />
                      <h3 className="text-base font-black text-white">Горячие клавиши</h3>
                    </div>
                    <button
                      onClick={() => setShowHotkeysModal(false)}
                      className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Пауза / Плей</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        Space / K
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Полный экран</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        F
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Перемотка -10с</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        ← / J
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Перемотка +10с</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        → / L
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Громкость ↑ / ↓</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        ↑ / ↓
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Без звука</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        M
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">След. серия</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        N
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between">
                      <span className="text-gray-400">Пред. серия</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        P
                      </kbd>
                    </div>
                    <div className="p-2 rounded-xl bg-white/5 flex items-center justify-between col-span-2">
                      <span className="text-gray-400">Пропустить опенинг (+85с)</span>
                      <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold">
                        S
                      </kbd>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHotkeysModal(false)}
                    className="w-full py-2 rounded-xl bg-[#FF002F] text-white font-bold text-xs shadow-glow-red hover:bg-[#FF002F]/90 transition-all"
                  >
                    Понятно
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Settings, Film } from 'lucide-react';
import { api } from '../../api/client';
import { StreamSource, Episode } from '../../types';
import { useAuth } from '../auth/AuthContext';

interface VideoPlayerProps {
  contentId: number;
  sources: StreamSource[];
  currentEpisode?: Episode | null;
  initialProgressSeconds?: number;
  onEpisodeSelect?: (episode: Episode) => void;
  availableEpisodes?: Episode[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  contentId,
  sources,
  currentEpisode = null,
  initialProgressSeconds = 0,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedSource, setSelectedSource] = useState<StreamSource | null>(sources[0] || null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasSeekedInitial, setHasSeekedInitial] = useState(false);

  useEffect(() => {
    if (sources.length > 0) {
      setSelectedSource(sources[0]);
    }
  }, [sources]);

  useEffect(() => {
    if (!selectedSource || selectedSource.playerType === 'iframe') {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const streamUrl = selectedSource.streamUrl;
    const isHls = selectedSource.playerType === 'hls' || streamUrl.includes('.m3u8') || streamUrl.includes('manifest');

    let hlsInstance: Hls | null = null;

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsInstance = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      video.src = streamUrl;
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [selectedSource]);

  // Sync progress every 10 seconds while playing
  const syncProgress = useCallback(async (timeSec: number, durSec: number) => {
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
  }, [contentId, currentEpisode, user]);

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
      if (!hasSeekedInitial && initialProgressSeconds > 5 && initialProgressSeconds < videoRef.current.duration - 10) {
        videoRef.current.currentTime = initialProgressSeconds;
        setHasSeekedInitial(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const toggleFullscreen = () => {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!selectedSource) {
    return (
      <div className="w-full aspect-video rounded-3xl bg-[#000000] border border-[#FF002F]/20 flex flex-col items-center justify-center p-8 text-center text-gray-400">
        <Film className="w-12 h-12 text-[#FF002F] mb-3 opacity-60" />
        <h4 className="text-base font-bold text-white mb-1">Источник видео готовится к трансляции</h4>
        <p className="text-xs max-w-sm">Мы подключаем качественные видеопотоки. Пожалуйста, обновите страницу через несколько секунд.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stream / Voiceover selector pills */}
      {sources.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0 font-medium">
            <Settings className="w-3.5 h-3.5" /> Озвучка:
          </span>
          {sources.map((src) => {
            const isSelected = selectedSource.id === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                    : 'bg-[#000000] text-gray-300 border-white/10 hover:border-white/20'
                }`}
              >
                {src.translationTitle} ({src.quality})
              </button>
            );
          })}
        </div>
      )}

      {/* Main Video Screen Container */}
      <div
        id="player-container"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        className="relative group w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl select-none"
      >
        {selectedSource.playerType === 'iframe' ? (
          <iframe
            src={selectedSource.streamUrl}
            title="Video Player"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <video
              ref={videoRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Ambient vignette and overlay controls */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 transition-opacity duration-300 flex flex-col justify-between p-4 sm:p-6 pointer-events-none ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Header Title in Player */}
              <div className="flex items-center justify-between text-xs text-gray-300 pointer-events-auto">
                {currentEpisode && (
                  <span className="font-semibold text-white bg-black/60 px-3 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    Серия {currentEpisode.episodeNumber}: {currentEpisode.title}
                  </span>
                )}
              </div>

              {/* Center Giant Play Button (when paused) */}
              <div className="flex items-center justify-center pointer-events-auto">
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FF002F] text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-95 transition-all"
                  >
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" />
                  </button>
                )}
              </div>

              {/* Bottom Control Bar */}
              <div className="space-y-2 pointer-events-auto">
                {/* Seek Timeline */}
                <div className="relative flex items-center group/timeline">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF002F] hover:h-2 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-1.5 text-white hover:text-[#FF002F] transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime -= 10;
                      }}
                      className="p-1.5 text-gray-300 hover:text-white transition-colors"
                      title="-10 сек"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-1.5 text-white hover:text-[#FF002F] transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <span className="text-xs font-medium text-gray-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 text-white hover:text-[#FF002F] transition-colors"
                      title="На весь экран"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

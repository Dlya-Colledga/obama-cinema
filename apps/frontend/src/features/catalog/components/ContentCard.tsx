import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Bookmark } from 'lucide-react';
import { ContentItem } from '../../../types';
import { Badge } from '../../../components/ui/Badge';

interface ContentCardProps {
  item: ContentItem;
  showProgress?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item, showProgress = true }) => {
  const progressPercent = item.userProgress && item.userProgress.durationSeconds > 0
    ? Math.min(100, Math.round((item.userProgress.progressSeconds / item.userProgress.durationSeconds) * 100))
    : 0;

  return (
    <Link
      to={`/content/${item.slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#000000] border border-white/5 hover:border-[#FF002F]/40 transition-all duration-300 hover:shadow-glow-red hover:-translate-y-1.5 select-none"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#150406]">
        <img
          src={item.posterUrl}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-black/30 opacity-70 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <Badge variant="rating" ratingValue={item.ratingCache} className="flex items-center gap-1 shadow-md">
            <Star className="w-3 h-3 fill-current" />
            <span>{item.ratingCache.toFixed(1)}</span>
          </Badge>

          <div className="flex items-center gap-1.5">
            {item.userBookmark && (
              <span className="p-1 rounded-md bg-[#FF002F] text-white shadow-md">
                <Bookmark className="w-3 h-3 fill-current" />
              </span>
            )}
            <Badge variant="age">{item.ageRating}</Badge>
          </div>
        </div>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#FF002F] text-white flex items-center justify-center shadow-glow-red transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Progress Bar (if available) */}
        {showProgress && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
            <div
              className="h-full bg-[#FF002F]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span className="text-[#FF002F] font-semibold">{item.contentType.name}</span>
            <span>•</span>
            <span>{item.releaseYear}</span>
            {item.durationMinutes && (
              <>
                <span>•</span>
                <span>{item.durationMinutes} мин</span>
              </>
            )}
          </div>
          <h4 className="font-semibold text-sm text-white line-clamp-1 group-hover:text-[#FF002F] transition-colors">
            {item.title}
          </h4>
        </div>

        {item.genres && item.genres.length > 0 && (
          <div className="text-[11px] text-gray-400 line-clamp-1 mt-1.5">
            {item.genres.map(g => g.name).join(', ')}
          </div>
        )}
      </div>
    </Link>
  );
};

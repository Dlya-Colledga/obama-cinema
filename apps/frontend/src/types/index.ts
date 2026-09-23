export type ContentTypeCode = 'movie' | 'series' | 'anime' | 'cartoon' | 'donghua' | 'dorama';

export type BookmarkCategory = 'watching' | 'plan_to_watch' | 'completed' | 'dropped' | 'favorite';

export const BOOKMARK_LABELS: Record<BookmarkCategory, string> = {
  watching: 'Смотрю',
  plan_to_watch: 'Буду смотреть',
  completed: 'Просмотрено',
  dropped: 'Брошено',
  favorite: 'В избранном',
};

export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserProfile {
  avatarUrl: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  profile?: UserProfile;
}

export interface ContentType {
  id: number;
  code: ContentTypeCode;
  name: string;
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
}

export interface Country {
  id: number;
  code: string;
  name: string;
}

export interface ContentItem {
  id: number;
  contentType: ContentType;
  title: string;
  originalTitle: string | null;
  slug: string;
  description: string;
  posterUrl: string;
  bannerUrl: string | null;
  releaseYear: number;
  ageRating: string;
  durationMinutes: number | null;
  ratingCache: number;
  votesCount: number;
  isFeatured: boolean;
  genres: Genre[];
  countries: Country[];
  userRating?: number | null;
  userBookmark?: BookmarkCategory | null;
  userProgress?: WatchProgress | null;
  trailerUrl?: string | null;
  trailerYoutubeId?: string | null;
}

export interface Episode {
  id: number;
  seasonId: number;
  contentId: number;
  episodeNumber: number;
  title: string | null;
  durationMinutes: number | null;
}

export interface Season {
  id: number;
  contentId: number;
  seasonNumber: number;
  title: string | null;
  releaseYear: number | null;
  episodes: Episode[];
}

export interface StreamSource {
  id: number;
  provider: string;
  providerCode: string;
  playerType: 'iframe' | 'hls' | 'mp4';
  streamUrl: string;
  quality: string;
  translationTitle: string;
}

export interface Comment {
  id: number;
  contentId: number;
  parentId: number | null;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    role: UserRole;
    avatarUrl: string | null;
  };
}

export interface BookmarkItem {
  id: number;
  category: BookmarkCategory;
  createdAt: string;
  content: ContentItem;
}

export interface WatchProgress {
  contentId: number;
  episodeId: number | null;
  progressSeconds: number;
  durationSeconds: number;
  isCompleted: boolean;
  lastWatchedAt: string;
  episode?: {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string | null;
  } | null;
  content?: {
    id: number;
    title: string;
    originalTitle: string | null;
    slug: string;
    posterUrl: string;
    bannerUrl: string | null;
    releaseYear: number;
    ratingCache: number;
    contentType: {
      code: string;
      name: string;
    };
  };
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface AnimeRelease {
  id: number;
  title: string;
  titleRu: string;
  titleOriginal: string;
  slug: string;
  type: string;
  description: string;
  posterUrl: string | null;
  screenshots?: string[];
  year: number | null;
  country: string;
  genres: string[];
  rating: number;
  grade5: number;
  votesCount: number;
  episodesTotal: number;
  episodesReleased: number;
  duration: number;
  season: number;
  studio: string;
  director: string;
  author: string;
  status: string;
  isAnimeApi: boolean;
}

export interface AnimeDubber {
  id: number;
  name: string;
  icon: string | null;
  workers: string | null;
  isSub: boolean;
  episodesCount: number;
  viewCount: number;
}

export interface AnimeSource {
  id: number;
  name: string;
  episodesCount: number;
  quality: number;
}

export interface AnimeEpisode {
  position: number;
  name: string;
  url: string;
  iframe: boolean;
  isFiller: boolean;
}

export interface AnimeEpisodesResponse {
  selectedDubber: AnimeDubber | null;
  selectedSource: AnimeSource | null;
  dubbers: AnimeDubber[];
  sources: AnimeSource[];
  episodes: AnimeEpisode[];
}

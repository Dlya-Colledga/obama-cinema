import { ContentTypeCode, BookmarkCategory, UserRole } from '../shared/constants';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  avatarUrl: string | null;
  bio: string | null;
  preferences: Record<string, any>;
  updatedAt: string;
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

export interface ContentType {
  id: number;
  code: ContentTypeCode;
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
}

export interface Season {
  id: number;
  contentId: number;
  seasonNumber: number;
  title: string | null;
  releaseYear: number | null;
  episodes: Episode[];
}

export interface Episode {
  id: number;
  seasonId: number;
  contentId: number;
  episodeNumber: number;
  title: string | null;
  durationMinutes: number | null;
}

export interface StreamSource {
  id: number;
  provider: string;
  playerType: 'iframe' | 'hls' | 'mp4';
  streamUrl: string;
  quality: string;
  translationTitle: string;
}

export interface Comment {
  id: number;
  contentId: number;
  user: {
    id: number;
    username: string;
    avatarUrl: string | null;
    role: UserRole;
  };
  parentId: number | null;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
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
  content?: ContentItem;
}

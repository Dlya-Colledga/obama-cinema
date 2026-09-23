export const CONTENT_TYPES = {
  MOVIE: 'movie',
  SERIES: 'series',
  ANIME: 'anime',
  CARTOON: 'cartoon',
  DONGHUA: 'donghua',
  DORAMA: 'dorama',
} as const;

export type ContentTypeCode = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

export const BOOKMARK_CATEGORIES = {
  WATCHING: 'watching',
  PLAN_TO_WATCH: 'plan_to_watch',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  FAVORITE: 'favorite',
} as const;

export type BookmarkCategory = typeof BOOKMARK_CATEGORIES[keyof typeof BOOKMARK_CATEGORIES];

export const BOOKMARK_LABELS: Record<BookmarkCategory, string> = {
  watching: 'Смотрю',
  plan_to_watch: 'Буду смотреть',
  completed: 'Просмотрено',
  dropped: 'Брошено',
  favorite: 'В избранном',
};

export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

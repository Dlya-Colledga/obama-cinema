import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { BookmarkItem, BookmarkCategory, BOOKMARK_LABELS } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentCard, ContentCardSkeleton } from '../features/catalog/components/ContentCard';

export const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BookmarkCategory | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  const categories: (BookmarkCategory | '')[] = [
    '',
    'watching',
    'plan_to_watch',
    'completed',
    'favorite',
    'dropped',
  ];

  const loadBookmarks = useCallback(async (cat: BookmarkCategory | '') => {
    setIsLoading(true);
    try {
      const res = await api.get<BookmarkItem[]>('/bookmarks', {
        category: cat || undefined,
        limit: 50,
      });
      setBookmarks(res.data);
    } catch (e) {
      console.error('Failed to load bookmarks', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadBookmarks(selectedCategory);
    }
  }, [user, selectedCategory, loadBookmarks]);

  const handleRemove = async (contentId: number) => {
    try {
      await api.delete(`/bookmarks/${contentId}`);
      setBookmarks(bookmarks.filter(b => b.content.id !== contentId));
    } catch (e) {
      console.error('Failed to remove bookmark', e);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <Bookmark className="size-12 text-primary mx-auto opacity-70" />
        <h2 className="text-xl font-bold text-white">Мои закладки</h2>
        <p className="text-xs text-muted-foreground">Войдите в систему, чтобы сохранять фильмы и сериалы в персональные закладки.</p>
        <Link to="/login">
          <Button size="sm">Войти в аккаунт</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Bookmark className="size-5 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Мои закладки
          </h1>
          <p className="text-xs text-muted-foreground">
            Всего сохранено: {bookmarks.length}
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const label = cat === '' ? 'Все закладки' : BOOKMARK_LABELS[cat];
          return (
            <Button
              key={cat}
              variant={isSelected ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-xl whitespace-nowrap"
            >
              {label}
            </Button>
          );
        })}
      </div>

      {/* Bookmarks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {bookmarks.map((b) => (
            <div key={b.id} className="relative group">
              <ContentCard item={b.content} />
              <Button
                variant="destructive"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(b.content.id);
                }}
                className="absolute top-2 right-2 size-8 rounded-lg bg-black/80 hover:bg-destructive opacity-0 group-hover:opacity-100 transition-all z-20"
                title="Удалить из закладок"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16 bg-card border-white/5 space-y-3">
          <CardContent className="space-y-3">
            <p className="text-sm font-bold text-gray-300">В этой категории пока пусто</p>
            <p className="text-xs text-muted-foreground">Добавляйте фильмы и сериалы в закладки из каталога.</p>
            <Link to="/catalog">
              <Button size="sm">Перейти в каталог</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

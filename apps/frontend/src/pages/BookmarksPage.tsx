import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { BookmarkItem, BookmarkCategory, BOOKMARK_LABELS } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ContentCard } from '../features/catalog/components/ContentCard';

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
        <Bookmark className="w-12 h-12 text-[#FF002F] mx-auto opacity-70" />
        <h2 className="text-xl font-bold text-white">Мои закладки</h2>
        <p className="text-xs text-gray-400">Войдите в систему, чтобы сохранять фильмы и сериалы в персональные закладки.</p>
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
        <div className="w-10 h-10 rounded-xl bg-[#FF002F]/15 text-[#FF002F] flex items-center justify-center">
          <Bookmark className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Мои закладки
          </h1>
          <p className="text-xs text-gray-400">
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
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-[#FF002F] text-white border-[#FF002F] shadow-glow-red'
                  : 'bg-[#000000] text-gray-300 border-white/10 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Bookmarks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {bookmarks.map((b) => (
            <div key={b.id} className="relative group">
              <ContentCard item={b.content} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(b.content.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all z-20"
                title="Удалить из закладок"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#000000] rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-bold text-gray-300">В этой категории пока пусто</p>
          <p className="text-xs text-gray-500">Добавляйте фильмы и сериалы в закладки из каталога.</p>
          <Link to="/catalog">
            <Button size="sm">Перейти в каталог</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

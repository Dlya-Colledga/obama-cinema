import React, { useState } from 'react';
import { Bookmark, Check, ChevronDown } from 'lucide-react';
import { api } from '../../api/client';
import { BookmarkCategory, BOOKMARK_LABELS } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/Button';

interface BookmarkButtonProps {
  contentId: number;
  initialBookmark?: BookmarkCategory | null;
  onBookmarkChanged?: (category: BookmarkCategory | null) => void;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  contentId,
  initialBookmark = null,
  onBookmarkChanged,
}) => {
  const { user } = useAuth();
  const [currentCategory, setCurrentCategory] = useState<BookmarkCategory | null>(initialBookmark);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories: BookmarkCategory[] = [
    'plan_to_watch',
    'watching',
    'completed',
    'favorite',
    'dropped',
  ];

  const handleSelectCategory = async (cat: BookmarkCategory) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);
    setIsOpen(false);
    try {
      if (currentCategory === cat) {
        // Toggle off / remove
        await api.delete(`/bookmarks/${contentId}`);
        setCurrentCategory(null);
        onBookmarkChanged?.(null);
      } else {
        await api.post('/bookmarks', { content_id: contentId, category: cat });
        setCurrentCategory(cat);
        onBookmarkChanged?.(cat);
      }
    } catch (e) {
      console.error('Bookmark update failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setIsLoading(true);
    setIsOpen(false);
    try {
      await api.delete(`/bookmarks/${contentId}`);
      setCurrentCategory(null);
      onBookmarkChanged?.(null);
    } catch (e) {
      console.error('Remove bookmark failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        variant={currentCategory ? 'primary' : 'secondary'}
        onClick={() => setIsOpen(!isOpen)}
        isLoading={isLoading}
        leftIcon={<Bookmark className={`w-4 h-4 ${currentCategory ? 'fill-current' : ''}`} />}
        rightIcon={<ChevronDown className="w-4 h-4 ml-1 opacity-70" />}
      >
        {currentCategory ? BOOKMARK_LABELS[currentCategory] : 'В закладки'}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 mt-2 w-52 rounded-2xl bg-[#1e080b] border border-[#FF002F]/20 shadow-2xl z-30 py-2 divide-y divide-white/5 animate-in fade-in duration-150">
            <div className="py-1">
              {categories.map((cat) => {
                const isSelected = currentCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors"
                  >
                    <span>{BOOKMARK_LABELS[cat]}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#FF002F]" />}
                  </button>
                );
              })}
            </div>

            {currentCategory && (
              <div className="pt-1">
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  Удалить из закладок
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

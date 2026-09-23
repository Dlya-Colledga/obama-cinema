import React, { useState } from 'react';
import { Bookmark, Check, ChevronDown } from 'lucide-react';
import { api } from '../../api/client';
import { BookmarkCategory, BOOKMARK_LABELS } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={currentCategory ? 'default' : 'secondary'}
          isLoading={isLoading}
          leftIcon={<Bookmark className={`size-4 ${currentCategory ? 'fill-current' : ''}`} />}
          rightIcon={<ChevronDown className="size-4 ml-1 opacity-70" />}
        >
          {currentCategory ? BOOKMARK_LABELS[currentCategory] : 'В закладки'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 border-primary/20">
        {categories.map((cat) => {
          const isSelected = currentCategory === cat;
          return (
            <DropdownMenuItem
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className="flex items-center justify-between text-xs py-2"
            >
              <span>{BOOKMARK_LABELS[cat]}</span>
              {isSelected && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        {currentCategory && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive py-2"
            >
              Удалить из закладок
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

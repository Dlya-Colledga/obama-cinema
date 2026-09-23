import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api, animeApi } from '../api/client';
import { ContentItem } from '../types';
import { ContentCard } from '../features/catalog/components/ContentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const [catalogRes, animeRes] = await Promise.allSettled([
        api.get<ContentItem[]>('/catalog', { q: q.trim(), limit: 20 }),
        animeApi.search(q.trim(), 0),
      ]);

      const localItems = catalogRes.status === 'fulfilled' ? catalogRes.value.data : [];
      const animeItems: ContentItem[] = animeRes.status === 'fulfilled'
        ? (animeRes.value.data.data || []).map((a) => ({
            id: a.id,
            contentType: { id: 3, code: 'anime' as const, name: 'Аниме' },
            title: a.title,
            originalTitle: a.titleOriginal,
            slug: a.slug,
            description: a.description,
            posterUrl: a.posterUrl || '',
            bannerUrl: a.screenshots?.[0] || a.posterUrl,
            releaseYear: a.year || 2024,
            ageRating: '16+',
            durationMinutes: a.duration,
            ratingCache: a.rating,
            votesCount: a.votesCount,
            isFeatured: false,
            genres: a.genres.map((g, idx) => ({ id: idx + 1, slug: g, name: g })),
            countries: [{ id: 1, code: 'JP', name: a.country || 'Япония' }],
          }))
        : [];

      const combined = [...localItems];
      for (const a of animeItems) {
        if (!combined.some(c => c.title.toLowerCase() === a.title.toLowerCase() || c.slug === a.slug)) {
          combined.push(a);
        }
      }

      setItems(combined);
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
      if (query.trim()) {
        setSearchParams({ q: query.trim() });
      } else {
        setSearchParams({});
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, performSearch, setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search Header Bar */}
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl sm:text-3xl font-black text-center text-white tracking-tight">
          Поиск по каталогу Obama Cinema
        </h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите название фильма, сериала или аниме..."
            autoFocus
            className="w-full bg-background text-white text-base rounded-2xl pl-12 pr-12 py-4 border border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder:text-muted-foreground shadow-xl transition-all"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-white"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {query && (
          <p className="text-center text-xs text-muted-foreground">
            {isLoading ? 'Идёт поиск...' : `Найдено результатов: ${items.length}`}
          </p>
        )}
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : query.trim() ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-gray-300">Ничего не найдено по запросу «{query}»</p>
          <p className="text-xs text-muted-foreground mt-1">Попробуйте проверить опечатки или введите другое название.</p>
        </div>
      ) : null}
    </div>
  );
};

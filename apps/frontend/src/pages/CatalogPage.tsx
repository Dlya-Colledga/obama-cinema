import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { api, animeApi } from '../api/client';
import { ContentItem, ContentType, Genre, Country, PaginationMeta } from '../types';
import { ContentCard, ContentCardSkeleton } from '../features/catalog/components/ContentCard';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [types, setTypes] = useState<ContentType[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active filters from URL
  const selectedType = searchParams.get('type') || '';
  const selectedGenre = searchParams.get('genre') || '';
  const selectedCountry = searchParams.get('country') || '';
  const selectedSort = searchParams.get('sort') || 'rating';
  const minRating = searchParams.get('rating_from') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Load Taxonomies once
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await api.get<{ types: ContentType[]; genres: Genre[]; countries: Country[] }>('/filters/meta');
        setTypes(res.data.types);
        setGenres(res.data.genres);
        setCountries(res.data.countries);
      } catch (e) {
        console.error('Failed to load filter meta', e);
      }
    };
    loadMeta();
  }, []);

  // Load Catalog Items on filter change
  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      if (selectedType === 'anime' && !selectedGenre && !selectedCountry && !minRating) {
        const animeRes = await animeApi.popular(page - 1);
        const mappedItems: ContentItem[] = (animeRes.data.data || []).map((a) => ({
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
        }));
        setItems(mappedItems);
        const animeMeta = animeRes.data.meta;
        setMeta(animeMeta ? {
          page: animeMeta.page,
          perPage: animeMeta.perPage,
          total: animeMeta.total,
          totalPages: Math.ceil(animeMeta.total / 24),
        } : { page, perPage: 24, total: 1000, totalPages: 50 });
        return;
      }

      const res = await api.get<ContentItem[]>('/catalog', {
        type: selectedType,
        genre: selectedGenre,
        country: selectedCountry,
        sort: selectedSort,
        rating_from: minRating,
        page,
        limit: 24,
      });
      setItems(res.data);
      setMeta(res.meta || null);
    } catch (e) {
      console.error('Failed to load catalog', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, selectedGenre, selectedCountry, selectedSort, minRating, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Каталог видеоконтента
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Найдено {meta?.total ?? items.length} тайтлов по вашим параметрам
          </p>
        </div>

        {(selectedType || selectedGenre || selectedCountry || minRating) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            leftIcon={<RotateCcw className="size-4" />}
          >
            Сбросить фильтры
          </Button>
        )}
      </div>

      {/* Content Type Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Button
          variant={!selectedType ? 'default' : 'secondary'}
          size="sm"
          onClick={() => updateFilter('type', '')}
          className="rounded-xl whitespace-nowrap"
        >
          Все категории
        </Button>
        {types.map((t) => {
          const isSelected = selectedType === t.code;
          return (
            <Button
              key={t.code}
              variant={isSelected ? 'default' : 'secondary'}
              size="sm"
              onClick={() => updateFilter('type', t.code)}
              className="rounded-xl whitespace-nowrap"
            >
              {t.name}
            </Button>
          );
        })}
      </div>

      {/* Advanced Filter Toolbar with shadcn Selects */}
      <div className="p-4 rounded-2xl bg-card border border-white/5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mr-2">
          <SlidersHorizontal className="size-4 text-primary" /> Фильтры:
        </div>

        {/* Genre Selector */}
        <div className="w-40 sm:w-48">
          <Select
            value={selectedGenre || 'ALL'}
            onValueChange={(val) => updateFilter('genre', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Все жанры" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все жанры</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.slug} value={g.slug}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country Selector */}
        <div className="w-40 sm:w-48">
          <Select
            value={selectedCountry || 'ALL'}
            onValueChange={(val) => updateFilter('country', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Все страны" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все страны</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rating 7+ Toggle */}
        <Button
          variant={minRating === '7.0' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => updateFilter('rating_from', minRating === '7.0' ? '' : '7.0')}
          className={`h-9 text-xs rounded-xl ${
            minRating === '7.0'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent'
              : ''
          }`}
        >
          Рейтинг 7.0+
        </Button>

        {/* Sort Order */}
        <div className="ml-auto w-44 sm:w-52">
          <Select
            value={selectedSort}
            onValueChange={(val) => updateFilter('sort', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="rating">По рейтингу</SelectItem>
              <SelectItem value="popular">По популярности</SelectItem>
              <SelectItem value="newest">Сначала новые</SelectItem>
              <SelectItem value="title">По названию (А-Я)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-3xl border border-white/5 space-y-3">
          <p className="text-base font-bold text-white">Ничего не найдено</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Попробуйте изменить выбранные жанры, страны или снизить фильтр минимального рейтинга.
          </p>
          <Button variant="secondary" size="sm" onClick={resetFilters}>
            Сбросить параметры
          </Button>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-8 pb-12">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter('page', String(page - 1))}
          >
            Назад
          </Button>

          <span className="text-xs text-muted-foreground font-medium px-4">
            Страница {page} из {meta.totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => updateFilter('page', String(page + 1))}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
};

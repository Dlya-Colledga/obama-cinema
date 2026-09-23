import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Play, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';

interface HistoryItem {
  id: number;
  watchedAt: string;
  episode?: {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string | null;
  } | null;
  content: {
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

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<HistoryItem[]>('/watch/history', { limit: 50 });
      setHistory(res.data);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const handleClearAll = async () => {
    if (!confirm('Вы уверены, что хотите полностью очистить историю просмотров?')) return;
    try {
      await api.delete('/watch/history');
      setHistory([]);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await api.delete(`/watch/history?id=${id}`);
      setHistory(history.filter(h => h.id !== id));
    } catch (e) {
      console.error('Failed to delete history item', e);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <Clock className="w-12 h-12 text-[#FF002F] mx-auto opacity-70" />
        <h2 className="text-xl font-bold text-white">История просмотров</h2>
        <p className="text-xs text-gray-400">Авторизуйтесь, чтобы отслеживать историю ваших просмотров.</p>
        <Link to="/login">
          <Button size="sm">Войти в аккаунт</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF002F]/15 text-[#FF002F] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              История просмотров
            </h1>
            <p className="text-xs text-gray-400">
              Всего записей: {history.length}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearAll}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Очистить всю историю
          </Button>
        )}
      </div>

      {/* History Timeline */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl w-full" />
          ))}
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#000000] border border-white/5 hover:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-20 aspect-[16/10] rounded-xl overflow-hidden bg-black shrink-0">
                  <img
                    src={item.content.bannerUrl || item.content.posterUrl}
                    alt={item.content.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#FF002F]">
                      {item.content.contentType.name}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.watchedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">
                    {item.content.title}
                  </h4>
                  {item.episode && (
                    <p className="text-xs text-gray-400 truncate">
                      Серия {item.episode.episodeNumber}: {item.episode.title}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <Link
                  to={`/watch/${item.content.slug}${item.episode ? `?episode=${item.episode.id}` : ''}`}
                >
                  <Button size="sm" leftIcon={<Play className="w-4 h-4 fill-current" />}>
                    Продолжить
                  </Button>
                </Link>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors"
                  title="Удалить из истории"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#000000] rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-bold text-gray-300">История просмотров пуста</p>
          <p className="text-xs text-gray-500">Начните смотреть фильмы или сериалы, чтобы они сохранялись здесь.</p>
          <Link to="/catalog">
            <Button size="sm">Перейти в каталог</Button>
          </Link>
        </div>
      )}
    </div>
  );
};

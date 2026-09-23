import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RatingWidgetProps {
  contentId: number;
  initialRating?: number | null;
  ratingCache: number;
  votesCount: number;
  onRatingChanged?: (newScore: number, newVotes: number, userRate: number | null) => void;
}

export const RatingWidget: React.FC<RatingWidgetProps> = ({
  contentId,
  initialRating = null,
  ratingCache,
  votesCount,
  onRatingChanged,
}) => {
  const { user } = useAuth();
  const [currentUserRating, setCurrentUserRating] = useState<number | null>(initialRating);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (score: number) => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ userRating: number; ratingCache: number; votesCount: number }>(
        `/content/${contentId}/ratings`,
        { rating: score }
      );
      setCurrentUserRating(res.data.userRating);
      onRatingChanged?.(res.data.ratingCache, res.data.votesCount, res.data.userRating);
      setIsModalOpen(false);
    } catch (e) {
      console.error('Rating failed', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const res = await api.delete<{ userRating: null; ratingCache: number; votesCount: number }>(
        `/content/${contentId}/ratings`
      );
      setCurrentUserRating(null);
      onRatingChanged?.(res.data.ratingCache, res.data.votesCount, null);
      setIsModalOpen(false);
    } catch (e) {
      console.error('Remove rating failed', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant={currentUserRating !== null ? 'outline' : 'secondary'}
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 rounded-xl transition-all ${
            currentUserRating !== null
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-lg hover:bg-amber-500/20'
              : 'border-white/10 hover:border-primary/40 text-gray-200'
          }`}
        >
          <Star className={`size-4 ${currentUserRating !== null ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
          <span className="text-sm font-semibold">
            {currentUserRating !== null ? `Ваша оценка: ${currentUserRating}` : 'Оценить'}
          </span>
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold text-white">
              {ratingCache > 0 ? ratingCache.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">/ 10</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {votesCount} {votesCount === 1 ? 'оценка' : 'оценок'}
          </span>
        </div>
      </div>

      {/* Dialog for setting rating 1-10 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {user ? 'Поставьте вашу оценку (от 1 до 10)' : 'Авторизуйтесь для оценки'}
            </DialogTitle>
          </DialogHeader>

          {user ? (
            <div className="flex flex-col gap-6 text-center py-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                  const isLit = (hoverRating || currentUserRating || 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRate(star)}
                      disabled={isSubmitting}
                      className="p-1 text-gray-600 hover:scale-125 transition-transform focus:outline-none"
                      title={`${star} из 10`}
                    >
                      <Star
                        className={`size-7 sm:size-8 transition-colors ${
                          isLit
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'text-gray-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-lg font-bold text-amber-400 h-6">
                {hoverRating > 0 ? `${hoverRating} / 10` : currentUserRating ? `Вы поставили: ${currentUserRating} / 10` : 'Нажмите на звезду'}
              </div>

              {currentUserRating !== null && (
                <div className="flex justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveRating}
                    isLoading={isSubmitting}
                  >
                    Удалить оценку
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-center py-2">
              <p className="text-sm text-muted-foreground">
                Чтобы оценивать контент и влиять на рейтинг, пожалуйста, войдите в свой аккаунт.
              </p>
              <div className="flex justify-center gap-3">
                <a href="/login">
                  <Button size="sm">Войти</Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

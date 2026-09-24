import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Trash2, Edit2, Send } from 'lucide-react';
import { api } from '../../api/client';
import { Comment, PaginationMeta } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CommentSectionProps {
  contentId: number;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ contentId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadComments = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const res = await api.get<Comment[]>(`/content/${contentId}/comments`, { page: p, limit: 15 });
      setComments(res.data);
      setMeta(res.meta || null);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    loadComments(page);
  }, [loadComments, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const res = await api.post<Comment>(`/content/${contentId}/comments`, { text: newText.trim() });
      setComments([res.data, ...comments]);
      setNewText('');
      if (meta) {
        setMeta({ ...meta, total: meta.total + 1 });
      }
    } catch (e) {
      console.error('Failed to submit comment', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingComment || !editText.trim()) return;
    setIsEditing(true);
    try {
      const res = await api.put<Comment>(`/comments/${editingComment.id}`, { text: editText.trim() });
      setComments(comments.map(c => c.id === res.data.id ? res.data : c));
      setEditingComment(null);
    } catch (e) {
      console.error('Failed to update comment', e);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      await api.delete(`/comments/${id}`);
      setComments(comments.filter(c => c.id !== id));
      if (meta) {
        setMeta({ ...meta, total: Math.max(0, meta.total - 1) });
      }
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  return (
    <section className="mt-12 bg-card rounded-3xl p-6 sm:p-8 border border-white/5">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Комментарии и отзывы</h3>
            <span className="text-xs text-muted-foreground">
              Всего {meta?.total ?? comments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="flex gap-3">
            <Avatar className="size-10 shrink-0">
              {user.profile?.avatarUrl && <AvatarImage src={user.profile.avatarUrl} alt={user.username} />}
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-grow space-y-2">
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Поделитесь впечатлениями о просмотре..."
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={!newText.trim()}
                  leftIcon={<Send className="size-3.5" />}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-10 p-5 rounded-2xl bg-secondary/40 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Войдите в аккаунт, чтобы оставить свой отзыв или комментарий.
          </span>
          <a href="/login">
            <Button size="sm">Войти</Button>
          </a>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-background border border-white/5 space-y-3 select-none"
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>
          ))
        ) : (
          comments.map((comment) => {
          const isAuthor = user && user.id === comment.user.id;
          const canDelete = isAuthor || (user && (user.role === 'admin' || user.role === 'moderator'));

          return (
            <div
              key={comment.id}
              className="p-4 rounded-2xl bg-background border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    {comment.user.avatarUrl && (
                      <AvatarImage src={comment.user.avatarUrl} alt={comment.user.username} />
                    )}
                    <AvatarFallback className="text-xs">
                      {comment.user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{comment.user.username}</span>
                      {comment.user.role === 'admin' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Админ
                        </Badge>
                      )}
                      {comment.user.role === 'moderator' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-400 bg-blue-950/40">
                          Критик
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{new Date(comment.createdAt).toLocaleDateString('ru-RU')}</span>
                      {comment.isEdited && <span>(изменено)</span>}
                    </div>
                  </div>
                </div>

                {/* Actions for Author / Mod */}
                <div className="flex items-center gap-1">
                  {isAuthor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-white"
                      onClick={() => {
                        setEditingComment(comment);
                        setEditText(comment.text);
                      }}
                      title="Редактировать"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(comment.id)}
                      title="Удалить"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap pl-10">
                {comment.text}
              </p>
            </div>
          );
        }))}

        {!isLoading && comments.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-xs">
            Пока нет ни одного комментария. Станьте первым!
          </div>
        )}

        {/* Pagination buttons if multiple pages */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-6">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </Button>
            <span className="flex items-center px-3 text-xs text-muted-foreground font-medium">
              {page} из {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </Button>
          </div>
        )}
      </div>

      {/* Edit Comment Dialog */}
      <Dialog open={editingComment !== null} onOpenChange={(open) => !open && setEditingComment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактирование комментария</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingComment(null)}>
                Отмена
              </Button>
              <Button size="sm" isLoading={isEditing} onClick={handleUpdate}>
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

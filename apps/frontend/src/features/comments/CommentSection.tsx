import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Trash2, Edit2, Send } from 'lucide-react';
import { api } from '../../api/client';
import { Comment, PaginationMeta } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

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
    <section className="mt-12 bg-[#140405] rounded-3xl p-6 sm:p-8 border border-white/5">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF002F]/15 text-[#FF002F] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Комментарии и отзывы</h3>
            <span className="text-xs text-gray-400">
              Всего {meta?.total ?? comments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF002F]/20 text-[#FF002F] flex items-center justify-center font-bold text-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow space-y-2">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Поделитесь впечатлениями о просмотре..."
                rows={3}
                className="w-full bg-[#000000] text-white text-sm rounded-2xl p-4 border border-white/10 focus:border-[#FF002F] focus:ring-1 focus:ring-[#FF002F]/30 focus:outline-none placeholder:text-gray-500 transition-all resize-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={!newText.trim()}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-10 p-5 rounded-2xl bg-[#1a0608] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-300">
            Войдите в аккаунт, чтобы оставить свой отзыв или комментарий.
          </span>
          <a href="/login">
            <Button size="sm">Войти</Button>
          </a>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => {
          const isAuthor = user && user.id === comment.user.id;
          const canDelete = isAuthor || (user && (user.role === 'admin' || user.role === 'moderator'));

          return (
            <div
              key={comment.id}
              className="p-4 rounded-2xl bg-[#000000] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {comment.user.avatarUrl ? (
                    <img
                      src={comment.user.avatarUrl}
                      alt={comment.user.username}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#22090c] text-white flex items-center justify-center text-xs font-bold border border-white/10">
                      {comment.user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{comment.user.username}</span>
                      {comment.user.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-semibold border border-red-800/40">
                          Админ
                        </span>
                      )}
                      {comment.user.role === 'moderator' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-semibold border border-blue-800/40">
                          Критик
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <span>{new Date(comment.createdAt).toLocaleDateString('ru-RU')}</span>
                      {comment.isEdited && <span>(изменено)</span>}
                    </div>
                  </div>
                </div>

                {/* Actions for Author / Mod */}
                <div className="flex items-center gap-1">
                  {isAuthor && (
                    <button
                      onClick={() => {
                        setEditingComment(comment);
                        setEditText(comment.text);
                      }}
                      className="p-1 text-gray-400 hover:text-white rounded"
                      title="Редактировать"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-gray-400 hover:text-red-400 rounded"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap pl-10">
                {comment.text}
              </p>
            </div>
          );
        })}

        {!isLoading && comments.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-xs">
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
            <span className="flex items-center px-3 text-xs text-gray-400 font-medium">
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

      {/* Edit Comment Modal */}
      <Modal
        isOpen={editingComment !== null}
        onClose={() => setEditingComment(null)}
        title="Редактирование комментария"
      >
        <div className="space-y-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="w-full bg-[#1e080b] text-white text-sm rounded-xl p-3 border border-white/10 focus:border-[#FF002F] focus:outline-none"
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
      </Modal>
    </section>
  );
};

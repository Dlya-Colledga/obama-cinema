import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Calendar, Shield, LogOut, Edit3, Bookmark, Clock } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatarUrl || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put<User>('/users/profile', {
        avatar_url: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      });
      await refreshUser();
      setIsEditModalOpen(false);
    } catch (e) {
      console.error('Failed to update profile', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#000000] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Subtle red ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF002F]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative group">
            {user.profile?.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                alt={user.username}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-[#FF002F]/30 shadow-glow-red"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#22090c] text-[#FF002F] flex items-center justify-center font-black text-3xl border-2 border-[#FF002F]/30 shadow-glow-red">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="space-y-2 flex-grow">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {user.username}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-[#FF002F]/20 text-[#FF002F] border border-[#FF002F]/30 w-fit mx-auto sm:mx-0">
                <Shield className="w-3 h-3" /> {user.role}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#FF002F]" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FF002F]" /> В клубе с {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>

            {user.profile?.bio && (
              <p className="text-xs sm:text-sm text-gray-300 italic pt-2 max-w-lg leading-relaxed">
                «{user.profile.bio}»
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAvatarUrl(user.profile?.avatarUrl || '');
                  setBio(user.profile?.bio || '');
                  setIsEditModalOpen(true);
                }}
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Редактировать профиль
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/bookmarks"
          className="p-6 rounded-3xl bg-[#000000] border border-white/5 hover:border-[#FF002F]/40 hover:shadow-glow-red transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FF002F]/15 text-[#FF002F] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bookmark className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-[#FF002F] transition-colors">
              Мои закладки
            </h3>
            <p className="text-xs text-gray-400">
              Смотрите фильмы и серии из сохраненных категорий
            </p>
          </div>
        </Link>

        <Link
          to="/history"
          className="p-6 rounded-3xl bg-[#000000] border border-white/5 hover:border-[#FF002F]/40 hover:shadow-glow-red transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FF002F]/15 text-[#FF002F] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-[#FF002F] transition-colors">
              История просмотров
            </h3>
            <p className="text-xs text-gray-400">
              Возобновляйте просмотр с сохранённой секунды
            </p>
          </div>
        </Link>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Настройки профиля"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="URL аватара"
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            leftIcon={<UserIcon className="w-4 h-4" />}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-300">О себе (Bio)</label>
            <textarea
              rows={3}
              placeholder="Расскажите о любимых жанрах или фильмах..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#000000] text-white text-sm rounded-xl p-3 border border-white/10 focus:border-[#FF002F] focus:outline-none placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsEditModalOpen(false)}
            >
              Отмена
            </Button>
            <Button size="sm" type="submit" isLoading={isSaving}>
              Сохранить изменения
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

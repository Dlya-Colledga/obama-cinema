import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Calendar, Shield, LogOut, Edit3, Bookmark, Clock } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
      <Card className="border-white/10 shadow-2xl relative overflow-hidden">
        {/* Subtle red ambient background */}
        <div className="absolute top-0 right-0 size-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
          {/* Avatar */}
          <Avatar className="size-24 sm:size-28 rounded-3xl border-2 border-primary/30 shadow-glow-red">
            {user.profile?.avatarUrl && (
              <AvatarImage src={user.profile.avatarUrl} alt={user.username} className="rounded-3xl" />
            )}
            <AvatarFallback className="text-3xl font-black rounded-3xl bg-secondary text-primary">
              {user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Details */}
          <div className="space-y-2 flex-grow">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {user.username}
              </h1>
              <Badge variant="type" className="w-fit mx-auto sm:mx-0 flex items-center gap-1">
                <Shield className="size-3" /> {user.role}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> В клубе с {new Date(user.createdAt).toLocaleDateString('ru-RU')}
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
                leftIcon={<Edit3 className="size-4" />}
              >
                Редактировать профиль
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="size-4" />}
              >
                Выйти
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/bookmarks"
          className="p-6 rounded-3xl bg-card border border-white/5 hover:border-primary/40 hover:shadow-glow-red transition-all flex items-center gap-4 group"
        >
          <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bookmark className="size-6 fill-current" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
              Мои закладки
            </h3>
            <p className="text-xs text-muted-foreground">
              Смотрите фильмы и серии из сохраненных категорий
            </p>
          </div>
        </Link>

        <Link
          to="/history"
          className="p-6 rounded-3xl bg-card border border-white/5 hover:border-primary/40 hover:shadow-glow-red transition-all flex items-center gap-4 group"
        >
          <div className="size-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
              История просмотров
            </h3>
            <p className="text-xs text-muted-foreground">
              Возобновляйте просмотр с сохранённой секунды
            </p>
          </div>
        </Link>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки профиля</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <Input
              label="URL аватара"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              leftIcon={<UserIcon className="size-4" />}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-300">О себе (Bio)</label>
              <Textarea
                rows={3}
                placeholder="Расскажите о любимых жанрах или фильмах..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="resize-none"
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

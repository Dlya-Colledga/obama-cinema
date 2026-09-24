import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(form.login, form.password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setForm({ login: 'demo@obama.cinema', password: 'password123' });
  };

  const fillAdminAccount = () => {
    setForm({ login: 'admin@obama.cinema', password: 'admin123' });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center group">
            <span className="font-black text-3xl tracking-wider text-white group-hover:opacity-90 transition-opacity">
              OBAMA<span className="text-primary ml-1.5">CINEMA</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Вход в личный кабинет
          </h2>
          <p className="text-xs text-muted-foreground">
            Получите доступ к истории просмотров, оценкам и персональным закладкам
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-white/10 shadow-2xl">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email или имя пользователя"
                type="text"
                placeholder="example@obama.cinema"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                leftIcon={<Mail className="size-4" />}
                required
              />

              <Input
                label="Пароль"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                leftIcon={<Lock className="size-4" />}
                required
              />

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
                leftIcon={<LogIn className="size-4" />}
              >
                Войти
              </Button>
            </form>

            {/* Demo 1-Click Login Shortcuts */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <span className="text-[11px] text-muted-foreground font-semibold block text-center uppercase tracking-wider">
                Быстрый вход для тестирования
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={fillDemoAccount}
                  leftIcon={<Sparkles className="size-3.5 text-primary" />}
                  className="text-xs"
                >
                  Демо-юзер
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={fillAdminAccount}
                  leftIcon={<Sparkles className="size-3.5 text-amber-400" />}
                  className="text-xs"
                >
                  Админ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

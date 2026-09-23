import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Lock, Mail, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF002F] flex items-center justify-center shadow-glow-red">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl text-white">
              OBAMA<span className="text-[#FF002F] ml-1">CINEMA</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Вход в личный кабинет
          </h2>
          <p className="text-xs text-gray-400">
            Получите доступ к истории просмотров, оценкам и персональным закладкам
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#000000] border border-white/10 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email или имя пользователя"
              type="text"
              placeholder="example@obama.cinema"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Войти
            </Button>
          </form>

          {/* Demo 1-Click Login Shortcuts */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <span className="text-[11px] text-gray-500 font-semibold block text-center uppercase tracking-wider">
              Быстрый вход для тестирования
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillDemoAccount}
                className="p-2 rounded-xl bg-[#20080b] hover:bg-[#2c0c10] border border-white/5 text-[11px] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF002F]" /> Демо-юзер
              </button>
              <button
                type="button"
                onClick={fillAdminAccount}
                className="p-2 rounded-xl bg-[#20080b] hover:bg-[#2c0c10] border border-white/5 text-[11px] text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Админ
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="text-[#FF002F] font-semibold hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

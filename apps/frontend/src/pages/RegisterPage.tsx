import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Lock, Mail, User, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (form.password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      await register(form.email, form.username, form.password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-red">
              <Film className="size-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl text-white">
              OBAMA<span className="text-primary ml-1">CINEMA</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Создание аккаунта
          </h2>
          <p className="text-xs text-muted-foreground">
            Присоединяйтесь к сообществу киноманов Obama Cinema
          </p>
        </div>

        {/* Register Card */}
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
                label="Email"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                leftIcon={<Mail className="size-4" />}
                required
              />

              <Input
                label="Имя пользователя"
                type="text"
                placeholder="cinema_lover"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                leftIcon={<User className="size-4" />}
                required
              />

              <Input
                label="Пароль"
                type="password"
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                leftIcon={<Lock className="size-4" />}
                required
              />

              <Input
                label="Повторите пароль"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                leftIcon={<Lock className="size-4" />}
                required
              />

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
                leftIcon={<UserPlus className="size-4" />}
              >
                Зарегистрироваться
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Войти в систему
          </Link>
        </p>
      </div>
    </div>
  );
};

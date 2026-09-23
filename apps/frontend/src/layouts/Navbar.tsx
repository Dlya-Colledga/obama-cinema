import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Film,
  Bookmark,
  Clock,
  User as UserIcon,
  LogIn,
  Menu,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileSheetOpen(false);
    }
  };

  const navLinks = [
    { label: 'Главная', path: '/' },
    { label: 'Каталог', path: '/catalog' },
    { label: 'Фильмы', path: '/catalog?type=movie' },
    { label: 'Сериалы', path: '/catalog?type=series' },
    { label: 'Аниме', path: '/catalog?type=anime' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-red group-hover:scale-105 transition-transform">
            <Film className="size-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-white flex items-center">
              OBAMA<span className="text-primary ml-1">CINEMA</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-semibold -mt-1">
              Онлайн Кинотеатр
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
          {navLinks.map((link) => {
            const isActive =
              location.pathname + location.search === link.path ||
              (link.path === '/' && location.pathname === '/');
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-white/10 font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Search Bar & User Actions */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-48 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск фильмов, аниме..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] text-white text-xs rounded-xl pl-9 pr-4 py-2 border border-white/10 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground"
            />
          </form>

          {/* Quick links & user menu */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/bookmarks"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                title="Закладки"
              >
                <Bookmark className="size-5" />
              </Link>
              <Link
                to="/history"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                title="История"
              >
                <Clock className="size-5" />
              </Link>

              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-card hover:bg-white/10 border border-primary/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <Avatar className="size-7">
                      {user.profile?.avatarUrl && (
                        <AvatarImage src={user.profile.avatarUrl} alt={user.username} />
                      )}
                      <AvatarFallback className="text-xs">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-white max-w-[90px] truncate hidden lg:inline">
                      {user.username}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-primary/20">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-semibold text-white">{user.username}</span>
                    <span className="text-[11px] text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center gap-2">
                      <UserIcon className="size-4" />
                      <span>Мой профиль</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/bookmarks" className="cursor-pointer flex items-center gap-2">
                      <Bookmark className="size-4" />
                      <span>Закладки</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/history" className="cursor-pointer flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>История просмотров</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="secondary" size="sm" leftIcon={<LogIn className="size-4" />}>
                  Войти
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Sheet Menu */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-300 hover:text-white"
                aria-label="Открыть меню"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-4/5 sm:max-w-sm bg-background border-white/10 p-6">
              <SheetHeader>
                <SheetTitle className="text-left font-extrabold text-xl tracking-wider text-white">
                  OBAMA<span className="text-primary ml-1">CINEMA</span>
                </SheetTitle>
              </SheetHeader>

              <form onSubmit={handleSearchSubmit} className="relative w-full mt-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск фильмов, аниме..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121212] text-white text-sm rounded-xl pl-9 pr-4 py-2.5 border border-white/10 focus:border-primary focus:outline-none"
                />
              </form>

              <nav className="flex flex-col gap-1.5 mt-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileSheetOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    <div className="h-px bg-white/10 my-2" />
                    <Link
                      to="/bookmarks"
                      onClick={() => setMobileSheetOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2.5"
                    >
                      <Bookmark className="size-4 text-primary" />
                      Закладки
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setMobileSheetOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2.5"
                    >
                      <Clock className="size-4 text-primary" />
                      История просмотров
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileSheetOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2.5"
                    >
                      <UserIcon className="size-4 text-primary" />
                      Мой профиль ({user.username})
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileSheetOpen(false);
                      }}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2.5 text-left"
                    >
                      <LogOut className="size-4" />
                      Выйти
                    </button>
                  </>
                ) : (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Link to="/login" onClick={() => setMobileSheetOpen(false)}>
                      <Button className="w-full" leftIcon={<LogIn className="size-4" />}>
                        Войти в аккаунт
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

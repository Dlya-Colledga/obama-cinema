import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Film, Bookmark, Clock, User as UserIcon, LogIn, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
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
          <div className="w-10 h-10 rounded-xl bg-[#FF002F] flex items-center justify-center shadow-glow-red group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-wider text-white flex items-center">
              OBAMA<span className="text-[#FF002F] ml-1">CINEMA</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-gray-400 font-semibold -mt-1">
              Онлайн Кинотеатр
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
          {navLinks.map((link) => {
            const isActive = location.pathname + location.search === link.path || (link.path === '/' && location.pathname === '/');
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск фильмов, аниме..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] text-white text-xs rounded-xl pl-9 pr-4 py-2 border border-white/10 focus:border-[#FF002F] focus:outline-none focus:ring-1 focus:ring-[#FF002F]/30 transition-all placeholder:text-gray-500"
            />
          </form>

          {/* Quick links when logged in */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/bookmarks"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                title="Закладки"
              >
                <Bookmark className="w-5 h-5" />
              </Link>
              <Link
                to="/history"
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                title="История"
              >
                <Clock className="w-5 h-5" />
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#FF002F]/20 transition-all"
              >
                {user.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.username}
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#FF002F]/20 text-[#FF002F] flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-white max-w-[90px] truncate hidden lg:inline">
                  {user.username}
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="secondary" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
                  Войти
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-white/5 bg-[#000000] space-y-3 animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearchSubmit} className="relative w-full pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] text-white text-sm rounded-xl pl-9 pr-4 py-2.5 border border-white/10 focus:border-[#FF002F]"
            />
          </form>

          <nav className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  to="/bookmarks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4 text-[#FF002F]" />
                  Закладки
                </Link>
                <Link
                  to="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#FF002F]" />
                  История просмотров
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-[#FF002F]" />
                  Мой профиль ({user.username})
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

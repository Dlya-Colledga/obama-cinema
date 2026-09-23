import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#000000] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF002F] flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg text-white">
                OBAMA<span className="text-[#FF002F] ml-0.5">CINEMA</span>
              </span>
            </Link>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Агрегатор медиаконтента нового поколения. Фильмы, сериалы, аниме, мультфильмы, донхуа и дорамы со встроенным сохранением прогресса, рецензиями и персональными закладками.
            </p>
          </div>

          {/* Catalog links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Каталог</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/catalog?type=movie" className="hover:text-white transition-colors">Фильмы</Link></li>
              <li><Link to="/catalog?type=series" className="hover:text-white transition-colors">Сериалы</Link></li>
              <li><Link to="/catalog?type=anime" className="hover:text-white transition-colors">Аниме</Link></li>
              <li><Link to="/catalog?type=cartoon" className="hover:text-white transition-colors">Мультфильмы</Link></li>
              <li><Link to="/catalog?type=dorama" className="hover:text-white transition-colors">Дорамы</Link></li>
              <li><Link to="/catalog?type=donghua" className="hover:text-white transition-colors">Донхуа</Link></li>
            </ul>
          </div>

          {/* Social & Account */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Профиль</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/bookmarks" className="hover:text-white transition-colors">Мои закладки</Link></li>
              <li><Link to="/history" className="hover:text-white transition-colors">История просмотров</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Настройки аккаунта</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Obama Cinema Platform. Все права защищены.</p>
          <p className="flex items-center gap-1">
            Сделано с <Heart className="w-3.5 h-3.5 text-[#FF002F] fill-current" /> для ценителей кинематографа
          </p>
        </div>
      </div>
    </footer>
  );
};

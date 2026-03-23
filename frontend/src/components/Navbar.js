import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { House, MagnifyingGlass, ChatCircle, User, Gear, SignOut, Moon, Sun } from '@phosphor-icons/react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass shadow-lg border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg glow-pulse">
                <span className="text-white font-bold text-xl font-heading">F</span>
              </div>
              <span className="text-2xl font-bold font-heading tracking-tighter hidden sm:block uppercase">Flux</span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} weight="bold" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder={t('nav.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 rounded-full bg-muted/50 border-transparent focus:border-primary"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <Button
              data-testid="theme-toggle-btn"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full hover:scale-110 transition-transform active:scale-95"
            >
              {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
            </Button>

            <Link to="/">
              <Button
                data-testid="nav-home-btn"
                variant={isActive('/') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full hover:scale-110 transition-transform active:scale-95"
                title={t('nav.home')}
              >
                <House size={20} weight={isActive('/') ? 'fill' : 'bold'} />
              </Button>
            </Link>

            <Link to="/chat">
              <Button
                data-testid="nav-chat-btn"
                variant={isActive('/chat') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full hover:scale-110 transition-transform active:scale-95"
                title={t('nav.chat')}
              >
                <ChatCircle size={20} weight={isActive('/chat') ? 'fill' : 'bold'} />
              </Button>
            </Link>

            <Link to={`/profile/${user?.id}`}>
              <Button
                data-testid="nav-profile-btn"
                variant="ghost"
                size="icon"
                className="rounded-full p-0 hover:scale-110 transition-transform active:scale-95"
                title={t('nav.profile')}
              >
                <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                  <AvatarImage src={user?.avatar_url} alt="avatar" className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </Link>

            <Link to="/settings">
              <Button
                data-testid="nav-settings-btn"
                variant={isActive('/settings') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full hover:scale-110 transition-transform active:scale-95"
                title={t('nav.settings')}
              >
                <Gear size={20} weight={isActive('/settings') ? 'fill' : 'bold'} />
              </Button>
            </Link>

            <Button
              data-testid="logout-btn"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-destructive hover:scale-110 transition-transform active:scale-95"
              title={t('nav.logout')}
            >
              <SignOut size={20} weight="bold" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

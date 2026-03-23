import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { House, MagnifyingGlass, PlusCircle, PaperPlaneTilt, User, Moon, Sun } from '@phosphor-icons/react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Navbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Pulse</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/">
              <Button
                data-testid="nav-home-btn"
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
              >
                <House size={28} weight={isActive('/') ? 'fill' : 'regular'} />
              </Button>
            </Link>

            <Link to="/search">
              <Button
                data-testid="nav-search-btn"
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
              >
                <MagnifyingGlass size={28} weight={isActive('/search') ? 'bold' : 'regular'} />
              </Button>
            </Link>

            <Button
              data-testid="nav-create-btn"
              variant="ghost"
              size="icon"
              className="hover:bg-transparent"
              onClick={() => navigate('/?create=true')}
            >
              <PlusCircle size={28} weight="regular" />
            </Button>

            <Link to="/chat">
              <Button
                data-testid="nav-chat-btn"
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
              >
                <PaperPlaneTilt size={28} weight={isActive('/chat') ? 'fill' : 'regular'} />
              </Button>
            </Link>

            <Link to={`/profile/${user?.id}`}>
              <Button
                data-testid="nav-profile-btn"
                variant="ghost"
                size="icon"
                className="hover:bg-transparent p-0"
              >
                <div className={isActive(`/profile/${user?.id}`) ? 'instagram-gradient-border' : ''}>  
                  <Avatar className={`${isActive(`/profile/${user?.id}`) ? 'w-7 h-7' : 'w-8 h-8'} border-2 ${isActive(`/profile/${user?.id}`) ? 'border-transparent' : 'border-foreground'}`}>
                    <AvatarImage src={user?.avatar_url} alt="avatar" style={{ objectFit: 'cover' }} />
                    <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </Button>
            </Link>

            <Button
              data-testid="theme-toggle-btn"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-transparent"
            >
              {isDark ? <Sun size={24} weight="regular" /> : <Moon size={24} weight="regular" />}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

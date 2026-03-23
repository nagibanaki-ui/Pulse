import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, User, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const Navbar = () => {
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
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl font-heading">S</span>
              </div>
              <span className="text-xl font-bold font-heading hidden sm:block">Social</span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 rounded-full"
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
              className="rounded-full"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Link to="/">
              <Button
                data-testid="nav-home-btn"
                variant={isActive('/') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full"
              >
                <Home className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/chat">
              <Button
                data-testid="nav-chat-btn"
                variant={isActive('/chat') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full"
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>

            <Link to={`/profile/${user?.id}`}>
              <Button
                data-testid="nav-profile-btn"
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </Link>

            <Link to="/settings">
              <Button
                data-testid="nav-settings-btn"
                variant={isActive('/settings') ? 'default' : 'ghost'}
                size="icon"
                className="rounded-full"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </Link>

            <Button
              data-testid="logout-btn"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

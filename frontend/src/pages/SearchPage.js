import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import Navbar from '../components/Navbar';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent } from '../components/ui/card';
import api from '../api';
import { toast } from 'sonner';

const SearchPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      handleSearch(q);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${searchQuery}`);
      setResults(res.data);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${query}`);
    }
  };

  return (
    <div data-testid="search-page" className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold font-heading tracking-tighter uppercase mb-8">{t('search.title')}</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={24} weight="bold" />
            <Input
              data-testid="search-page-input"
              type="text"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-14 h-14 rounded-full text-base bg-muted/50 border-border focus:border-primary"
            />
          </div>
        </form>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="glow-pulse inline-block">
                <p className="text-muted-foreground font-heading text-xl">{t('search.searching')}</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {query ? t('search.noResults') : t('search.enterUsername')}
              </p>
            </div>
          ) : (
            results.map((user) => (
              <Card
                key={user.id}
                data-testid={`user-result-${user.id}`}
                className="glass rounded-3xl border-border/40 cursor-pointer hover:border-primary/20 hover:scale-[1.02] transition-all"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar_url} alt="avatar" className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p data-testid="user-result-username" className="font-semibold font-heading text-lg">
                        {user.username}
                      </p>
                      <p data-testid="user-result-email" className="text-sm text-muted-foreground font-mono">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;

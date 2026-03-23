import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, MagnifyingGlass, UserPlus } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import api from '../api';
import { toast } from 'sonner';

const FeedPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Search friends state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadPosts();
    
    // Check if create modal should be opened
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowCreateModal(true);
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const loadPosts = async () => {
    try {
      const res = await api.get(`/posts/feed?skip=${page * 20}&limit=20`);
      if (res.data.length < 20) {
        setHasMore(false);
      }
      setPosts([...posts, ...res.data]);
      setPage(page + 1);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const res = await api.get(`/users/search?q=${query}`);
      setSearchResults(res.data.slice(0, 5)); // Show top 5 results
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFollowUser = async (userId) => {
    try {
      await api.post(`/users/${userId}/follow`);
      toast.success('Following!');
      setSearchResults(searchResults.filter(u => u.id !== userId));
    } catch (err) {
      toast.error('Failed to follow');
    }
  };

  return (
    <div data-testid="feed-page" className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-5xl font-bold font-heading tracking-tighter uppercase">{t('feed.title')}</h1>
              <Button
                data-testid="create-post-btn"
                onClick={() => setShowCreateModal(true)}
                className="rounded-full gap-2 hover:scale-105 transition-transform active:scale-95 hover:shadow-[0_0_30px_rgba(124,58,237,0.6)]"
              >
                <Plus size={20} weight="bold" />
                {t('feed.createPost')}
              </Button>
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="glow-pulse inline-block">
                    <p className="text-muted-foreground font-heading text-xl">{t('feed.loading')}</p>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('feed.noPosts')}</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handlePostDeleted}
                  />
                ))
              )}

              {hasMore && !loading && posts.length > 0 && (
                <div className="text-center py-6">
                  <Button
                    data-testid="load-more-btn"
                    onClick={loadPosts}
                    variant="outline"
                    className="rounded-full hover:scale-105 transition-transform"
                  >
                    {t('feed.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Search Friends Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <Card className="glass rounded-3xl border-border/40">
                <CardHeader>
                  <CardTitle className="text-2xl font-heading tracking-tight flex items-center gap-2">
                    <MagnifyingGlass size={24} weight="bold" />
                    {t('search.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlass 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                      size={20} 
                      weight="bold" 
                    />
                    <Input
                      data-testid="feed-search-input"
                      type="text"
                      placeholder={t('search.placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-full bg-muted/50 border-border focus:border-primary"
                    />
                  </div>

                  {searchLoading ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">{t('search.searching')}</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                            <AvatarImage src={user.avatar_url} alt="avatar" className="object-cover" />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {user.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{user.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowUser(user.id);
                            }}
                          >
                            <UserPlus size={18} weight="bold" />
                          </Button>
                        </div>
                      ))}
                      {searchResults.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full rounded-full"
                          onClick={() => navigate(`/search?q=${searchQuery}`)}
                        >
                          View All Results
                        </Button>
                      )}
                    </div>
                  ) : searchQuery ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">{t('search.noResults')}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">{t('search.enterUsername')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CreatePostModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
};

export default FeedPage;

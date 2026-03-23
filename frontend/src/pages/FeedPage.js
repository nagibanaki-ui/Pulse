import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import api from '../api';
import { toast } from 'sonner';

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPosts();
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

  return (
    <div data-testid="feed-page" className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-heading">Feed</h1>
          <Button
            data-testid="create-post-btn"
            onClick={() => setShowCreateModal(true)}
            className="rounded-full gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Post
          </Button>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Create the first one!</p>
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
                className="rounded-full"
              >
                Load More
              </Button>
            </div>
          )}
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

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, ChatCircle, ShareNetwork, Trash, PencilSimple } from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import api from '../api';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const PostCard = ({ post, onDelete, onUpdate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await api.delete(`/posts/${post.id}/like`);
        setIsLiked(false);
        setLikesCount(likesCount - 1);
      } else {
        await api.post(`/posts/${post.id}/like`);
        setIsLiked(true);
        setLikesCount(likesCount + 1);
      }
    } catch (err) {
      toast.error('Failed to like post');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('post.delete') + '?')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      toast.success(t('post.deleted'));
      onDelete?.(post.id);
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setLoadingComments(true);
    try {
      const res = await api.get(`/posts/${post.id}/comments`);
      setComments(res.data);
      setShowComments(true);
    } catch (err) {
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/posts/${post.id}/comments`, { content: commentText });
      setComments([res.data, ...comments]);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + `/post/${post.id}`);
      toast.success(t('post.linkCopied'));
    } catch (err) {
      toast.success(t('post.linkCopied'));
    }
  };

  const isOwner = user?.id === post.user_id;

  return (
    <Card data-testid={`post-card-${post.id}`} className="glass rounded-3xl border-border/40 hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar
            data-testid="post-author-avatar"
            className="w-12 h-12 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all"
            onClick={() => navigate(`/profile/${post.user?.id}`)}
          >
            <AvatarImage src={post.user?.avatar_url} alt="avatar" className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {post.user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p
                  data-testid="post-author-name"
                  className="font-semibold font-heading cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate(`/profile/${post.user?.id}`)}
                >
                  {post.user?.username}
                </p>
                <p data-testid="post-timestamp" className="text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              {isOwner && (
                <Button
                  data-testid="delete-post-btn"
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-destructive rounded-full hover:scale-110 transition-transform active:scale-95"
                >
                  <Trash size={18} weight="bold" />
                </Button>
              )}
            </div>

            <p data-testid="post-content" className="mt-3 text-foreground leading-relaxed">
              {post.content}
            </p>

            {post.media_url && (
              <div className="mt-4 rounded-2xl overflow-hidden">
                {post.media_type?.startsWith('image') ? (
                  <img
                    data-testid="post-media-image"
                    src={post.media_url}
                    alt="Post media"
                    className="w-full max-h-96 object-cover"
                  />
                ) : post.media_type?.startsWith('video') ? (
                  <video data-testid="post-media-video" controls className="w-full max-h-96">
                    <source src={post.media_url} type={post.media_type} />
                  </video>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <Button
                data-testid="like-post-btn"
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`gap-2 rounded-full hover:scale-110 transition-all active:scale-95 ${
                  isLiked ? 'text-red-500' : ''
                }`}
              >
                <Heart size={20} weight={isLiked ? 'fill' : 'bold'} className={isLiked ? 'heart-pop' : ''} />
                <span data-testid="post-likes-count" className="font-semibold">{likesCount}</span>
              </Button>

              <Button
                data-testid="comment-post-btn"
                variant="ghost"
                size="sm"
                onClick={loadComments}
                className="gap-2 rounded-full hover:scale-110 transition-all active:scale-95"
              >
                <ChatCircle size={20} weight="bold" />
                <span data-testid="post-comments-count" className="font-semibold">{post.comments_count}</span>
              </Button>

              <Button
                data-testid="share-post-btn"
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-2 rounded-full hover:scale-110 transition-all active:scale-95"
              >
                <ShareNetwork size={20} weight="bold" />
              </Button>
            </div>

            {showComments && (
              <div data-testid="comments-section" className="mt-4 space-y-4">
                <form onSubmit={handleComment} className="flex gap-2">
                  <input
                    data-testid="comment-input"
                    type="text"
                    placeholder={t('post.addComment')}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Button data-testid="submit-comment-btn" type="submit" size="sm" className="rounded-full">
                    {t('chat.send')}
                  </Button>
                </form>

                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} data-testid={`comment-${comment.id}`} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.user?.avatar_url} alt="avatar" className="object-cover" />
                        <AvatarFallback>{comment.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{comment.user?.username}</p>
                        <p className="text-sm text-foreground">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;

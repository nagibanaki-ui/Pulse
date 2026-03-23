import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Image, VideoCamera, X } from '@phosphor-icons/react';
import api from '../api';
import { toast } from 'sonner';

const CreatePostModal = ({ open, onOpenChange, onPostCreated }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaFile(file);
    setMediaType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        content,
        media_url: mediaPreview,
        media_type: mediaType,
      };

      const res = await api.post('/posts', postData);
      toast.success(t('post.created'));
      onPostCreated?.(res.data);
      setContent('');
      removeMedia();
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-post-modal" className="sm:max-w-[600px] glass rounded-3xl border-border/40">
        <DialogHeader>
          <DialogTitle className="text-3xl font-heading tracking-tight">{t('feed.createPost')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            data-testid="post-content-input"
            placeholder={t('post.whatsOnMind')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none rounded-2xl bg-muted/50 border-border focus:border-primary"
          />

          {mediaPreview && (
            <div className="relative rounded-2xl overflow-hidden">
              <Button
                data-testid="remove-media-btn"
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 rounded-full hover:scale-110 transition-transform"
                onClick={removeMedia}
              >
                <X size={20} weight="bold" />
              </Button>
              {mediaType?.startsWith('image') ? (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-80 object-cover" />
              ) : mediaType?.startsWith('video') ? (
                <video src={mediaPreview} controls className="w-full max-h-80" />
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                data-testid="upload-image-btn"
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full hover:scale-110 transition-transform"
                onClick={() => document.getElementById('image-upload').click()}
              >
                <Image size={20} weight="bold" />
              </Button>
              <Button
                data-testid="upload-video-btn"
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full hover:scale-110 transition-transform"
                onClick={() => document.getElementById('video-upload').click()}
              >
                <VideoCamera size={20} weight="bold" />
              </Button>

              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMediaSelect}
              />
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleMediaSelect}
              />
            </div>

            <Button
              data-testid="submit-post-btn"
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-full px-6 hover:scale-105 transition-transform active:scale-95"
            >
              {loading ? t('post.posting') : t('post.post')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Image, Video, X } from 'lucide-react';
import api from '../api';
import { toast } from 'sonner';

const CreatePostModal = ({ open, onOpenChange, onPostCreated }) => {
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
      toast.success('Post created!');
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
      <DialogContent data-testid="create-post-modal" className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">Create Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            data-testid="post-content-input"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none rounded-xl"
          />

          {mediaPreview && (
            <div className="relative rounded-xl overflow-hidden">
              <Button
                data-testid="remove-media-btn"
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10 rounded-full"
                onClick={removeMedia}
              >
                <X className="w-4 h-4" />
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
                className="rounded-full"
                onClick={() => document.getElementById('image-upload').click()}
              >
                <Image className="w-5 h-5" />
              </Button>
              <Button
                data-testid="upload-video-btn"
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => document.getElementById('video-upload').click()}
              >
                <Video className="w-5 h-5" />
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
              className="rounded-full px-6"
            >
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;

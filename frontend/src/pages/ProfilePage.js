import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserMinus, PencilSimple, Phone, VideoCamera, ChatCircle } from '@phosphor-icons/react';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import api from '../api';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data);
      if (isOwnProfile) {
        setEditData({ username: res.data.username, bio: res.data.bio || '' });
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (profile.is_following) {
        await api.delete(`/users/${userId}/unfollow`);
        setProfile({ ...profile, is_following: false, followers_count: profile.followers_count - 1 });
        toast.success(t('profile.unfollow'));
      } else {
        await api.post(`/users/${userId}/follow`);
        setProfile({ ...profile, is_following: true, followers_count: profile.followers_count + 1 });
        toast.success(t('profile.following'));
      }
    } catch (err) {
      toast.error('Failed to update follow status');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile({ ...profile, avatar_url: res.data.avatar_url });
      updateUser({ ...currentUser, avatar_url: res.data.avatar_url });
      toast.success(t('profile.avatarUpdated'));
    } catch (err) {
      toast.error('Failed to upload avatar');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', editData);
      setProfile({ ...profile, ...res.data });
      updateUser({ ...currentUser, ...res.data });
      setShowEditModal(false);
      toast.success(t('profile.updated'));
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const handleMessage = () => {
    navigate('/chat', { state: { userId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-12">
          <div className="glow-pulse inline-block">
            <p className="text-muted-foreground font-heading text-xl">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="profile-page" className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="glass rounded-3xl border-border/40">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="relative">
                <Avatar data-testid="profile-avatar" className="w-32 h-32 ring-4 ring-primary/20">
                  <AvatarImage src={profile.avatar_url} alt="avatar" className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                    {profile.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Button
                    data-testid="upload-avatar-btn"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full hover:scale-110 transition-transform"
                    onClick={() => document.getElementById('avatar-upload').click()}
                  >
                    <PencilSimple size={16} weight="bold" />
                  </Button>
                )}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 data-testid="profile-username" className="text-4xl font-bold font-heading tracking-tighter uppercase">
                      {profile.username}
                    </h1>
                    <p data-testid="profile-email" className="text-muted-foreground font-mono mt-1">
                      {profile.email}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <Button
                        data-testid="edit-profile-btn"
                        onClick={() => setShowEditModal(true)}
                        className="rounded-full gap-2 hover:scale-105 transition-transform"
                      >
                        <PencilSimple size={18} weight="bold" />
                        {t('profile.editProfile')}
                      </Button>
                    ) : (
                      <>
                        <Button
                          data-testid="follow-btn"
                          onClick={handleFollow}
                          variant={profile.is_following ? 'outline' : 'default'}
                          className="rounded-full gap-2 hover:scale-105 transition-transform"
                        >
                          {profile.is_following ? (
                            <>
                              <UserMinus size={18} weight="bold" />
                              {t('profile.unfollow')}
                            </>
                          ) : (
                            <>
                              <UserPlus size={18} weight="bold" />
                              {t('profile.follow')}
                            </>
                          )}
                        </Button>
                        <Button
                          data-testid="message-user-btn"
                          onClick={handleMessage}
                          variant="outline"
                          size="icon"
                          className="rounded-full hover:scale-110 transition-transform"
                        >
                          <ChatCircle size={20} weight="bold" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <p data-testid="profile-bio" className="mt-4 text-foreground leading-relaxed">
                  {profile.bio || t('profile.noBio')}
                </p>

                <div className="flex gap-6 mt-6">
                  <div data-testid="followers-count">
                    <span className="font-bold font-heading text-xl">{profile.followers_count || 0}</span>
                    <span className="text-muted-foreground ml-2">{t('profile.followers')}</span>
                  </div>
                  <div data-testid="following-count">
                    <span className="font-bold font-heading text-xl">{profile.following_count || 0}</span>
                    <span className="text-muted-foreground ml-2">{t('profile.following')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent data-testid="edit-profile-modal" className="sm:max-w-[500px] glass rounded-3xl border-border/40">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading tracking-tight">{t('profile.editProfile')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('auth.username')}
              </label>
              <Input
                data-testid="edit-username-input"
                type="text"
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                className="rounded-xl mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('profile.bio')}
              </label>
              <Textarea
                data-testid="edit-bio-input"
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                className="rounded-xl mt-2"
                rows={4}
              />
            </div>

            <Button
              data-testid="save-profile-btn"
              type="submit"
              className="w-full rounded-full hover:scale-105 transition-transform"
            >
              {t('profile.saveChanges')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Globe, Lock, Trash, ArrowLeft } from '@phosphor-icons/react';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import api from '../api';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'uk' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    toast.success(newLang === 'en' ? 'Language changed to English' : 'Мову змінено на українську');
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(isDark ? t('settings.lightTheme') : t('settings.darkTheme'));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('settings.passwordsNoMatch'));
      return;
    }

    try {
      await api.put('/settings/password', {
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      toast.success(t('settings.passwordChanged'));
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/settings/account');
      toast.success(t('settings.accountDeleted'));
      logout();
      navigate('/auth');
    } catch (err) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div data-testid="settings-page" className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            data-testid="back-btn"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:scale-110 transition-transform"
          >
            <ArrowLeft size={20} weight="bold" />
          </Button>
          <h1 className="text-5xl font-bold font-heading tracking-tighter uppercase">{t('settings.title')}</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance Settings */}
          <Card data-testid="appearance-card" className="glass rounded-3xl border-border/40">
            <CardHeader>
              <CardTitle className="text-2xl font-heading tracking-tight flex items-center gap-3">
                {isDark ? <Moon size={24} weight="bold" /> : <Sun size={24} weight="bold" />}
                {t('settings.appearance')}
              </CardTitle>
              <p className="text-muted-foreground">{t('settings.appearanceDesc')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t('settings.darkMode')}</p>
                  <p className="text-sm text-muted-foreground">
                    {isDark ? t('settings.darkTheme') : t('settings.lightTheme')}
                  </p>
                </div>
                <Button
                  data-testid="theme-toggle"
                  variant="outline"
                  size="icon"
                  onClick={handleThemeToggle}
                  className="rounded-full hover:scale-110 transition-transform"
                >
                  {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card data-testid="language-card" className="glass rounded-3xl border-border/40">
            <CardHeader>
              <CardTitle className="text-2xl font-heading tracking-tight flex items-center gap-3">
                <Globe size={24} weight="bold" />
                {t('settings.language')}
              </CardTitle>
              <p className="text-muted-foreground">{t('settings.languageDesc')}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {i18n.language === 'en' ? 'English' : 'Українська'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === 'en' ? 'English (US)' : 'Ukrainian'}
                  </p>
                </div>
                <Button
                  data-testid="language-toggle"
                  variant="outline"
                  onClick={toggleLanguage}
                  className="rounded-full gap-2 hover:scale-105 transition-transform"
                >
                  <Globe size={20} weight="bold" />
                  {i18n.language === 'en' ? 'УКР' : 'EN'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card data-testid="security-card" className="glass rounded-3xl border-border/40">
            <CardHeader>
              <CardTitle className="text-2xl font-heading tracking-tight flex items-center gap-3">
                <Lock size={24} weight="bold" />
                {t('settings.changePassword')}
              </CardTitle>
              <p className="text-muted-foreground">{t('settings.changePasswordDesc')}</p>
            </CardHeader>
            <CardContent>
              <Button
                data-testid="change-password-btn"
                onClick={() => setShowPasswordModal(true)}
                className="rounded-full hover:scale-105 transition-transform"
              >
                {t('settings.changePassword')}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card data-testid="danger-zone-card" className="glass rounded-3xl border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-2xl font-heading tracking-tight flex items-center gap-3 text-destructive">
                <Trash size={24} weight="bold" />
                {t('settings.dangerZone')}
              </CardTitle>
              <p className="text-muted-foreground">{t('settings.dangerZoneDesc')}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-destructive">{t('settings.deleteAccount')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.deleteAccountDesc')}</p>
                </div>
                <Button
                  data-testid="delete-account-btn"
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="rounded-full hover:scale-105 transition-transform"
                >
                  {t('settings.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent data-testid="password-modal" className="sm:max-w-[500px] glass rounded-3xl border-border/40">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading tracking-tight">{t('settings.changePassword')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('settings.currentPassword')}
              </label>
              <Input
                data-testid="current-password-input"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="rounded-xl mt-2"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('settings.newPassword')}
              </label>
              <Input
                data-testid="new-password-input"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="rounded-xl mt-2"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('settings.confirmPassword')}
              </label>
              <Input
                data-testid="confirm-password-input"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="rounded-xl mt-2"
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                data-testid="cancel-password-btn"
                type="button"
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 rounded-full"
              >
                {t('common.cancel')}
              </Button>
              <Button
                data-testid="save-password-btn"
                type="submit"
                className="flex-1 rounded-full hover:scale-105 transition-transform"
              >
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent data-testid="delete-account-modal" className="sm:max-w-[500px] glass rounded-3xl border-destructive/40">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading tracking-tight text-destructive">
              {t('settings.deleteAccount')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('settings.deleteAccountDesc')}
            </p>
            <p className="text-sm text-destructive font-semibold">
              This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-4">
              <Button
                data-testid="cancel-delete-btn"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-full"
              >
                {t('common.cancel')}
              </Button>
              <Button
                data-testid="confirm-delete-btn"
                variant="destructive"
                onClick={handleDeleteAccount}
                className="flex-1 rounded-full hover:scale-105 transition-transform"
              >
                {t('settings.delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
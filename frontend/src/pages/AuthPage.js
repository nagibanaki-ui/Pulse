import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Globe } from '@phosphor-icons/react';
import { toast } from 'sonner';

const AuthPage = () => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'uk' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success(t('auth.welcomeBack'));
      } else {
        await signup(username, email, password);
        toast.success(t('auth.accountCreated'));
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-secondary/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>

      <div data-testid="auth-card" className="w-full max-w-md relative">
        {/* Language toggle */}
        <div className="absolute -top-12 right-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="rounded-full gap-2 glass"
          >
            <Globe size={20} weight="bold" />
            {i18n.language === 'en' ? 'EN' : 'УКР'}
          </Button>
        </div>

        <div className="glass p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 glow-pulse shadow-xl">
              <span className="text-white font-bold text-4xl font-heading">F</span>
            </div>
            <h1 className="text-4xl font-bold font-heading tracking-tighter uppercase mb-2">
              {isLogin ? t('auth.welcome') : t('auth.joinUs')}
            </h1>
            <p className="text-muted-foreground">
              {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                  {t('auth.username')}
                </label>
                <Input
                  data-testid="username-input"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  className="mt-2 bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-3 focus:ring-0 text-lg"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('auth.email')}
              </label>
              <Input
                data-testid="email-input"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-3 focus:ring-0 text-lg"
              />
            </div>

            <div>
              <label className="text-sm font-medium font-mono uppercase tracking-wider opacity-60">
                {t('auth.password')}
              </label>
              <Input
                data-testid="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 bg-transparent border-b-2 border-border focus:border-primary rounded-none px-0 py-3 focus:ring-0 text-lg"
              />
            </div>

            <Button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-full py-6 text-lg font-bold tracking-wide hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all active:scale-95"
            >
              {loading ? t('common.loading') : isLogin ? t('auth.login') : t('auth.signup')}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
              <button
                data-testid="toggle-auth-mode-btn"
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-bold hover:underline transition-all hover:scale-105 inline-block"
              >
                {isLogin ? t('auth.signup') : t('auth.login')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

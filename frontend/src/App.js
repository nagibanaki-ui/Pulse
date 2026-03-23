import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import './i18n';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glow-pulse">
          <p className="text-muted-foreground font-heading text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glow-pulse">
          <p className="text-muted-foreground font-heading text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/" /> : children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <Routes>
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <FeedPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/search"
              element={
                <PrivateRoute>
                  <SearchPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <SettingsPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

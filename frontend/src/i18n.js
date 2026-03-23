import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Auth
      'auth.welcome': 'Welcome Back',
      'auth.joinUs': 'Join Us',
      'auth.loginSubtitle': 'Login to your account',
      'auth.signupSubtitle': 'Create a new account',
      'auth.username': 'Username',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.login': 'Login',
      'auth.signup': 'Sign Up',
      'auth.noAccount': "Don't have an account?",
      'auth.haveAccount': 'Already have an account?',
      'auth.welcomeBack': 'Welcome back!',
      'auth.accountCreated': 'Account created!',
      
      // Navigation
      'nav.home': 'Home',
      'nav.chat': 'Chat',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      'nav.search': 'Search',
      'nav.logout': 'Logout',
      
      // Feed
      'feed.title': 'Feed',
      'feed.createPost': 'Create Post',
      'feed.loading': 'Loading posts...',
      'feed.noPosts': 'No posts yet. Create the first one!',
      'feed.loadMore': 'Load More',
      
      // Post
      'post.whatsOnMind': "What's on your mind?",
      'post.created': 'Post created!',
      'post.deleted': 'Post deleted',
      'post.uploadImage': 'Upload Image',
      'post.uploadVideo': 'Upload Video',
      'post.posting': 'Posting...',
      'post.post': 'Post',
      'post.delete': 'Delete',
      'post.edit': 'Edit',
      'post.like': 'Like',
      'post.comment': 'Comment',
      'post.share': 'Share',
      'post.addComment': 'Add a comment...',
      'post.linkCopied': 'Link copied!',
      
      // Profile
      'profile.editProfile': 'Edit Profile',
      'profile.follow': 'Follow',
      'profile.unfollow': 'Unfollow',
      'profile.following': 'Following',
      'profile.followers': 'Followers',
      'profile.noBio': 'No bio yet',
      'profile.saveChanges': 'Save Changes',
      'profile.bio': 'Bio',
      'profile.updated': 'Profile updated',
      'profile.avatarUpdated': 'Avatar updated',
      'profile.message': 'Message',
      
      // Search
      'search.title': 'Search Users',
      'search.placeholder': 'Search by username...',
      'search.searching': 'Searching...',
      'search.noResults': 'No users found',
      'search.enterUsername': 'Enter a username to search',
      
      // Chat
      'chat.messages': 'Messages',
      'chat.noConversations': 'No conversations yet',
      'chat.selectConversation': 'Select a conversation to start messaging',
      'chat.typeMessage': 'Type a message...',
      'chat.send': 'Send',
      'chat.audioCall': 'Audio Call',
      'chat.videoCall': 'Video Call',
      'chat.endCall': 'End Call',
      'chat.calling': 'Calling...',
      'chat.incomingCall': 'Incoming call...',
      'chat.accept': 'Accept',
      'chat.decline': 'Decline',
      'chat.you': 'You',
      
      // Settings
      'settings.title': 'Settings',
      'settings.appearance': 'Appearance',
      'settings.appearanceDesc': 'Customize how the app looks',
      'settings.darkMode': 'Dark Mode',
      'settings.lightTheme': 'Light theme enabled',
      'settings.darkTheme': 'Dark theme enabled',
      'settings.language': 'Language',
      'settings.languageDesc': 'Choose your preferred language',
      'settings.changePassword': 'Change Password',
      'settings.changePasswordDesc': 'Update your account password',
      'settings.currentPassword': 'Current Password',
      'settings.newPassword': 'New Password',
      'settings.confirmPassword': 'Confirm New Password',
      'settings.passwordChanged': 'Password changed successfully',
      'settings.passwordsNoMatch': 'Passwords do not match',
      'settings.dangerZone': 'Danger Zone',
      'settings.dangerZoneDesc': 'Irreversible actions',
      'settings.deleteAccount': 'Delete Account',
      'settings.deleteAccountDesc': 'Permanently delete your account and all data',
      'settings.delete': 'Delete',
      'settings.accountDeleted': 'Account deleted',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.close': 'Close',
    },
  },
  uk: {
    translation: {
      // Auth
      'auth.welcome': 'З поверненням',
      'auth.joinUs': 'Приєднуйтесь',
      'auth.loginSubtitle': 'Увійдіть у свій акаунт',
      'auth.signupSubtitle': 'Створіть новий акаунт',
      'auth.username': "Ім'я користувача",
      'auth.email': 'Електронна пошта',
      'auth.password': 'Пароль',
      'auth.login': 'Увійти',
      'auth.signup': 'Зареєструватися',
      'auth.noAccount': 'Немає акаунту?',
      'auth.haveAccount': 'Вже є акаунт?',
      'auth.welcomeBack': 'З поверненням!',
      'auth.accountCreated': 'Акаунт створено!',
      
      // Navigation
      'nav.home': 'Головна',
      'nav.chat': 'Чат',
      'nav.profile': 'Профіль',
      'nav.settings': 'Налаштування',
      'nav.search': 'Пошук',
      'nav.logout': 'Вийти',
      
      // Feed
      'feed.title': 'Стрічка',
      'feed.createPost': 'Створити пост',
      'feed.loading': 'Завантаження постів...',
      'feed.noPosts': 'Поки що немає постів. Створіть перший!',
      'feed.loadMore': 'Завантажити ще',
      
      // Post
      'post.whatsOnMind': 'Що у вас на думці?',
      'post.created': 'Пост створено!',
      'post.deleted': 'Пост видалено',
      'post.uploadImage': 'Завантажити зображення',
      'post.uploadVideo': 'Завантажити відео',
      'post.posting': 'Публікація...',
      'post.post': 'Опублікувати',
      'post.delete': 'Видалити',
      'post.edit': 'Редагувати',
      'post.like': 'Вподобати',
      'post.comment': 'Коментар',
      'post.share': 'Поділитися',
      'post.addComment': 'Додати коментар...',
      'post.linkCopied': 'Посилання скопійовано!',
      
      // Profile
      'profile.editProfile': 'Редагувати профіль',
      'profile.follow': 'Підписатися',
      'profile.unfollow': 'Відписатися',
      'profile.following': 'Підписки',
      'profile.followers': 'Підписники',
      'profile.noBio': 'Поки що немає біографії',
      'profile.saveChanges': 'Зберегти зміни',
      'profile.bio': 'Біографія',
      'profile.updated': 'Профіль оновлено',
      'profile.avatarUpdated': 'Аватар оновлено',
      'profile.message': 'Повідомлення',
      
      // Search
      'search.title': 'Пошук користувачів',
      'search.placeholder': "Пошук за ім'ям користувача...",
      'search.searching': 'Пошук...',
      'search.noResults': 'Користувачів не знайдено',
      'search.enterUsername': "Введіть ім'я користувача для пошуку",
      
      // Chat
      'chat.messages': 'Повідомлення',
      'chat.noConversations': 'Поки що немає розмов',
      'chat.selectConversation': 'Виберіть розмову для початку спілкування',
      'chat.typeMessage': 'Введіть повідомлення...',
      'chat.send': 'Відправити',
      'chat.audioCall': 'Аудіодзвінок',
      'chat.videoCall': 'Відеодзвінок',
      'chat.endCall': 'Завершити дзвінок',
      'chat.calling': 'Дзвінок...',
      'chat.incomingCall': 'Вхідний дзвінок...',
      'chat.accept': 'Прийняти',
      'chat.decline': 'Відхилити',
      'chat.you': 'Ви',
      
      // Settings
      'settings.title': 'Налаштування',
      'settings.appearance': 'Зовнішній вигляд',
      'settings.appearanceDesc': 'Налаштуйте вигляд додатку',
      'settings.darkMode': 'Темна тема',
      'settings.lightTheme': 'Світла тема увімкнена',
      'settings.darkTheme': 'Темна тема увімкнена',
      'settings.language': 'Мова',
      'settings.languageDesc': 'Виберіть бажану мову',
      'settings.changePassword': 'Змінити пароль',
      'settings.changePasswordDesc': 'Оновіть пароль акаунту',
      'settings.currentPassword': 'Поточний пароль',
      'settings.newPassword': 'Новий пароль',
      'settings.confirmPassword': 'Підтвердіть новий пароль',
      'settings.passwordChanged': 'Пароль успішно змінено',
      'settings.passwordsNoMatch': 'Паролі не співпадають',
      'settings.dangerZone': 'Небезпечна зона',
      'settings.dangerZoneDesc': 'Незворотні дії',
      'settings.deleteAccount': 'Видалити акаунт',
      'settings.deleteAccountDesc': 'Назавжди видалити ваш акаунт і всі дані',
      'settings.delete': 'Видалити',
      'settings.accountDeleted': 'Акаунт видалено',
      
      // Common
      'common.loading': 'Завантаження...',
      'common.error': 'Помилка',
      'common.success': 'Успіх',
      'common.cancel': 'Скасувати',
      'common.save': 'Зберегти',
      'common.close': 'Закрити',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

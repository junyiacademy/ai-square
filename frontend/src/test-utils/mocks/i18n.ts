/**
 * i18n Mock
 * 統一的翻譯 mock，支援多語言測試
 */

// 預設翻譯字典
export const defaultTranslations: Record<string, Record<string, string>> = {
  common: {
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.submit': 'Submit',
    'button.delete': 'Delete',
    'button.edit': 'Edit',
    'button.close': 'Close',
    'button.back': 'Back',
    'button.next': 'Next',
    'button.continue': 'Continue',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Info',
    'zoomIn': 'Zoom in',
    'zoomOut': 'Zoom out',
    'resetZoom': 'Reset zoom',
    // Auth-related translations
    'email': 'Email',
    'password': 'Password',
    'login': 'Login',
    'loginTitle': 'Sign in to AI Square',
    'error.invalidCredentials': 'Invalid email or password',
    'error.networkError': 'Network error, please try again',
    'testAccounts.title': 'Test Accounts',
    'testAccounts.student': 'Student: student@example.com / student123',
    'testAccounts.teacher': 'Teacher: teacher@example.com / teacher123',
    'testAccounts.admin': 'Admin: admin@example.com / admin123',
  },
  navigation: {
    'home': 'Home',
    'dashboard': 'Dashboard',
    'profile': 'Profile',
    'settings': 'Settings',
    'logout': 'Logout',
    'login': 'Login',
  },
  graph: {
    'zoom_in': 'Zoom In',
    'zoom_out': 'Zoom Out',
    'reset_view': 'Reset View',
    'show_table_view': 'Show Table',
    'show_graph_view': 'Show Graph',
    'competency_knowledge_graph': 'Competency Knowledge Graph',
  },
  assessment: {
    'title': 'Assessment',
    'start': 'Start Assessment',
    'complete': 'Complete Assessment',
    'results': 'Results',
    'score': 'Score',
    'time_spent': 'Time Spent',
  },
  pbl: {
    'title': 'Problem-Based Learning',
    'scenarios': 'Scenarios',
    'tasks': 'Tasks',
    'progress': 'Progress',
    'feedback': 'Feedback',
  },
  discovery: {
    'title': 'Discovery',
    'exploration': 'Exploration',
    'career_paths': 'Career Paths',
    'skills': 'Skills',
  },
  ksa: {
    'excellent': 'Excellent',
    'good': 'Good',
    'needsWork': 'Needs Work',
    'graphInstructions': 'Click nodes to see details',
    'knowledgeComponent': 'Knowledge Component',
    'skillsComponent': 'Skills Component',
    'attitudesComponent': 'Attitudes Component',
  },
  auth: {
    'email': 'Email',
    'password': 'Password',
    'login': 'Login',
    'loading': 'Signing in...',
    'loginTitle': 'Sign in to AI Square',
    'error.invalidCredentials': 'Invalid email or password',
    'error.networkError': 'Network error, please try again',
    'testAccounts.title': 'Test Accounts',
    'testAccounts.student': 'Student: student@example.com / student123',
    'testAccounts.teacher': 'Teacher: teacher@example.com / teacher123',
    'testAccounts.admin': 'Admin: admin@example.com / admin123',
    // Register page translations
    'register.title': 'Create Account',
    'register.subtitle': 'Already have an account?',
    'register.signIn': 'Sign in',
    'register.name': 'Full Name',
    'register.namePlaceholder': 'Enter your full name',
    'register.email': 'Email Address',
    'register.emailPlaceholder': 'Enter your email',
    'register.password': 'Password',
    'register.passwordPlaceholder': 'Create a password',
    'register.confirmPassword': 'Confirm Password',
    'register.confirmPasswordPlaceholder': 'Confirm your password',
    'register.agreeToTerms': 'I agree to the',
    'register.termsOfService': 'Terms of Service',
    'register.and': 'and',
    'register.privacyPolicy': 'Privacy Policy',
    'register.createAccount': 'Create Account',
    'register.orContinueWith': 'Or continue with',
    'register.success.accountCreated': 'Account created successfully!',
    'register.success.loggingIn': 'Logging you in...',
    'register.success.redirecting': 'Redirecting...',
    'register.errors.nameRequired': 'Full name is required',
    'register.errors.emailRequired': 'Email is required',
    'register.errors.emailInvalid': 'Please enter a valid email',
    'register.errors.passwordRequired': 'Password is required',
    'register.errors.passwordTooShort': 'Password must be at least 8 characters',
    'register.errors.passwordMismatch': 'Passwords do not match',
    'register.errors.termsRequired': 'You must accept the terms',
    'register.errors.registrationFailed': 'Registration failed',
    'register.errors.networkError': 'Network error occurred',
  },
};

// 翻譯函數 mock
export const createTranslationMock = (customTranslations?: Record<string, Record<string, string>>, defaultNamespace = 'common') => {
  const translations = { ...defaultTranslations, ...customTranslations };

  return (key: string, options?: any) => {
    // 支援 namespace:key 格式
    const [namespace, actualKey] = key.includes(':') ? key.split(':') : [defaultNamespace, key];

    // 支援 namespace.key 格式（點號分隔）
    const dotParts = key.split('.');
    let translation;

    if (dotParts.length > 1) {
      // 嘗試使用點號格式查找
      translation = translations[namespace]?.[key] ||
                   translations[dotParts[0]]?.[dotParts.slice(1).join('.')] ||
                   translations[dotParts[0]]?.[dotParts[1]] ||
                   translations[defaultNamespace]?.[key] ||
                   key;
    } else {
      // 使用冒號格式或直接查找
      translation = translations[namespace]?.[actualKey] ||
                   translations[defaultNamespace]?.[actualKey] ||
                   translations.common?.[actualKey] ||
                   key;
    }

    // 處理插值
    if (options && typeof translation === 'string') {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => options[param] || match);
    }

    return translation;
  };
};

// Mock useTranslation hook
export const mockUseTranslation = (customTranslations?: Record<string, Record<string, string>>, namespace?: string) => ({
  t: createTranslationMock(customTranslations, namespace),
  i18n: {
    language: 'en',
    changeLanguage: jest.fn(),
    languages: ['en', 'zh', 'es', 'pt', 'ar', 'id', 'th', 'ja', 'ko', 'fr', 'de', 'ru', 'it'],
    isInitialized: true,
    resolvedLanguage: 'en',
    options: {},
  },
  ready: true,
});

// 設定當前語言
let currentLanguage = 'en';

export const setMockLanguage = (language: string) => {
  currentLanguage = language;
};

export const getMockLanguage = () => currentLanguage;

// Export for use in jest.setup.js global mock
// Individual test files can import { createTranslationMock } to create custom mocks if needed

// Default export for i18n mock
const i18n = {
  language: 'en',
  changeLanguage: jest.fn((lang: string) => {
    currentLanguage = lang;
    return Promise.resolve();
  }),
  languages: ['en', 'zh', 'es', 'pt', 'ar', 'id', 'th', 'ja', 'ko', 'fr', 'de', 'ru', 'it'],
  isInitialized: true,
  resolvedLanguage: 'en',
  options: {},
  t: createTranslationMock(),
  use: jest.fn(),
  init: jest.fn(),
};

export default i18n;

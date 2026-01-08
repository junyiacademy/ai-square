// Mock for react-i18next
export const useTranslation = () => {
  return {
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(() => Promise.resolve()),
      language: "en",
      languages: ["en", "zhTW", "zhCN"],
    },
    ready: true,
  };
};

export const Trans = ({ children }: { children: React.ReactNode }) => children;

export const initReactI18next = {
  type: "3rdParty",
  init: jest.fn(),
};

export const I18nextProvider = ({ children }: { children: React.ReactNode }) =>
  children;

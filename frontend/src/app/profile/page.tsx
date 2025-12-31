"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  preferredLanguage: string;
  emailVerified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(["common", "auth"]);
  const { user, isLoading: authLoading } = useAuth();

  // 支援的語言列表
  const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "zhTW", name: "繁體中文" },
    { code: "zhCN", name: "简体中文" },
    // Temporarily disabled languages:
    // { code: 'es', name: 'Español' },
    // { code: 'fr', name: 'Français' },
    // { code: 'de', name: 'Deutsch' },
    // { code: 'ja', name: '日本語' },
    // { code: 'ko', name: '한국어' },
    // { code: 'pt', name: 'Português' },
    // { code: 'ru', name: 'Русский' },
    // { code: 'ar', name: 'العربية' },
    // { code: 'hi', name: 'हिन्दी' },
    // { code: 'id', name: 'Bahasa Indonesia' },
    // { code: 'it', name: 'Italiano' },
  ];
  const supportedLanguageCodes = supportedLanguages.map(
    (language) => language.code,
  );
  const fallbackLanguage = supportedLanguages[0].code;
  const normalizeLanguage = (languageCode?: string | null) =>
    languageCode && supportedLanguageCodes.includes(languageCode)
      ? languageCode
      : fallbackLanguage;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(fallbackLanguage);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const response = await authenticatedFetch("/api/auth/profile");
      const data = await response.json();

      if (data.success) {
        setProfile(data.user);
        setName(data.user.name || "");
        const updatedLanguage = normalizeLanguage(data.user.preferredLanguage);
        setPreferredLanguage(updatedLanguage);
        if (updatedLanguage !== i18n.language) {
          await i18n.changeLanguage(updatedLanguage);
        }
      } else {
        setError(data.error || "Failed to load profile");
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 驗證密碼
    if (showPasswordSection && newPassword) {
      if (newPassword !== confirmPassword) {
        setError(t("auth:resetPassword.passwordMismatch"));
        return;
      }
      if (!currentPassword) {
        setError(t("profile.currentPasswordRequired"));
        return;
      }
    }

    setIsSaving(true);

    try {
      const updates: Record<string, unknown> = {};

      // 只發送有變更的欄位
      if (name !== profile?.name) updates.name = name;
      if (preferredLanguage !== profile?.preferredLanguage) {
        updates.preferredLanguage = preferredLanguage;
      }
      if (showPasswordSection && newPassword) {
        updates.currentPassword = currentPassword;
        updates.newPassword = newPassword;
      }

      const response = await authenticatedFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t("profile.updateSuccess"));
        setProfile(data.user);

        // 如果更改了語言，立即切換
        if (preferredLanguage !== profile?.preferredLanguage) {
          i18n.changeLanguage(preferredLanguage);
        }

        // 清空密碼欄位
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordSection(false);
      } else {
        setError(data.error || t("profile.updateError"));
      }
    } catch {
      setError(t("profile.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setSuccess("");
    setIsResending(true);

    try {
      const response = await authenticatedFetch(
        "/api/auth/resend-verification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // Session will be used
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess(t("profile.verificationEmailSent"));
      } else {
        setError(data.error || t("profile.resendError"));
      }
    } catch {
      setError(t("profile.resendError"));
    } finally {
      setIsResending(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t("profile.title")}
          </h1>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本資訊區塊 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {t("profile.basicInfo")}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("auth:email")}
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                {!profile.emailVerified && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      {t("profile.emailNotVerified")}
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending
                        ? t("profile.resending")
                        : t("profile.resendVerification")}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("profile.name")}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("profile.preferredLanguage")}
                </label>
                <select
                  id="language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("profile.accountType")}
                </label>
                <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>

            {/* 密碼變更區塊 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {t("profile.security")}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {showPasswordSection
                    ? t("profile.cancel")
                    : t("profile.changePassword")}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t("profile.currentPassword")}
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t("auth:newPassword")}
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t("auth:confirmPassword")}
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      minLength={8}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 帳號資訊 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("profile.memberSince")}:{" "}
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* 提交按鈕 */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? t("profile.saving") : t("profile.saveChanges")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

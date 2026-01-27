"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LoginForm } from "@/components/auth/LoginForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { useAuth } from "@/contexts/AuthContext";

function LoginContent() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const redirectPath = searchParams.get("redirect") || "/pbl/scenarios";

  useEffect(() => {
    // 檢查是否因為 token 過期而被重定向
    try {
      if (searchParams.get("expired") === "true") {
        setInfo(
          t(
            "info.sessionExpired",
            "Your session has expired. Please login again.",
          ),
        );
      }
    } catch (e) {
      console.error("Error checking search params:", e);
    }
  }, [searchParams, t]);

  const handleLogin = async (credentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => {
    console.log("handleLogin called with:", credentials);
    setLoading(true);
    setError("");

    try {
      // Use AuthContext login method which handles all state updates
      console.log("Calling login method...");
      const result = await login(credentials);
      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful, preparing to navigate...");

        // Always redirect to PBL scenarios after login for consistent UX
        // Ignore any redirect parameters to avoid middleware interference
        console.log(
          "Login successful, ignoring redirect params and navigating to: /pbl/scenarios",
        );

        // Navigate to PBL scenarios directly - consistent UX
        router.push("/pbl/scenarios");
        router.refresh();

        // Fallback: Force navigation if router.push doesn't work
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log(
              "Router navigation fallback: forcing redirect to PBL scenarios",
            );
            window.location.href = "/pbl/scenarios";
          }
        }, 500);
      } else {
        // 顯示錯誤訊息
        console.log("Login failed:", result.error);
        setError(result.error || t("error.invalidCredentials"));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t("error.networkError"));
    } finally {
      console.log("Login process complete, loading:", false);
      setLoading(false);
    }
  };

  const handleGuestLogin = async (nickname?: string) => {
    console.log("handleGuestLogin called with nickname:", nickname);
    setGuestLoading(true);
    setError("");
    setShowNicknameModal(false);

    try {
      const response = await fetch("/api/auth/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname?.trim() || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("Guest login successful:", data.user);
        // Use window.location.href to force full page reload
        // This ensures AuthContext reinitializes with the new session
        window.location.href = "/pbl/scenarios";
      } else {
        setError(
          data.error ||
            t("error.guestLoginFailed", "Failed to create guest account"),
        );
      }
    } catch (err) {
      console.error("Guest login error:", err);
      setError(t("error.networkError"));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0363A7]/5 to-[#0363A7]/10 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 標題區域 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-[#0363A7] rounded-xl flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {t("loginTitle")}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{t("platformSubtitle")}</p>
        </div>

        {/* 註冊連結 - 移到最上方 */}
        <div className="bg-[#0363A7]/5 rounded-lg p-4 text-center space-y-2">
          <p className="text-sm text-gray-700">
            {t("dontHaveAccount", "Don't have an account?")}{" "}
            <a
              href={
                searchParams.get("redirect")
                  ? `/register?redirect=${encodeURIComponent(searchParams.get("redirect")!)}`
                  : "/register"
              }
              className="font-semibold text-[#0363A7] hover:text-[#0363A7]/80 underline"
            >
              {t("createAccount", "Create one")}
            </a>
          </p>
          <p className="text-xs text-gray-600">
            {t(
              "emailRegistrationHint",
              "Please register with your email to start exploring the world of AI Square",
            )}
          </p>
        </div>

        {/* 登入表單區域 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {info && (
            <div className="mb-4 p-3 bg-[#0363A7]/5 text-[#0363A7] rounded-lg text-sm">
              {info}
            </div>
          )}
          <OAuthButtons redirectPath={redirectPath} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t("or", "或")}
              </span>
            </div>
          </div>
          <LoginForm onSubmit={handleLogin} loading={loading} error={error} />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t("or", "或")}
              </span>
            </div>
          </div>

          {/* Guest Login Button */}
          <button
            onClick={() => setShowNicknameModal(true)}
            disabled={guestLoading || loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-full text-sm font-medium text-white bg-[#EC6C1F] hover:bg-[#EC6C1F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EC6C1F] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {guestLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t("guestLoginLoading", "正在創建訪客帳號...")}
              </>
            ) : (
              <>🚀 {t("guestLoginButton", "立即開始體驗")}</>
            )}
          </button>
          <p className="mt-2 text-xs text-center text-gray-500">
            {t("guestLoginHint", "無需註冊，立即探索 AI Square")}
          </p>
        </div>

        {/* Nickname Modal */}
        {showNicknameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full relative">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {t("guestNicknameTitle", "歡迎！")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {t(
                  "guestNicknameDescription",
                  "請輸入你的暱稱（可選），讓我們更好地稱呼你",
                )}
              </p>
              <input
                type="text"
                id="guest-nickname"
                maxLength={20}
                placeholder={t("nicknamePlaceholder", "例如：小明")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0363A7] mb-4"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    const nickname = (e.target as HTMLInputElement).value;
                    handleGuestLogin(nickname);
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNicknameModal(false);
                    handleGuestLogin();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t("skip", "跳過")}
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById(
                      "guest-nickname",
                    ) as HTMLInputElement;
                    handleGuestLogin(input?.value);
                  }}
                  className="flex-1 px-4 py-2 bg-[#0363A7] text-white rounded-full text-sm font-medium hover:bg-[#0363A7]/90 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {t("startExperience", "開始體驗")}
                </button>
              </div>
              <button
                onClick={() => setShowNicknameModal(false)}
                className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0363A7]/5 to-[#0363A7]/10 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Image from "next/image";

export default function ResendVerificationPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t: _t } = useTranslation(["auth", "common"]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("請輸入電子郵件地址");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "already_verified") {
          setAlreadyVerified(true);
          setError("");
        } else {
          setSuccess(true);
          setError("");
        }
      } else {
        setError("發送失敗，請稍後再試");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center mb-4">
              <Image
                src="/images/logo.png"
                alt="AI Square Logo"
                width={48}
                height={48}
                className="rounded-xl"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              驗證郵件已發送
            </h2>
            <div className="mt-4 space-y-3">
              <p className="text-gray-600 dark:text-gray-400">
                請檢查您的電子郵件收件箱，點擊驗證連結完成帳戶驗證
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  📧 收信提醒
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 請檢查垃圾郵件資料夾</li>
                  <li>• 郵件可能需要 1-2 分鐘送達</li>
                  <li>• 如果 5 分鐘後仍未收到，請再次嘗試</li>
                  <li>
                    • 確認電子郵件地址是否正確：
                    <span className="font-mono">{email}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                setSuccess(false);
                setAlreadyVerified(false);
                setError("");
              }}
              className="w-full flex justify-center py-3 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-500 dark:hover:bg-gray-700"
            >
              重新發送驗證郵件
            </button>
            <Link
              href="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              返回登入頁面
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-emerald-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center mb-4">
              <Image
                src="/images/logo.png"
                alt="AI Square Logo"
                width={48}
                height={48}
                className="rounded-xl"
                priority
              />
            </div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              帳戶已驗證
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              您的電子郵件地址{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {email}
              </span>{" "}
              已經通過驗證！
            </p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              您可以直接登入使用平台的所有功能。
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Link
              href="/login"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              前往登入
            </Link>
            <Link
              href="/"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center mb-4">
            <Image
              src="/images/logo.png"
              alt="AI Square Logo"
              width={48}
              height={48}
              className="rounded-xl"
              priority
            />
          </div>
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            重發驗證郵件
          </h2>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            輸入您的電子郵件地址，我們將重新發送驗證郵件
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              電子郵件地址
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="輸入您的電子郵件地址"
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  發送中...
                </>
              ) : (
                "重發驗證郵件"
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              返回登入頁面
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

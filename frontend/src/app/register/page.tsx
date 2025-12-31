"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import Image from "next/image";

function RegisterContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation(["auth", "common"]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    preferredLanguage: "en",
  });
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t("auth:register.errors.nameRequired");
    }

    if (!formData.email.trim()) {
      newErrors.email = t("auth:register.errors.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("auth:register.errors.emailInvalid");
    }

    if (!formData.password) {
      newErrors.password = t("auth:register.errors.passwordRequired");
    } else if (formData.password.length < 8) {
      newErrors.password = t("auth:register.errors.passwordTooShort");
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("auth:register.errors.passwordMismatch");
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = t("auth:register.errors.termsRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          preferredLanguage: formData.preferredLanguage,
          acceptTerms: formData.acceptTerms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Keep email for reference in success display
        const registeredEmail = formData.email;

        // Clear form
        setFormData({
          name: "",
          email: registeredEmail, // Keep email for resend functionality
          password: "",
          confirmPassword: "",
          acceptTerms: false,
          preferredLanguage: "en",
        });

        // Show success - email is kept in formData for display
        setSuccessMessage("success");
        setErrors({});

        // Don't try to auto-login since email is not verified yet
        // The user will be redirected to login page after email verification
      } else {
        setErrors({
          submit: data.error || t("auth:register.errors.registrationFailed"),
        });
      }
    } catch {
      setErrors({ submit: t("auth:register.errors.networkError") });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setErrors({ submit: "Please enter your email address first" });
      return;
    }

    setResendingVerification(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setSuccessMessage("success"); // Use same success state to show enhanced message
        setErrors({});
      } else {
        setErrors({
          submit: "Failed to send verification email. Please try again.",
        });
      }
    } catch {
      setErrors({ submit: "Network error. Please try again." });
    } finally {
      setResendingVerification(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t("auth:register.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t("auth:register.subtitle")}{" "}
            <Link
              href={
                searchParams.get("redirect")
                  ? `/login?redirect=${encodeURIComponent(searchParams.get("redirect")!)}`
                  : "/login"
              }
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t("auth:register.signIn")}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth:register.name")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.name
                    ? "border-red-300"
                    : "border-gray-300 dark:border-gray-700"
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-slate-800`}
                placeholder={t("auth:register.namePlaceholder")}
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth:register.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email
                    ? "border-red-300"
                    : "border-gray-300 dark:border-gray-700"
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-slate-800`}
                placeholder={t("auth:register.emailPlaceholder")}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth:register.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password
                    ? "border-red-300"
                    : "border-gray-300 dark:border-gray-700"
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-slate-800`}
                placeholder={t("auth:register.passwordPlaceholder")}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth:register.confirmPassword")}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword
                    ? "border-red-300"
                    : "border-gray-300 dark:border-gray-700"
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-slate-800`}
                placeholder={t("auth:register.confirmPasswordPlaceholder")}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {successMessage && (
            <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 p-6 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-800">
                    <svg
                      className="h-6 w-6 text-green-600 dark:text-green-400 animate-pulse"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    Registration Successful! 🎉
                  </h3>
                  <p className="text-green-800 dark:text-green-200 mb-3">
                    We&apos;ve sent a verification email to:
                  </p>
                  <p className="font-mono text-base bg-white dark:bg-gray-800 px-3 py-2 rounded-md text-gray-900 dark:text-gray-100 mb-4 inline-block">
                    {formData.email}
                  </p>

                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                      📧 Next Steps:
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Check your email inbox for our verification message
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        Click the verification link in the email
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        You&apos;ll be redirected to login once verified
                      </li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Can&apos;t find the email?</strong> Check your
                      spam folder or wait 1-2 minutes for delivery.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-green-400 dark:border-green-500 dark:hover:bg-gray-700"
                    >
                      {resendingVerification ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                          Sending...
                        </>
                      ) : (
                        "Resend Verification Email"
                      )}
                    </button>

                    <Link
                      href="/login"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Go to Login Page
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {errors.submit}
                  </p>
                  {(errors.submit.includes("Email already exists") ||
                    errors.submit.includes("already exists") ||
                    errors.submit.includes("already registered") ||
                    errors.submit.includes("Email already")) && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingVerification || !formData.email}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendingVerification ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700"
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
                            Sending...
                          </>
                        ) : (
                          "Resend verification email"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="acceptTerms"
                className="font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth:register.agreeToTerms")}{" "}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  {t("auth:register.termsOfService")}
                </a>{" "}
                {t("auth:register.and")}{" "}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  {t("auth:register.privacyPolicy")}
                </a>
              </label>
              {errors.acceptTerms && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.acceptTerms}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !!successMessage}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  {t("common:loading")}
                </div>
              ) : successMessage ? (
                <span className="opacity-75">Registration Complete</span>
              ) : (
                t("auth:register.createAccount")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />
      }
    >
      <RegisterContent />
    </Suspense>
  );
}

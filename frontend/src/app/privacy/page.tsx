"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation(["legal"]);
  const lastUpdated = "2025-06-30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("privacy.title", "Privacy Policy")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("privacy.lastUpdated", "Last updated")}: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <p className="text-gray-700 dark:text-gray-300">
                {t(
                  "privacy.intro",
                  'AI Square ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI literacy education platform.',
                )}
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.infoCollect.title", "1. Information We Collect")}
              </h2>

              <h3 className="text-xl font-medium mb-3">
                {t("privacy.infoCollect.personal", "Personal Information")}
              </h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>{t("privacy.infoCollect.email", "Email address")}</li>
                <li>{t("privacy.infoCollect.name", "Name (optional)")}</li>
                <li>
                  {t(
                    "privacy.infoCollect.role",
                    "User role (student, teacher, admin)",
                  )}
                </li>
                <li>
                  {t("privacy.infoCollect.language", "Language preference")}
                </li>
              </ul>

              <h3 className="text-xl font-medium mb-3">
                {t("privacy.infoCollect.usage", "Usage Data")}
              </h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>
                  {t(
                    "privacy.infoCollect.learning",
                    "Learning progress and assessment results",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.infoCollect.interactions",
                    "Interactions with AI tutors",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.infoCollect.scenarios",
                    "PBL scenario completion data",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.infoCollect.analytics",
                    "Platform usage analytics",
                  )}
                </li>
              </ul>

              <h3 className="text-xl font-medium mb-3">
                {t("privacy.infoCollect.technical", "Technical Data")}
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {t("privacy.infoCollect.browser", "Browser type and version")}
                </li>
                <li>{t("privacy.infoCollect.device", "Device information")}</li>
                <li>
                  {t("privacy.infoCollect.ip", "IP address (anonymized)")}
                </li>
                <li>
                  {t("privacy.infoCollect.timezone", "Time zone settings")}
                </li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.howUse.title", "2. How We Use Your Information")}
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {t(
                    "privacy.howUse.provide",
                    "To provide and maintain our service",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.howUse.personalize",
                    "To personalize your learning experience",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.howUse.communicate",
                    "To communicate with you about your account",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.howUse.improve",
                    "To improve our platform and develop new features",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.howUse.analyze",
                    "To analyze usage patterns and optimize performance",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.howUse.security",
                    "To detect and prevent security threats",
                  )}
                </li>
              </ul>
            </section>

            {/* Data Storage and Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.storage.title", "3. Data Storage and Security")}
              </h2>
              <p className="mb-4">
                {t(
                  "privacy.storage.location",
                  "Your data is stored securely on Google Cloud Platform servers. We implement appropriate technical and organizational measures to protect your personal information.",
                )}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {t(
                    "privacy.storage.encryption",
                    "Data encryption in transit and at rest",
                  )}
                </li>
                <li>
                  {t("privacy.storage.access", "Restricted access controls")}
                </li>
                <li>
                  {t(
                    "privacy.storage.monitoring",
                    "Regular security monitoring",
                  )}
                </li>
                <li>
                  {t("privacy.storage.backup", "Secure backup procedures")}
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.sharing.title", "4. Data Sharing and Disclosure")}
              </h2>
              <p className="mb-4">
                {t(
                  "privacy.sharing.intro",
                  "We do not sell, trade, or rent your personal information. We may share your information in the following situations:",
                )}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("privacy.sharing.consent", "With your consent")}</li>
                <li>
                  {t(
                    "privacy.sharing.legal",
                    "To comply with legal obligations",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.sharing.protect",
                    "To protect our rights and safety",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.sharing.service",
                    "With service providers who assist our operations",
                  )}
                </li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.rights.title", "5. Your Rights")}
              </h2>
              <p className="mb-4">
                {t(
                  "privacy.rights.intro",
                  "You have the following rights regarding your personal data:",
                )}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  {t(
                    "privacy.rights.access",
                    "Access your personal information",
                  )}
                </li>
                <li>
                  {t("privacy.rights.correct", "Correct inaccurate data")}
                </li>
                <li>
                  {t("privacy.rights.delete", "Request deletion of your data")}
                </li>
                <li>
                  {t(
                    "privacy.rights.export",
                    "Export your data in a portable format",
                  )}
                </li>
                <li>
                  {t(
                    "privacy.rights.restrict",
                    "Restrict processing of your data",
                  )}
                </li>
                <li>
                  {t("privacy.rights.withdraw", "Withdraw consent at any time")}
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.cookies.title", "6. Cookies and Tracking")}
              </h2>
              <p className="mb-4">
                {t(
                  "privacy.cookies.intro",
                  "We use cookies and similar tracking technologies to enhance your experience. Essential cookies are required for platform functionality, while optional cookies help us improve our service.",
                )}
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.children.title", "7. Children's Privacy")}
              </h2>
              <p>
                {t(
                  "privacy.children.content",
                  "Our platform is designed for educational use by students of all ages. For users under 13, we require parental consent and limit data collection to essential information only.",
                )}
              </p>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t(
                  "privacy.international.title",
                  "8. International Data Transfers",
                )}
              </h2>
              <p>
                {t(
                  "privacy.international.content",
                  "Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.",
                )}
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.changes.title", "9. Changes to This Policy")}
              </h2>
              <p>
                {t(
                  "privacy.changes.content",
                  'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.',
                )}
              </p>
            </section>

            {/* Contact Us */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t("privacy.contact.title", "10. Contact Us")}
              </h2>
              <p className="mb-4">
                {t(
                  "privacy.contact.intro",
                  "If you have questions about this Privacy Policy, please contact us at:",
                )}
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="font-medium">AI Square</p>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:support@junyiacademy.org"
                    className="text-blue-600 hover:underline"
                  >
                    support@junyiacademy.org
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t("common.backToHome", "Back to Home")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

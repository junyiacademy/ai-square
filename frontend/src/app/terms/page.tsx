'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function TermsOfServicePage() {
  const { t, i18n } = useTranslation(['legal']);
  const lastUpdated = '2025-06-30';
  const effectiveDate = '2025-07-01';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('terms.title', 'Terms of Service')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('terms.effectiveDate', 'Effective Date')}: {effectiveDate} | {t('terms.lastUpdated', 'Last Updated')}: {lastUpdated}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <p className="text-gray-700 dark:text-gray-300">
                {t('terms.intro', 
                  'Welcome to AI Square! These Terms of Service ("Terms") govern your use of our AI literacy education platform. By accessing or using AI Square, you agree to be bound by these Terms.'
                )}
              </p>
            </section>

            {/* Acceptance of Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.acceptance.title', '1. Acceptance of Terms')}</h2>
              <p className="mb-4">
                {t('terms.acceptance.content', 
                  'By creating an account or using our services, you acknowledge that you have read, understood, and agree to these Terms. If you do not agree, please do not use our platform.'
                )}
              </p>
              <p>
                {t('terms.acceptance.capacity', 
                  'You must be at least 13 years old to use our services. If you are under 18, you must have parental consent.'
                )}
              </p>
            </section>

            {/* Description of Service */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.service.title', '2. Description of Service')}</h2>
              <p className="mb-4">{t('terms.service.intro', 'AI Square provides:')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.service.literacy', 'AI literacy education content and assessments')}</li>
                <li>{t('terms.service.pbl', 'Problem-Based Learning (PBL) scenarios')}</li>
                <li>{t('terms.service.ai', 'AI-powered tutoring and feedback')}</li>
                <li>{t('terms.service.tracking', 'Progress tracking and analytics')}</li>
                <li>{t('terms.service.multi', 'Multi-language support (9 languages)')}</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.accounts.title', '3. User Accounts')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('terms.accounts.registration', 'Registration')}</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>{t('terms.accounts.accurate', 'Provide accurate and complete information')}</li>
                <li>{t('terms.accounts.maintain', 'Maintain and update your information')}</li>
                <li>{t('terms.accounts.secure', 'Keep your account credentials secure')}</li>
                <li>{t('terms.accounts.responsible', 'You are responsible for all activities under your account')}</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">{t('terms.accounts.types', 'Account Types')}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.accounts.student', 'Student: Access to learning content and assessments')}</li>
                <li>{t('terms.accounts.teacher', 'Teacher: Additional class management features')}</li>
                <li>{t('terms.accounts.admin', 'Administrator: Platform management capabilities')}</li>
              </ul>
            </section>

            {/* Acceptable Use */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.use.title', '4. Acceptable Use Policy')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('terms.use.permitted', 'You may:')}</h3>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>{t('terms.use.educational', 'Use the platform for educational purposes')}</li>
                <li>{t('terms.use.share', 'Share your learning progress appropriately')}</li>
                <li>{t('terms.use.feedback', 'Provide constructive feedback')}</li>
              </ul>

              <h3 className="text-xl font-medium mb-3">{t('terms.use.prohibited', 'You may not:')}</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.use.misuse', 'Misuse or attempt to manipulate the AI systems')}</li>
                <li>{t('terms.use.share_credentials', 'Share account credentials')}</li>
                <li>{t('terms.use.cheat', 'Engage in academic dishonesty')}</li>
                <li>{t('terms.use.harm', 'Harass, abuse, or harm other users')}</li>
                <li>{t('terms.use.illegal', 'Use the platform for illegal activities')}</li>
                <li>{t('terms.use.scrape', 'Scrape or copy content without permission')}</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.ip.title', '5. Intellectual Property')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('terms.ip.platform', 'Platform Content')}</h3>
              <p className="mb-4">
                {t('terms.ip.ownership', 
                  'All content on AI Square, including text, graphics, logos, and software, is owned by AI Square or its licensors and protected by intellectual property laws.'
                )}
              </p>

              <h3 className="text-xl font-medium mb-3">{t('terms.ip.user', 'User Content')}</h3>
              <p className="mb-4">
                {t('terms.ip.retain', 
                  'You retain ownership of content you create. By submitting content, you grant us a license to use it for providing and improving our services.'
                )}
              </p>

              <h3 className="text-xl font-medium mb-3">{t('terms.ip.open', 'Open Source')}</h3>
              <p>
                {t('terms.ip.git', 
                  'Educational content is managed through Git and may be subject to open-source licenses. Please check individual repositories for specific license terms.'
                )}
              </p>
            </section>

            {/* Privacy and Data */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.privacy.title', '6. Privacy and Data Protection')}</h2>
              <p>
                {t('terms.privacy.content', 
                  'Your use of AI Square is also governed by our Privacy Policy. We are committed to protecting your personal information and using it only as described in our Privacy Policy.'
                )}
              </p>
            </section>

            {/* AI Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.ai.title', '7. AI Services and Limitations')}</h2>
              <p className="mb-4">
                {t('terms.ai.disclaimer', 
                  'Our AI-powered features are designed to assist learning but are not perfect. We do not guarantee the accuracy of AI-generated content or feedback.'
                )}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('terms.ai.educational', 'AI responses are for educational purposes only')}</li>
                <li>{t('terms.ai.verify', 'Always verify important information independently')}</li>
                <li>{t('terms.ai.improve', 'We continuously work to improve AI accuracy')}</li>
              </ul>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.disclaimers.title', '8. Disclaimers and Limitations')}</h2>
              <p className="mb-4 uppercase font-semibold">
                {t('terms.disclaimers.asis', 
                  'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.'
                )}
              </p>
              <p className="mb-4">
                {t('terms.disclaimers.liability', 
                  'To the fullest extent permitted by law, AI Square shall not be liable for any indirect, incidental, special, consequential, or punitive damages.'
                )}
              </p>
            </section>

            {/* Modifications */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.modifications.title', '9. Modifications to Terms')}</h2>
              <p>
                {t('terms.modifications.content', 
                  'We may modify these Terms at any time. We will notify users of material changes. Continued use after changes constitutes acceptance of the new Terms.'
                )}
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.termination.title', '10. Termination')}</h2>
              <p className="mb-4">
                {t('terms.termination.rights', 
                  'We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time.'
                )}
              </p>
            </section>

            {/* Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.law.title', '11. Governing Law')}</h2>
              <p>
                {t('terms.law.content', 
                  'These Terms are governed by the laws of the jurisdiction where AI Square operates, without regard to conflict of law principles.'
                )}
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.contact.title', '12. Contact Information')}</h2>
              <p className="mb-4">
                {t('terms.contact.intro', 'For questions about these Terms, please contact us:')}
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <p className="font-medium">AI Square</p>
                <p>Email: <a href="mailto:support@junyiacademy.org" className="text-blue-600 hover:underline">support@junyiacademy.org</a></p>
              </div>
            </section>
          </div>

          {/* Agreement Button */}
          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-center text-gray-700 dark:text-gray-300 mb-4">
              {t('terms.agreement', 'By using AI Square, you acknowledge that you have read and agree to these Terms of Service.')}
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <Link 
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('common.backToHome', 'Back to Home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
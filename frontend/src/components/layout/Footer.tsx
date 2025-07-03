'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation(['navigation']);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div className="md:col-span-2">
            <h3 className="text-white font-semibold mb-4">{t('footer.about', 'About AI Square')}</h3>
            <p className="text-sm mb-4">
              {t('footer.description', 'AI Square is a Git-Based learning platform for AI literacy education, supporting 10+ languages worldwide.')}
            </p>
            <div className="flex space-x-4">
              <span className="text-sm">10+ {t('footer.languages', 'Languages')}</span>
              <span className="text-sm">•</span>
              <span className="text-sm">4 {t('footer.domains', 'AI Domains')}</span>
              <span className="text-sm">•</span>
              <span className="text-sm">20+ {t('footer.competencies', 'Competencies')}</span>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.resources', 'Resources')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about/journey" className="hover:text-white transition-colors">
                  {t('footer.journey', 'User Journey')}
                </Link>
              </li>
              <li>
                <Link href="/about/roadmap" className="hover:text-white transition-colors">
                  {t('footer.roadmap', 'Product Roadmap')}
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com/anthropics/claude-code/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {t('footer.feedback', 'Feedback')}
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t('footer.privacy', 'Privacy Policy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t('footer.terms', 'Terms of Service')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.contact', 'Contact')}</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:support@junyiacademy.org" 
                  className="hover:text-white transition-colors"
                >
                  support@junyiacademy.org
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              © {currentYear} AI Square. {t('footer.rights', 'All rights reserved.')}
            </p>
            <div className="mt-4 md:mt-0 text-sm">
              {t('footer.madeWith', 'Made with ❤️ for AI literacy education')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
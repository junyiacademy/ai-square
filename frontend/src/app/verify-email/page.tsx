'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('auth:verifyEmail.noToken'));
      return;
    }

    // Verify the email token
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/register?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage(data.message || t('auth:verifyEmail.success'));
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || t('auth:verifyEmail.failed'));
        }
      } catch {
        setStatus('error');
        setMessage(t('auth:verifyEmail.networkError'));
      }
    };

    verifyEmail();
  }, [token, router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
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
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth:verifyEmail.title')}
          </h2>
        </div>

        <div className="mt-8">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {t('auth:verifyEmail.verifying')}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3 mx-auto w-fit">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {message}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('auth:verifyEmail.redirecting')}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-3 mx-auto w-fit">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('auth:verifyEmail.errorTitle')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {message}
                </p>
              </div>
              <div className="mt-6 space-y-2">
                <Link 
                  href="/register" 
                  className="inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('auth:verifyEmail.tryAgain')}
                </Link>
                <span className="mx-2 text-gray-400">|</span>
                <Link 
                  href="/contact" 
                  className="inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {t('auth:verifyEmail.contactSupport')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
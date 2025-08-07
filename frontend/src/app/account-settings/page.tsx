'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

interface LegalConsent {
  type: string;
  version: string;
  consentedAt: string;
  title: string;
}

interface RequiredConsent {
  type: string;
  version: string;
  title: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation(['common', 'auth']);
  const { user, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  
  // 合規性相關
  const [consents, setConsents] = useState<LegalConsent[]>([]);
  const [requiredConsents, setRequiredConsents] = useState<RequiredConsent[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchConsents();
    }
  }, [user, authLoading, router]);

  const fetchConsents = async () => {
    try {
      const response = await fetch('/api/legal/consent');
      const data = await response.json();

      if (data.success) {
        setConsents(data.consents);
        setRequiredConsents(data.requiresConsent);
      }
    } catch (err) {
      console.error('Failed to fetch consents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setError(t('accountSettings.confirmRequired'));
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/archive-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          reason: deleteReason,
          confirmArchive: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 顯示成功訊息並重定向
        alert(data.message);
        router.push('/');
      } else {
        setError(data.error || t('accountSettings.deleteError'));
      }
    } catch {
      setError(t('accountSettings.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConsent = async (documentType: string, documentVersion: string) => {
    try {
      const response = await fetch('/api/legal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentVersion,
          consent: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 重新載入同意記錄
        fetchConsents();
      }
    } catch (err) {
      console.error('Failed to record consent:', err);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {t('accountSettings.title')}
        </h1>

        {/* 法律文件同意狀態 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('accountSettings.legalDocuments')}
          </h2>

          {/* 已同意的文件 */}
          {consents && consents.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('accountSettings.consentedDocuments')}
              </h3>
              <div className="space-y-2">
                {consents.map((consent) => (
                  <div key={consent.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{consent.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('accountSettings.version')}: {consent.version} | 
                        {t('accountSettings.consentedOn')}: {new Date(consent.consentedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 需要同意的新文件 */}
          {requiredConsents && requiredConsents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('accountSettings.newDocuments')}
              </h3>
              <div className="space-y-2">
                {requiredConsents.map((doc) => (
                  <div key={doc.type} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="font-medium text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('accountSettings.newVersion')}: {doc.version}
                    </p>
                    <button
                      onClick={() => handleConsent(doc.type, doc.version)}
                      className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      {t('accountSettings.reviewAndAccept')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 危險區域 - 刪除帳號 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            {t('accountSettings.dangerZone')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('accountSettings.deleteWarning')}
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            {t('accountSettings.deleteAccount')}
          </button>
        </div>

        {/* 刪除帳號確認 Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('accountSettings.confirmDelete')}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('auth:password')}
                  </label>
                  <input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder={t('accountSettings.enterPassword')}
                  />
                </div>

                <div>
                  <label htmlFor="deleteReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('accountSettings.reason')} ({t('common.optional')})
                  </label>
                  <textarea
                    id="deleteReason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder={t('accountSettings.reasonPlaceholder')}
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="confirmDelete"
                    checked={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confirmDelete" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('accountSettings.confirmDeleteText')}
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteReason('');
                    setConfirmDelete(false);
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={isDeleting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePassword}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? t('common.processing') : t('accountSettings.deleteForever')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
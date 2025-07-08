'use client';

import { LearningInterface } from '@/lib/v2/components/LearningInterface';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: { scenarioId: string; programId: string };
}

export default function LearningPage({ params }: PageProps) {
  const { scenarioId, programId } = params;
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => router.push(`/v2/scenarios/${scenarioId}`)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} />
            {t('v2.back', 'Back to Programs')}
          </button>
        </div>
      </div>
      
      <LearningInterface scenarioId={scenarioId} programId={programId} />
    </div>
  );
}
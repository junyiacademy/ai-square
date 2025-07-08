'use client';

import { ProgramSelector } from '@/lib/v2/components/ProgramSelector';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: { scenarioId: string };
}

export default function ProgramSelectionPage({ params }: PageProps) {
  const { scenarioId } = params;
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="container mx-auto px-4">
        <button
          onClick={() => router.push('/v2/scenarios')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          {t('v2.back', 'Back to Scenarios')}
        </button>
        
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {t('v2.programs.select', 'Select or Create Program')}
        </h1>
        
        <ProgramSelector scenarioId={scenarioId} />
      </div>
    </div>
  );
}
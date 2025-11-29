'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface ActionButtonsProps {
  scenarioId: string;
}

export function ActionButtons({ scenarioId }: ActionButtonsProps) {
  const { t } = useTranslation('pbl');

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link
        href={`/pbl/scenarios/${scenarioId}`}
        className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
      >
        {t('complete.retryScenario')}
      </Link>
    </div>
  );
}

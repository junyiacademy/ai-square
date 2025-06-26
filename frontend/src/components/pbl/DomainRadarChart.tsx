'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface DomainRadarChartProps {
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
  title?: string;
}

export default function DomainRadarChart({ domainScores, title }: DomainRadarChartProps) {
  const { t } = useTranslation(['common']);

  const domainLabels = [
    t('domains.engaging_with_ai.title'),
    t('domains.creating_with_ai.title'),
    t('domains.managing_with_ai.title'),
    t('domains.designing_with_ai.title')
  ];

  const data: ChartData<'radar'> = {
    labels: domainLabels,
    datasets: [
      {
        label: t('domains.title'),
        data: [
          domainScores.engaging_with_ai,
          domainScores.creating_with_ai,
          domainScores.managing_with_ai,
          domainScores.designing_with_ai
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.parsed.r}%`;
          }
        }
      }
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
          font: {
            size: 10
          },
          backdropColor: 'transparent'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          circular: true
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          padding: 15,
          centerPointLabels: true
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  // Calculate overall score
  const overallScore = Math.round(
    (domainScores.engaging_with_ai + 
     domainScores.creating_with_ai + 
     domainScores.managing_with_ai + 
     domainScores.designing_with_ai) / 4
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      
      <div className="h-80">
        <Radar data={data} options={options} />
      </div>
      
      {/* Overall Score */}
      <div className="text-center mt-6">
        <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
          {overallScore}%
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('overall_score')}
        </p>
      </div>
      
      {/* Domain Breakdown */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {domainScores.engaging_with_ai}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('domains.engaging_with_ai.short')}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {domainScores.creating_with_ai}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('domains.creating_with_ai.short')}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {domainScores.managing_with_ai}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('domains.managing_with_ai.short')}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {domainScores.designing_with_ai}%
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('domains.designing_with_ai.short')}
          </p>
        </div>
      </div>
    </div>
  );
}
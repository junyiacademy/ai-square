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
            size: 11
          },
          backdropColor: 'transparent',
          color: 'rgba(107, 114, 128, 0.7)'
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.2)',
          circular: true
        },
        pointLabels: {
          font: {
            size: 13,
            weight: '600'
          },
          padding: 20,
          centerPointLabels: true,
          color: 'rgb(55, 65, 81)'
        },
        angleLines: {
          color: 'rgba(107, 114, 128, 0.2)'
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {title}
        </h3>
      )}
      
      <div className="h-80 flex items-center justify-center">
        <Radar data={data} options={options} />
      </div>
      
      {/* Overall Score */}
      <div className="text-center mt-8 mb-6">
        <div className="inline-flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl">
          <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {overallScore}%
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
            {t('overall_score')}
          </p>
        </div>
      </div>
      
      {/* Domain Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 group-hover:from-blue-500/20 group-hover:to-cyan-500/20 transition-all duration-300 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {domainScores.engaging_with_ai}%
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {t('domains.engaging_with_ai.short')}
            </p>
          </div>
        </div>
        
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all duration-300 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {domainScores.creating_with_ai}%
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {t('domains.creating_with_ai.short')}
            </p>
          </div>
        </div>
        
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 group-hover:from-orange-500/20 group-hover:to-red-500/20 transition-all duration-300 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {domainScores.managing_with_ai}%
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {t('domains.managing_with_ai.short')}
            </p>
          </div>
        </div>
        
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all duration-300 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {domainScores.designing_with_ai}%
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
              {t('domains.designing_with_ai.short')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
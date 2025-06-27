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
  const { t } = useTranslation(['homepage', 'assessment']);

  const domainLabels = [
    t('homepage:domains.items.engaging.name'),
    t('homepage:domains.items.creating.name'),
    t('homepage:domains.items.managing.name'),
    t('homepage:domains.items.designing.name')
  ];

  const data: ChartData<'radar'> = {
    labels: domainLabels,
    datasets: [
      {
        label: t('homepage:domains.title'),
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
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
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
            weight: 500,
            family: 'inherit'
          },
          padding: 15,
          centerPointLabels: false,
          color: 'rgb(75, 85, 99)',
          display: true,
          backdropColor: 'rgba(255, 255, 255, 0.8)',
          backdropPadding: 4
        },
        angleLines: {
          color: 'rgba(107, 114, 128, 0.2)'
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {title}
        </h3>
      )}
      
      <div className="h-80 flex items-center justify-center relative">
        <div className="w-full h-full max-w-md">
          <Radar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
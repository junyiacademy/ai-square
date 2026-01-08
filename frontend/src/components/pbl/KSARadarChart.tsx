"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface KSARadarChartProps {
  ksaScores: {
    [ksaCode: string]: {
      score: number;
      category: "knowledge" | "skills" | "attitudes";
    };
  };
  title?: string;
}

export default function KSARadarChart({
  ksaScores,
  title,
}: KSARadarChartProps) {
  const { t } = useTranslation(["pbl"]);

  // Group scores by category and calculate averages
  const scoresByCategory = {
    knowledge: [] as number[],
    skills: [] as number[],
    attitudes: [] as number[],
  };

  const ksaLabels = Object.keys(ksaScores).sort();

  ksaLabels.forEach((ksa) => {
    const { score, category } = ksaScores[ksa];
    scoresByCategory[category].push(score);
  });

  // Calculate average for each category
  const avgScore = (scores: number[]) =>
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const data: ChartData<"radar"> = {
    labels: ksaLabels,
    datasets: [
      {
        label: t("complete.knowledge"),
        data: ksaLabels.map((ksa) =>
          ksa.startsWith("K") ? ksaScores[ksa].score : 0,
        ),
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(59, 130, 246, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(59, 130, 246, 1)",
      },
      {
        label: t("complete.skills"),
        data: ksaLabels.map((ksa) =>
          ksa.startsWith("S") ? ksaScores[ksa].score : 0,
        ),
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(34, 197, 94, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(34, 197, 94, 1)",
      },
      {
        label: t("complete.attitudes"),
        data: ksaLabels.map((ksa) =>
          ksa.startsWith("A") ? ksaScores[ksa].score : 0,
        ),
        backgroundColor: "rgba(168, 85, 247, 0.2)",
        borderColor: "rgba(168, 85, 247, 1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(168, 85, 247, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(168, 85, 247, 1)",
      },
    ],
  };

  const options: ChartOptions<"radar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 13,
          },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.datasets) {
              return data.datasets.map((dataset, i) => ({
                text: dataset.label || "",
                fillStyle: dataset.borderColor as string,
                strokeStyle: dataset.borderColor as string,
                pointStyle: "circle",
                hidden: false,
                index: i,
              }));
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.r}%`;
          },
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
          font: {
            size: 11,
          },
          backdropColor: "transparent",
          color: "rgba(107, 114, 128, 0.7)",
        },
        grid: {
          color: "rgba(107, 114, 128, 0.2)",
          circular: true,
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 600,
          },
          padding: 10,
          color: "rgb(55, 65, 81)",
          callback: (label) => {
            // Show KSA code with description if available
            return label;
          },
        },
        angleLines: {
          color: "rgba(107, 114, 128, 0.2)",
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {title}
        </h3>
      )}
      <div className="h-64 flex items-center justify-center">
        <Radar data={data} options={options} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(avgScore(scoresByCategory.knowledge))}%
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
              {t("complete.knowledge")}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {Math.round(avgScore(scoresByCategory.skills))}%
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
              {t("complete.skills")}
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl" />
          <div className="relative p-4 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Math.round(avgScore(scoresByCategory.attitudes))}%
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
              {t("complete.attitudes")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

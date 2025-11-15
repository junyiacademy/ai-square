'use client';

import React from 'react';

interface DomainRadarMiniProps {
  domainScores: {
    engaging_with_ai: number;
    creating_with_ai: number;
    managing_with_ai: number;
    designing_with_ai: number;
  };
}

export default function DomainRadarMini({ domainScores }: DomainRadarMiniProps) {
  // Convert domain scores to array format for radar chart
  const data = [
    { domain: 'Engaging', score: domainScores.engaging_with_ai },
    { domain: 'Creating', score: domainScores.creating_with_ai },
    { domain: 'Managing', score: domainScores.managing_with_ai },
    { domain: 'Designing', score: domainScores.designing_with_ai }
  ];

  // Calculate positions for radar chart (square layout)
  const size = 120;
  const center = size / 2;
  const radius = size * 0.4;

  // Four corners for square layout
  const angleStep = (2 * Math.PI) / 4;
  const startAngle = -Math.PI / 2; // Start from top

  // Calculate points for the radar polygon
  const points = data.map((item, index) => {
    const angle = startAngle + index * angleStep;
    const distance = (item.score / 100) * radius;
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    return `${x},${y}`;
  }).join(' ');

  // Background grid points (at 100% scale)
  const gridPoints = Array(4).fill(0).map((_, index) => {
    const angle = startAngle + index * angleStep;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return { x, y };
  });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} className="transform">
        {/* Background circles */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" />
        <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" strokeDasharray="2,2" />
        <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" strokeDasharray="2,2" />

        {/* Grid lines from center */}
        {gridPoints.map((point, index) => (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-200 dark:text-gray-700"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={points}
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-500 dark:text-blue-400"
        />

        {/* Data points */}
        {data.map((item, index) => {
          const angle = startAngle + index * angleStep;
          const distance = (item.score / 100) * radius;
          const x = center + Math.cos(angle) * distance;
          const y = center + Math.sin(angle) * distance;

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="currentColor"
              className="text-blue-600 dark:text-blue-400"
            />
          );
        })}

        {/* Labels */}
        {data.map((item, index) => {
          const angle = startAngle + index * angleStep;
          const labelDistance = radius + 15;
          const x = center + Math.cos(angle) * labelDistance;
          const y = center + Math.sin(angle) * labelDistance;

          // Adjust text anchor based on position
          let textAnchor = 'middle';
          if (index === 1) textAnchor = 'start';
          else if (index === 3) textAnchor = 'end';

          return (
            <text
              key={index}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="text-xs font-medium fill-current text-gray-600 dark:text-gray-400"
            >
              {item.domain}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

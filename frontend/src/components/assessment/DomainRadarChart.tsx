'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';
import { RadarChartData } from '../../types/assessment';

interface DomainRadarChartProps {
  data: RadarChartData[];
}

export default function DomainRadarChart({ data }: DomainRadarChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="domain" className="text-sm" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
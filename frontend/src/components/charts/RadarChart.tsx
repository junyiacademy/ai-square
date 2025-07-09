'use client';

import { useEffect, useRef } from 'react';

interface RadarChartProps {
  data: Array<{
    domain: string;
    score: number;
  }>;
  size?: number;
}

export function RadarChart({ data, size = 300 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    const angleStep = (2 * Math.PI) / data.length;

    // Draw grid circles
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axes
    data.forEach((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();
    });

    // Draw data polygon
    ctx.beginPath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    data.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const value = (item.score / 100) * radius;
      const x = centerX + value * Math.cos(angle);
      const y = centerY + value * Math.sin(angle);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw points
    data.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const value = (item.score / 100) * radius;
      const x = centerX + value * Math.cos(angle);
      const y = centerY + value * Math.sin(angle);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    data.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const labelRadius = radius + 20;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      
      // Split long domain names
      const words = item.domain.split(' ');
      if (words.length > 2) {
        ctx.fillText(words.slice(0, 2).join(' '), x, y - 6);
        ctx.fillText(words.slice(2).join(' '), x, y + 6);
      } else {
        ctx.fillText(item.domain, x, y);
      }
      
      // Draw score
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${item.score}%`, x, y + 16);
    });

  }, [data, size]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      className="mx-auto"
    />
  );
}
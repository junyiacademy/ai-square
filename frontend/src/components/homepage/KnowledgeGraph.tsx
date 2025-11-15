'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

interface Domain {
  id: string;
  name: string;
  emoji: string;
  color: string;
  competencies: number;
  x?: number;
  y?: number;
}

export default function KnowledgeGraph() {
  const { t } = useTranslation('homepage');
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  const domains: Domain[] = useMemo(() => [
    {
      id: 'engaging_with_ai',
      name: t('domains.items.engaging.name'),
      emoji: '🎯',
      color: '#3B82F6',
      competencies: 5
    },
    {
      id: 'creating_with_ai',
      name: t('domains.items.creating.name'),
      emoji: '🎨',
      color: '#10B981',
      competencies: 6
    },
    {
      id: 'managing_with_ai',
      name: t('domains.items.managing.name'),
      emoji: '🎮',
      color: '#F59E0B',
      competencies: 4
    },
    {
      id: 'designing_with_ai',
      name: t('domains.items.designing.name'),
      emoji: '🏗️',
      color: '#EF4444',
      competencies: 5
    }
  ], [t]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;

    // Position domains in a circle
    domains.forEach((domain, index) => {
      const angle = (index * 2 * Math.PI) / domains.length - Math.PI / 2;
      domain.x = centerX + Math.cos(angle) * radius;
      domain.y = centerY + Math.sin(angle) * radius;
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      domains.forEach((domain1, i) => {
        domains.forEach((domain2, j) => {
          if (i < j) {
            ctx.beginPath();
            ctx.moveTo(domain1.x!, domain1.y!);
            ctx.lineTo(domain2.x!, domain2.y!);
            ctx.stroke();
          }
        });
      });

      // Draw center node
      ctx.fillStyle = '#6366F1';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI', centerX, centerY);

      // Draw domains
      domains.forEach((domain) => {
        const isHovered = hoveredDomain === domain.id;

        // Domain circle
        ctx.fillStyle = domain.color;
        ctx.globalAlpha = isHovered ? 1 : 0.8;
        ctx.beginPath();
        ctx.arc(domain.x!, domain.y!, isHovered ? 55 : 50, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Domain emoji
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(domain.emoji, domain.x!, domain.y!);

        // Domain name
        ctx.fillStyle = isHovered ? '#4F46E5' : '#374151';
        ctx.font = isHovered ? 'bold 14px sans-serif' : '12px sans-serif';
        ctx.fillText(domain.name, domain.x!, domain.y! + 70);

        // Competency count
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${domain.competencies} competencies`, domain.x!, domain.y! + 85);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });

      // Check if hovering over a domain
      const hovered = domains.find(domain =>
        Math.sqrt(Math.pow(x - domain.x!, 2) + Math.pow(y - domain.y!, 2)) < 50
      );

      setHoveredDomain(hovered ? hovered.id : null);
      canvas.style.cursor = hovered ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const clicked = domains.find(domain =>
        Math.sqrt(Math.pow(x - domain.x!, 2) + Math.pow(y - domain.y!, 2)) < 50
      );

      if (clicked) {
        setSelectedDomain(clicked);
        // Navigate to relations page when a domain is clicked
        router.push('/relations');
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [mousePos, domains, router, hoveredDomain]);

  return (
    <div className="relative w-full">
      <h2 className="text-3xl font-bold text-center mb-4">{t('domains.title')}</h2>
      <p className="text-lg text-gray-600 text-center mb-8">{t('domains.subtitle')}</p>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[400px] cursor-pointer"
        />

        {selectedDomain && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-6 border-t shadow-lg">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{selectedDomain.emoji}</span>
                <div>
                  <h3 className="text-xl font-bold">{selectedDomain.name}</h3>
                  <p className="text-gray-600">{selectedDomain.competencies} competencies</p>
                </div>
                <button
                  onClick={() => setSelectedDomain(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <a
                href="/relations"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                {t('domains.viewDetails')} →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

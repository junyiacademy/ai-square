'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';

interface KSAKnowledgeGraphProps {
  ksaScores: {
    [ksa: string]: {
      score: number;
      category: 'knowledge' | 'skills' | 'attitudes';
    };
  };
  title: string;
  ksaMapping?: {
    [ksa: string]: {
      code: string;
      description: string;
      level?: string;
    };
  };
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: 'knowledge' | 'skills' | 'attitudes' | 'center';
  score?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export default function KSAKnowledgeGraph({ ksaScores, title, ksaMapping }: KSAKnowledgeGraphProps) {
  const { t } = useTranslation(['common', 'ksa']);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: width - 48, // Subtract padding
          height: Math.min(600, width * 0.75) // Maintain aspect ratio
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Create nodes
    const nodes: Node[] = [
      { id: 'center', label: 'AI Literacy', category: 'center', fx: centerX, fy: centerY }
    ];

    // Add category nodes
    const categories = [
      { id: 'knowledge', label: 'Knowledge', angle: -Math.PI / 2 },
      { id: 'skills', label: 'Skills', angle: Math.PI / 6 },
      { id: 'attitudes', label: 'Attitudes', angle: (5 * Math.PI) / 6 }
    ];

    categories.forEach(cat => {
      const radius = Math.min(width, height) * 0.3; // Scale based on container
      nodes.push({
        id: cat.id,
        label: cat.label,
        category: cat.id as 'knowledge' | 'skills' | 'attitudes',
        fx: centerX + radius * Math.cos(cat.angle),
        fy: centerY + radius * Math.sin(cat.angle)
      });
    });

    // Add KSA nodes
    Object.entries(ksaScores).forEach(([ksa, data]) => {
      nodes.push({
        id: ksa,
        label: ksa,
        category: data.category,
        score: data.score
      });
    });

    // Create links
    const links: Link[] = [];

    // Connect center to categories
    categories.forEach(cat => {
      links.push({ source: 'center', target: cat.id });
    });

    // Connect KSA items to their categories
    Object.entries(ksaScores).forEach(([ksa, data]) => {
      links.push({ source: data.category, target: ksa });
    });

    // Create SVG with zoom support
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Clear any existing groups
    svg.selectAll('g').remove();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create main group for transformation
    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as Node;
          const target = d.target as Node;
          const baseDistance = Math.min(width, height) * 0.15;
          if (source.id === 'center' || target.id === 'center') return baseDistance * 1.5;
          return baseDistance;
        })
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(Math.min(width, height) * 0.08));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Create node groups
    const node = g.append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', d => d.score !== undefined ? 'pointer' : 'move')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.score !== undefined) {
          setSelectedNode(d);

          // Center the clicked node with animation
          const scale = 1.5;
          const translate = [width / 2 - scale * d.x!, height / 2 - scale * d.y!];

          svg.transition()
            .duration(750)
            .call(
              zoom.transform,
              d3.zoomIdentity
                .translate(translate[0], translate[1])
                .scale(scale)
            );
        }
      })
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles for nodes
    const nodeRadius = Math.min(width, height) * 0.04;
    node.append('circle')
      .attr('r', d => {
        if (d.id === 'center') return nodeRadius * 1.5;
        if (d.category === 'center') return nodeRadius * 1.25;
        return nodeRadius;
      })
      .attr('fill', d => {
        if (d.id === 'center') return '#6366f1';
        if (d.category === 'center') {
          if (d.id === 'knowledge') return '#3b82f6';
          if (d.id === 'skills') return '#10b981';
          if (d.id === 'attitudes') return '#a855f7';
        }
        // Individual KSA nodes - traffic light colors based on score
        if (d.score !== undefined) {
          if (d.score >= 80) return '#10b981'; // Green
          if (d.score >= 60) return '#f59e0b'; // Amber
          return '#ef4444'; // Red
        }
        return '#9ca3af';
      })
      .attr('stroke', d => {
        if (d.category === 'knowledge') return '#3b82f6';
        if (d.category === 'skills') return '#10b981';
        if (d.category === 'attitudes') return '#a855f7';
        return '#6366f1';
      })
      .attr('stroke-width', 2)
      .attr('class', 'node-circle');

    // Add labels
    const fontSize = Math.min(width, height) * 0.02;
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.id === 'center' || d.category === 'center' ? fontSize * 0.3 : -nodeRadius * 1.3)
      .attr('font-size', d => {
        if (d.id === 'center') return `${fontSize * 1.4}px`;
        if (d.category === 'center') return `${fontSize * 1.2}px`;
        return `${fontSize}px`;
      })
      .attr('font-weight', d => d.id === 'center' || d.category === 'center' ? 'bold' : 'normal')
      .attr('fill', d => d.id === 'center' ? 'white' : '#374151');

    // Add scores for KSA nodes
    node.filter(d => d.score !== undefined)
      .append('text')
      .text(d => `${d.score}%`)
      .attr('text-anchor', 'middle')
      .attr('dy', fontSize * 0.3)
      .attr('font-size', `${fontSize * 1.2}px`)
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x || 0)
        .attr('y1', d => (d.source as Node).y || 0)
        .attr('x2', d => (d.target as Node).x || 0)
        .attr('y2', d => (d.target as Node).y || 0);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.id !== 'center' && !['knowledge', 'skills', 'attitudes'].includes(d.id)) {
        d.fx = null;
        d.fy = null;
      }
    }

    // Reset zoom on double click
    svg.on('dblclick.zoom', () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      simulation.stop();
    };
  }, [ksaScores, dimensions]);

  // Update visual selection state
  useEffect(() => {
    if (!svgRef.current) return;

    d3.select(svgRef.current)
      .selectAll('.node-circle')
      .transition()
      .duration(300)
      .attr('stroke-width', function(d: unknown) {
        const node = d as Node;
        return selectedNode && node.id === selectedNode.id ? 4 : 2;
      })
      .attr('stroke', function(d: unknown) {
        const node = d as Node;
        if (selectedNode && node.id === selectedNode.id) return '#1f2937';
        if (node.category === 'knowledge') return '#3b82f6';
        if (node.category === 'skills') return '#10b981';
        if (node.category === 'attitudes') return '#a855f7';
        return '#6366f1';
      });
  }, [selectedNode]);

  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Helper function to get score status
  const getScoreStatus = (score: number) => {
    if (score >= 80) return { text: 'Excellent', icon: '✓', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' };
    if (score >= 60) return { text: 'Good', icon: '!', color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' };
    return { text: 'Needs Improvement', icon: '✗', color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' };
  };

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Knowledge Graph on the left */}
        <div>
          <div className="relative">
            <svg
              ref={svgRef}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"
              style={{ cursor: 'grab' }}
            ></svg>
            {/* Zoom controls */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <button
                onClick={() => {
                  if (svgRef.current && zoomRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().call(zoomRef.current.scaleBy, 1.2);
                  }
                }}
                className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                title={t('common:zoomIn')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (svgRef.current && zoomRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().call(zoomRef.current.scaleBy, 0.8);
                  }
                }}
                className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                title={t('common:zoomOut')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (svgRef.current && zoomRef.current) {
                    const svg = d3.select(svgRef.current);
                    svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
                  }
                }}
                className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                title={t('common:resetZoom')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Legend and Instructions */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">≥80% {t('ksa:excellent')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">60-79% {t('ksa:good')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">&lt;60% {t('ksa:needsWork')}</span>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('ksa:graphInstructions')}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Node Details on the right */}
        <div>
          {selectedNode && selectedNode.score !== undefined ? (
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedNode.id}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedNode.category === 'knowledge' && t('ksa:knowledgeComponent')}
                    {selectedNode.category === 'skills' && t('ksa:skillsComponent')}
                    {selectedNode.category === 'attitudes' && t('ksa:attitudesComponent')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className={`text-5xl font-bold ${getScoreColor(selectedNode.score)}`}>
                  {selectedNode.score}%
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getScoreStatus(selectedNode.score).color}`}>
                  <span className="mr-1 text-lg">{getScoreStatus(selectedNode.score).icon}</span>
                  {getScoreStatus(selectedNode.score).text}
                </div>
              </div>

              {ksaMapping && ksaMapping[selectedNode.id] && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h5>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {ksaMapping[selectedNode.id].description}
                  </p>
                  {ksaMapping[selectedNode.id].level && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Level:</span> {ksaMapping[selectedNode.id].level}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  This competency is part of your AI literacy <span className="font-medium">{selectedNode.category}</span> assessment.
                </p>

                {selectedNode.score < 80 && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                    <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Consider practicing more scenarios that focus on this competency to improve your score.</span>
                    </p>
                  </div>
                )}

                {selectedNode.score >= 80 && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <p className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Excellent performance! You have demonstrated strong competency in this area.</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Click on a KSA node to view details</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Select any colored node in the knowledge graph</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

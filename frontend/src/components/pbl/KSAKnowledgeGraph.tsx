'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

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

interface Node {
  id: string;
  label: string;
  category: 'knowledge' | 'skills' | 'attitudes' | 'center';
  score?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface Link {
  source: string;
  target: string;
}

export default function KSAKnowledgeGraph({ ksaScores, title, ksaMapping }: KSAKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 600;
    const height = 400;
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
      const radius = 120;
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

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as Node;
          const target = d.target as Node;
          if (source.id === 'center' || target.id === 'center') return 120;
          return 80;
        })
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Create node groups
    const node = svg.append('g')
      .selectAll<SVGGElement, Node>('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', d => d.score !== undefined ? 'pointer' : 'move')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.score !== undefined) {
          setSelectedNode(d);
        }
      })
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => {
        if (d.id === 'center') return 30;
        if (d.category === 'center') return 25;
        return 20;
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
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.id === 'center' || d.category === 'center' ? 4 : -25)
      .attr('font-size', d => {
        if (d.id === 'center') return '14px';
        if (d.category === 'center') return '12px';
        return '10px';
      })
      .attr('font-weight', d => d.id === 'center' || d.category === 'center' ? 'bold' : 'normal')
      .attr('fill', d => d.id === 'center' ? 'white' : '#374151');

    // Add scores for KSA nodes
    node.filter(d => d.score !== undefined)
      .append('text')
      .text(d => `${d.score}%`)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.id !== 'center' && !['knowledge', 'skills', 'attitudes'].includes(d.id)) {
        d.fx = null;
        d.fy = null;
      }
    }

    return () => {
      simulation.stop();
    };
  }, [ksaScores]);

  // Update visual selection state
  useEffect(() => {
    if (!svgRef.current) return;
    
    d3.select(svgRef.current)
      .selectAll('.node-circle')
      .transition()
      .duration(300)
      .attr('stroke-width', function(this: any, d: any) {
        return selectedNode && d.id === selectedNode.id ? 4 : 2;
      })
      .attr('stroke', function(this: any, d: any) {
        if (selectedNode && d.id === selectedNode.id) return '#1f2937';
        if (d.category === 'knowledge') return '#3b82f6';
        if (d.category === 'skills') return '#10b981';
        if (d.category === 'attitudes') return '#a855f7';
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">≥80% Excellent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">60-79% Good</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;60% Needs Work</span>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && selectedNode.score !== undefined && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedNode.id}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedNode.category === 'knowledge' && 'Knowledge Component'}
                {selectedNode.category === 'skills' && 'Skills Component'}
                {selectedNode.category === 'attitudes' && 'Attitudes Component'}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className={`text-3xl font-bold ${getScoreColor(selectedNode.score)}`}>
              {selectedNode.score}%
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreStatus(selectedNode.score).color}`}>
              <span className="mr-1">{getScoreStatus(selectedNode.score).icon}</span>
              {getScoreStatus(selectedNode.score).text}
            </div>
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300">
            {ksaMapping && ksaMapping[selectedNode.id] && (
              <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="font-medium mb-1">Description:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {ksaMapping[selectedNode.id].description}
                </p>
                {ksaMapping[selectedNode.id].level && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Level: {ksaMapping[selectedNode.id].level}
                  </p>
                )}
              </div>
            )}
            <p className="mb-2">
              This competency is part of your AI literacy {selectedNode.category} assessment.
            </p>
            {selectedNode.score < 80 && (
              <p className="italic text-gray-600 dark:text-gray-400">
                Consider practicing more scenarios that focus on this competency to improve your score.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
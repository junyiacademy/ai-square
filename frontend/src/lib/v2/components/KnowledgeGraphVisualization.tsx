'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Info, ZoomIn, ZoomOut, Maximize2, Circle } from 'lucide-react';
import { ksaService, KSAData } from '@/lib/v2/services/ksaService';
import { TaskReview } from './TaskReview';

interface KSANode {
  id: string;
  label: string;
  type: 'center' | 'domain' | 'ksa-type' | 'ksa-theme' | 'ksa-code';
  name?: string;
  value?: number;
  score?: number;
  mastery?: number; // 0=red, 1=yellow, 2=green for KSA codes
  ksaType?: 'knowledge' | 'skills' | 'attitudes';
  description?: string;
  details?: {
    summary?: string;
    explanation?: string;
    correct?: number;
    total?: number;
    questions?: string[];
    tasks?: string[];
    theme?: string;
  };
}

interface KSALink {
  source: string;
  target: string;
  type: 'contains' | 'demonstrates' | 'theme';
  value: number;
}

// Task interface for TaskReview
interface Task {
  id: string;
  title: string;
  type: 'question' | 'conversation' | 'task' | 'reflection';
  content: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer?: string;
  explanation?: string;
  userResponse?: string;
  isCorrect?: boolean;
  timestamp?: Date;
  metadata?: {
    duration?: number;
    turns?: number;
    score?: number;
  };
}

interface KnowledgeGraphProps {
  overallScore?: number; // Optional overall AI literacy score for center node
  ksaDemonstrated: {
    knowledge: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
      mastery?: number; // 0=red, 1=yellow, 2=green
      correct?: number;
      total?: number;
      tasks?: string[]; // Related task IDs
    }>;
    skills: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
      mastery?: number;
      correct?: number;
      total?: number;
      tasks?: string[];
    }>;
    attitudes: Array<{
      code: string;
      name: string;
      description: string;
      competencies: string[];
      mastery?: number;
      correct?: number;
      total?: number;
      tasks?: string[];
    }>;
  };
  tasks?: Task[]; // All available tasks for TaskReview
  language?: string;
}

export function KnowledgeGraphVisualization({ overallScore, ksaDemonstrated, tasks = [], language = 'en' }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<KSANode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ksaData, setKsaData] = useState<KSAData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [showTaskReview, setShowTaskReview] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Load KSA data
  useEffect(() => {
    ksaService.loadKSAData(language).then(data => {
      setKsaData(data);
    }).catch(error => {
      console.error('Failed to load KSA data:', error);
    });
  }, [language]);

  // Traffic light colors for mastery status
  const getTrafficLightColor = (mastery: number): string => {
    switch (mastery) {
      case 0: return '#ef4444'; // Red - completely wrong
      case 1: return '#f59e0b'; // Yellow - partially correct
      case 2: return '#10b981'; // Green - all correct
      default: return '#6b7280'; // Gray - no data
    }
  };

  // Get mastery status description
  const getMasteryDescription = (mastery: number): string => {
    switch (mastery) {
      case 0: return 'Not Demonstrated';
      case 1: return 'Partially Demonstrated';
      case 2: return 'Fully Demonstrated';
      default: return 'No Data';
    }
  };

  // Build graph data
  const buildGraphData = useCallback(() => {
    const nodes: KSANode[] = [];
    const links: KSALink[] = [];

    // Add center node
    nodes.push({
      id: 'center',
      type: 'center',
      label: 'AI Literacy Profile',
      score: overallScore
    });

    // Add KSA type nodes
    const ksaTypes = [
      { id: 'knowledge', label: 'Knowledge', color: '#3b82f6' },
      { id: 'skills', label: 'Skills', color: '#10b981' },
      { id: 'attitudes', label: 'Attitudes', color: '#a855f7' }
    ];

    ksaTypes.forEach(ksaType => {
      nodes.push({
        id: ksaType.id,
        type: 'ksa-type',
        label: ksaType.label,
        ksaType: ksaType.id as 'knowledge' | 'skills' | 'attitudes'
      });
      
      links.push({
        source: 'center',
        target: ksaType.id,
        type: 'contains',
        value: 2
      });
    });

    // Group KSA codes by theme
    const themeGroups: Record<string, Set<string>> = {};

    // Process each KSA type
    Object.entries(ksaDemonstrated).forEach(([type, items]) => {
      items.forEach(item => {
        const ksaInfo = ksaData ? ksaService.getKSAByCode(ksaData, item.code) : null;
        const theme = ksaInfo?.theme || item.name;
        
        // Create theme node if not exists
        const themeId = `theme-${theme}`;
        if (!themeGroups[themeId]) {
          themeGroups[themeId] = new Set();
          nodes.push({
            id: themeId,
            type: 'ksa-theme',
            label: theme.replace(/_/g, ' '),
            ksaType: type as 'knowledge' | 'skills' | 'attitudes',
            name: theme.replace(/_/g, ' ')
          });
          
          // Link theme to KSA type
          links.push({
            source: type,
            target: themeId,
            type: 'theme',
            value: 1.5
          });
        }
        
        // Add code node
        const nodeId = `code-${item.code}`;
        nodes.push({
          id: nodeId,
          type: 'ksa-code',
          label: item.code,
          name: item.code,
          mastery: item.mastery ?? 1, // Default to yellow if not specified
          ksaType: type as 'knowledge' | 'skills' | 'attitudes',
          details: {
            summary: ksaInfo?.summary || item.description,
            explanation: ksaInfo?.explanation,
            correct: item.correct,
            total: item.total,
            theme: theme,
            tasks: item.tasks || []
          }
        });
        
        // Link code to theme
        links.push({
          source: themeId,
          target: nodeId,
          type: 'demonstrates',
          value: 1
        });
        
        themeGroups[themeId].add(nodeId);
      });
    });

    // Removed domain nodes - focusing on KSA structure only

    return { nodes, links };
  }, [overallScore, ksaDemonstrated, ksaData]);

  // Node radius based on type
  const getNodeRadius = (node: KSANode) => {
    switch (node.type) {
      case 'center': return 40;
      case 'ksa-type': return 25;
      case 'ksa-theme': return 18;
      case 'ksa-code': return 12;
      default: return 10;
    }
  };

  // Handle container resize when TaskReview opens/closes
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = Math.min(800, width * 0.75);
      setDimensions({ width, height });
    };

    // Initial resize
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [showTaskReview]); // Re-run when TaskReview visibility changes

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !ksaData) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    // Use current dimensions
    const { width, height } = dimensions;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const g = svg.append('g');

    // Build graph data
    const { nodes, links } = buildGraphData();

    // Create force simulation
    const simulation = d3.forceSimulation<KSANode>(nodes)
      .force('link', d3.forceLink<KSANode, KSALink>(links)
        .id((d) => d.id)
        .distance((d) => {
          const target = d.target as KSANode;
          if (target.type === 'ksa-code') return 50;
          if (target.type === 'ksa-theme') return 80;
          return 100;
        }))
      .force('charge', d3.forceManyBody<KSANode>()
        .strength((d) => {
          if (d.type === 'ksa-code') return -150;
          if (d.type === 'ksa-theme') return -300;
          if (d.type === 'ksa-type') return -400;
          return -500;
        }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<KSANode>()
        .radius((d) => getNodeRadius(d) + 5))
      .force('radial', d3.forceRadial<KSANode>((d) => {
        if (d.type === 'ksa-type') return 100;
        if (d.type === 'ksa-theme') return 180;
        if (d.type === 'ksa-code') return 260;
        return 0;
      }, width / 2, height / 2).strength(0.7));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', (d) => Math.sqrt(d.value))
      .attr('stroke-dasharray', (d) => d.type === 'demonstrates' ? '3,3' : 'none')
      .attr('opacity', 0.6);

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, KSANode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles
    node.append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => {
        // KSA code nodes use traffic light colors
        if (d.type === 'ksa-code' && d.mastery !== undefined) {
          return getTrafficLightColor(d.mastery);
        }
        // Center node color based on overall score
        if (d.type === 'center' && d.score) {
          if (d.score >= 80) return '#10b981';
          if (d.score >= 60) return '#f59e0b';
          return '#ef4444';
        }
        // KSA type colors
        if (d.ksaType === 'knowledge') return '#3b82f6';
        if (d.ksaType === 'skills') return '#10b981';
        if (d.ksaType === 'attitudes') return '#a855f7';
        // Theme colors (lighter versions of parent type)
        if (d.type === 'ksa-theme') {
          if (d.ksaType === 'knowledge') return '#93c5fd';
          if (d.ksaType === 'skills') return '#86efac';
          if (d.ksaType === 'attitudes') return '#c4b5fd';
        }
        // Default
        return '#6b7280';
      })
      .attr('stroke', (d) => {
        // Highlight selected node
        if (selectedNode && d.id === selectedNode.id) {
          return '#4f46e5';
        }
        return '#fff';
      })
      .attr('stroke-width', (d) => {
        // Thicker stroke for selected node
        if (selectedNode && d.id === selectedNode.id) {
          return 4;
        }
        return 2;
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        
        // If clicking on a KSA code node with tasks, show TaskReview
        if (d.type === 'ksa-code' && d.details?.tasks && d.details.tasks.length > 0) {
          setSelectedTaskIds(d.details.tasks);
          setShowTaskReview(true);
        } else {
          // Close task review if clicking non-KSA node or node without tasks
          setShowTaskReview(false);
        }
        
        // Update node highlighting immediately
        svg.selectAll('circle')
          .attr('stroke', (nodeData: any) => {
            if (nodeData.id === d.id) {
              return '#4f46e5';
            }
            return '#fff';
          })
          .attr('stroke-width', (nodeData: any) => {
            if (nodeData.id === d.id) {
              return 4;
            }
            return 2;
          });
      });

    // Add labels
    node.append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => {
        if (d.type === 'ksa-code') return getNodeRadius(d) + 15;
        return '.35em';
      })
      .attr('fill', (d) => {
        if (d.type === 'center' || d.type === 'ksa-type') return 'white';
        return '#374151';
      })
      .attr('font-size', (d) => {
        if (d.type === 'center') return '16px';
        if (d.type === 'ksa-type') return '13px';
        if (d.type === 'ksa-theme') return '11px';
        return '10px';
      })
      .attr('font-weight', (d) => {
        if (d.type === 'center') return 'bold';
        if (d.type === 'ksa-type') return 'semibold';
        return 'normal';
      })
      .style('pointer-events', 'none');

    // Add score label for center node
    node.filter((d) => d.type === 'center' && d.score !== undefined)
      .append('text')
      .text((d) => `${d.score}%`)
      .attr('text-anchor', 'middle')
      .attr('dy', '2.5em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [ksaData, overallScore, ksaDemonstrated, buildGraphData, dimensions, selectedNode]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      zoom * 1.2
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      zoom * 0.8
    );
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  // Auto-reset view when TaskReview opens/closes to fit new container size
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Small delay to allow layout to settle
    const timer = setTimeout(() => {
      handleReset();
    }, 100);

    return () => clearTimeout(timer);
  }, [showTaskReview]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left side - Knowledge Graph */}
      <div className={`${showTaskReview ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">AI Literacy Knowledge Graph</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div ref={containerRef} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <svg ref={svgRef} className="w-full" />
            </div>

            {/* Legend */}
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs">
              <div className="font-semibold mb-2">Legend</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                    <Circle className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <Circle className="w-3 h-3 text-green-500 fill-green-500" />
                  </div>
                  <span>Not / Partial / Full</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-blue-500 fill-blue-500" />
                  <span>Knowledge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-green-500 fill-green-500" />
                  <span>Skills</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 text-purple-500 fill-purple-500" />
                  <span>Attitudes</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 bg-white/90 rounded px-2 py-1 text-xs text-gray-600">
              Click nodes for details • Drag to rearrange • Scroll to zoom
            </div>
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {selectedNode.label}
                    {selectedNode.type === 'center' && selectedNode.score !== undefined && ` - ${selectedNode.score}%`}
                  </h4>
                  
                  {selectedNode.type === 'ksa-code' && selectedNode.mastery !== undefined && (
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className={`w-4 h-4 ${
                        selectedNode.mastery === 2 ? 'text-green-500 fill-green-500' :
                        selectedNode.mastery === 1 ? 'text-yellow-500 fill-yellow-500' :
                        'text-red-500 fill-red-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {getMasteryDescription(selectedNode.mastery)}
                      </span>
                      {selectedNode.details?.correct !== undefined && selectedNode.details?.total !== undefined && (
                        <span className="text-sm text-gray-500">
                          ({selectedNode.details.correct}/{selectedNode.details.total} correct)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {selectedNode.details?.summary && (
                    <p className="text-sm text-gray-600 mb-2">{selectedNode.details.summary}</p>
                  )}
                  
                  {selectedNode.details?.theme && (
                    <div className="text-xs text-gray-500">
                      Theme: <span className="font-medium">{selectedNode.details.theme.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  
                  {selectedNode.type === 'center' && (
                    <p className="text-sm text-gray-600">
                      Your overall AI literacy profile based on assessment results
                    </p>
                  )}
                  
                  {selectedNode.type === 'ksa-type' && (
                    <p className="text-sm text-gray-600">
                      {selectedNode.ksaType === 'knowledge' && 'Facts, concepts, and understanding about AI systems'}
                      {selectedNode.ksaType === 'skills' && 'Practical abilities for working with AI'}
                      {selectedNode.ksaType === 'attitudes' && 'Values and dispositions for ethical AI engagement'}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => setSelectedNode(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Task Review Panel */}
      {showTaskReview && (
        <div className="w-full lg:w-1/2 lg:sticky lg:top-4 h-fit">
          <TaskReview
            tasks={tasks}
            selectedTaskIds={selectedTaskIds}
            onClose={() => setShowTaskReview(false)}
            title="Related Tasks"
            nodeType="KSA"
          />
        </div>
      )}
    </div>
  );
}
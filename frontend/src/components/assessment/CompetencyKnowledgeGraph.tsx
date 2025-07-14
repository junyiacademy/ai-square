'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { AssessmentResult, AssessmentQuestion, UserAnswer } from '../../types/assessment';
import QuestionReview from './QuestionReview';

interface CompetencyKnowledgeGraphProps {
  result: AssessmentResult;
  questions?: AssessmentQuestion[];
  userAnswers?: UserAnswer[];
  domainsData?: unknown[] | null; // Domain competency data from API
  ksaMaps?: {
    kMap: Record<string, { summary: string; theme: string; explanation?: string }>;
    sMap: Record<string, { summary: string; theme: string; explanation?: string }>;
    aMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  } | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'domain' | 'competency' | 'ksa-theme' | 'ksa-code' | 'ksa-subcode';
  name: string;
  score?: number;
  mastery?: number; // For KSA codes: 0=red, 1=yellow, 2=green
  ksaType?: 'knowledge' | 'skills' | 'attitudes';
  parentCode?: string; // For subcodes like K1.1, parent would be K1
  details?: {
    summary?: string;
    explanation?: string;
    correct?: number;
    total?: number;
    questions?: string[];
    theme?: string;
  };
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  value: number;
}

export default function CompetencyKnowledgeGraph({ 
  result, 
  questions = [], 
  userAnswers = [],
  domainsData,
  ksaMaps 
}: CompetencyKnowledgeGraphProps) {
  const { t, i18n } = useTranslation('assessment');
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1400, height: 900 });
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Calculate KSA code mastery based on user answers
  const calculateKSAMastery = useCallback(() => {
    const ksaMastery: Record<string, { correct: number; total: number; questions: string[] }> = {};

    // First pass: collect all KSA codes from all questions (not just answered ones)
    questions.forEach(question => {
      if (question && question.ksa_mapping) {
        const allCodes = [
          ...(question.ksa_mapping.knowledge || []),
          ...(question.ksa_mapping.skills || []),
          ...(question.ksa_mapping.attitudes || [])
        ];
        
        allCodes.forEach(code => {
          if (!ksaMastery[code]) {
            ksaMastery[code] = { correct: 0, total: 0, questions: [] };
          }
          if (question.id) {
            ksaMastery[code].questions.push(question.id);
          }
          ksaMastery[code].total++;
        });
      }
    });

    // Second pass: count correct answers
    userAnswers.forEach(answer => {
      const question = questions.find(q => q && q.id === answer.questionId);
      if (!question || !question.ksa_mapping) return;

      if (answer.isCorrect) {
        const allCodes = [
          ...(question.ksa_mapping.knowledge || []),
          ...(question.ksa_mapping.skills || []),
          ...(question.ksa_mapping.attitudes || [])
        ];
        
        allCodes.forEach(code => {
          if (ksaMastery[code]) {
            ksaMastery[code].correct++;
          }
        });
      }
    });

    return ksaMastery;
  }, [questions, userAnswers]);

  // Get mastery status: 0 = red (no correct), 1 = yellow (some correct), 2 = green (all correct)
  const getMasteryStatus = (correct: number, total: number): number => {
    if (total === 0) return 0;
    if (correct === 0) return 0; // Red: completely wrong
    if (correct === total) return 2; // Green: all correct
    return 1; // Yellow: partially correct
  };

  // Build graph data structure focusing on KSA codes
  const buildGraphData = useCallback(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const ksaMastery = calculateKSAMastery();

    // Add center node
    nodes.push({
      id: 'center',
      type: 'domain',
      name: t('results.knowledgeGraph.yourProfile'),
      score: result.overallScore
    });

    // Create KSA type parent nodes
    const ksaTypes = [
      { id: 'knowledge', name: t('quiz.knowledge'), color: '#3b82f6' },
      { id: 'skills', name: t('quiz.skills'), color: '#10b981' },
      { id: 'attitudes', name: t('quiz.attitudes'), color: '#a855f7' }
    ];

    ksaTypes.forEach(ksaType => {
      nodes.push({
        id: ksaType.id,
        type: 'ksa-theme',
        name: ksaType.name,
        ksaType: ksaType.id as 'knowledge' | 'skills' | 'attitudes'
      });
      
      links.push({
        source: 'center',
        target: ksaType.id,
        value: 1
      });
    });

    // Group codes by parent (e.g., K1, K1.1, K1.2 -> K1 is parent)
    const parentCodes = new Map<string, string[]>();
    const allCodes = Object.keys(ksaMastery);
    
    allCodes.forEach(code => {
      // Check if this is a subcode (e.g., K1.1)
      const match = code.match(/^([KSA]\d+)\.(\d+)$/);
      if (match) {
        const parentCode = match[1];
        if (!parentCodes.has(parentCode)) {
          parentCodes.set(parentCode, []);
        }
        parentCodes.get(parentCode)!.push(code);
      } else {
        // This is a parent code (e.g., K1)
        if (!parentCodes.has(code)) {
          parentCodes.set(code, []);
        }
      }
    });

    // First, add all parent nodes (e.g., K1, S2, A3)
    parentCodes.forEach((subcodes, parentCode) => {
      if (!ksaMastery[parentCode]) {
        // Parent code doesn't have its own data, skip it
        return;
      }
      
      const ksaMap = parentCode.startsWith('K') ? ksaMaps?.kMap : 
                     parentCode.startsWith('S') ? ksaMaps?.sMap : 
                     ksaMaps?.aMap;
      
      const ksaInfo = ksaMap?.[parentCode];
      if (!ksaInfo) return;
      
      const ksaType = parentCode.startsWith('K') ? 'knowledge' : 
                      parentCode.startsWith('S') ? 'skills' : 'attitudes';
      
      const data = ksaMastery[parentCode];
      const masteryStatus = getMasteryStatus(data.correct, data.total);
      
      nodes.push({
        id: `code-${parentCode}`,
        type: 'ksa-code',
        name: parentCode,
        mastery: masteryStatus,
        ksaType,
        parentCode: undefined,
        details: { 
          summary: ksaInfo.summary,
          explanation: ksaInfo.explanation,
          correct: data.correct,
          total: data.total,
          questions: data.questions,
          theme: ksaInfo.theme
        }
      });
      
      // Link to KSA type
      links.push({
        source: ksaType,
        target: `code-${parentCode}`,
        value: 0.8
      });
    });
    
    // Then add all nodes (including subcodes)
    Object.entries(ksaMastery).forEach(([code, data]) => {
      // Skip if already added as parent
      if (nodes.some(n => n.id === `code-${code}`)) return;
      
      const ksaMap = code.startsWith('K') ? ksaMaps?.kMap : 
                     code.startsWith('S') ? ksaMaps?.sMap : 
                     ksaMaps?.aMap;
      
      const ksaInfo = ksaMap?.[code];
      if (!ksaInfo) return;

      const ksaType = code.startsWith('K') ? 'knowledge' : 
                      code.startsWith('S') ? 'skills' : 'attitudes';
      
      const masteryStatus = getMasteryStatus(data.correct, data.total);
      
      // Check if this is a subcode
      const isSubcode = code.includes('.');
      const parentMatch = code.match(/^([KSA]\d+)\.(\d+)$/);
      const parentCode = parentMatch ? parentMatch[1] : undefined;
      
      // Add code node
      nodes.push({
        id: `code-${code}`,
        type: isSubcode ? 'ksa-subcode' : 'ksa-code',
        name: code,
        mastery: masteryStatus,
        ksaType,
        parentCode,
        details: { 
          summary: ksaInfo.summary,
          explanation: ksaInfo.explanation,
          correct: data.correct,
          total: data.total,
          questions: data.questions,
          theme: ksaInfo.theme
        }
      });
      
      // Link to parent - either KSA type or parent code
      if (isSubcode && parentCode) {
        // Check if parent node exists
        const parentNodeExists = nodes.some(n => n.id === `code-${parentCode}`);
        if (parentNodeExists) {
          // Subcode links to parent code (e.g., K1.1 -> K1)
          links.push({
            source: `code-${parentCode}`,
            target: `code-${code}`,
            value: 0.6
          });
        } else {
          // If parent doesn't exist, link directly to KSA type
          links.push({
            source: ksaType,
            target: `code-${code}`,
            value: 0.8
          });
        }
      } else {
        // Parent code links to KSA type (e.g., K1 -> knowledge)
        links.push({
          source: ksaType,
          target: `code-${code}`,
          value: 0.8
        });
      }
    });

    return { nodes, links };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, userAnswers, ksaMaps, result, t]);

  // Traffic light colors for mastery status
  const getTrafficLightColor = (mastery: number): string => {
    switch (mastery) {
      case 0: return '#ef4444'; // Red - completely wrong
      case 1: return '#f59e0b'; // Yellow - partially correct
      case 2: return '#10b981'; // Green - all correct
      default: return '#6b7280'; // Gray - no data
    }
  };

  // Node size based on type - made larger for better visibility
  const getNodeRadius = (node: GraphNode) => {
    switch (node.type) {
      case 'domain': return node.id === 'center' ? 50 : 35;
      case 'competency': return 25;
      case 'ksa-theme': return 35;
      case 'ksa-code': return 18;
      case 'ksa-subcode': return 12;
      default: return 15;
    }
  };

  useEffect(() => {
    if (!svgRef.current || !domainsData || !ksaMaps) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const { nodes, links } = buildGraphData();
    
    // Set up SVG
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    // Add zoom behavior
    const g = svg.append('g');
    
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        })
    );

    // Set up force simulation with better spacing for KSA codes
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id)
        .distance((d) => {
          // Increased distances for better spacing
          const target = d.target as GraphNode;
          if (target.type === 'ksa-subcode') return 80;
          if (target.type === 'ksa-code') return 120;
          if (target.type === 'ksa-theme') return 180;
          return 200;
        }))
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength((d) => {
          // Much stronger repulsion to spread nodes apart
          if (d.type === 'ksa-subcode') return -300;
          if (d.type === 'ksa-code') return -500;
          if (d.type === 'ksa-theme') return -800;
          return -1000;
        }))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius((d) => getNodeRadius(d) + 20))
      .force('radial', d3.forceRadial<GraphNode>((d) => {
        // Larger radial distances for better spacing
        if (d.type === 'ksa-theme') return 200;
        if (d.type === 'ksa-code') return 350;
        if (d.type === 'ksa-subcode') return 450;
        return 0;
      }, dimensions.width / 2, dimensions.height / 2).strength(0.6));

    // Add links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.value) * 2);

    // Add nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call((d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)) as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => {
        // For KSA code and subcode nodes, use traffic light colors
        if ((d.type === 'ksa-code' || d.type === 'ksa-subcode') && d.mastery !== undefined) {
          return getTrafficLightColor(d.mastery);
        }
        // For center node, use score-based color
        if (d.type === 'domain' && d.id === 'center') {
          const score = d.score || 0;
          if (score >= 80) return '#10b981';
          if (score >= 60) return '#f59e0b';
          return '#ef4444';
        }
        // Default colors by KSA type
        switch (d.ksaType) {
          case 'knowledge': return '#3b82f6';
          case 'skills': return '#10b981';
          case 'attitudes': return '#a855f7';
          default: return '#6b7280';
        }
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
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
        // If clicking on a KSA code or subcode node, show related questions
        if ((d.type === 'ksa-code' || d.type === 'ksa-subcode') && d.details?.questions && d.details.questions.length > 0) {
          setSelectedQuestionIds(d.details.questions);
          setShowQuestionReview(true);
        } else {
          // Close question review if clicking non-KSA node
          setShowQuestionReview(false);
        }
      });

    // Add labels with better positioning
    node.append('text')
      .attr('dy', (d) => d.type === 'domain' && d.id === 'center' ? '.35em' : '-.8em')
      .attr('text-anchor', 'middle')
      .style('font-size', (d) => {
        switch (d.type) {
          case 'domain': return d.id === 'center' ? '16px' : '14px';
          case 'competency': return '13px';
          case 'ksa-theme': return '14px';
          case 'ksa-code': return '12px';
          case 'ksa-subcode': return '11px';
          default: return '12px';
        }
      })
      .style('font-weight', (d) => (d.type === 'domain' || d.type === 'ksa-theme') ? 'bold' : 'normal')
      .style('fill', (d) => {
        // Use contrasting colors for better readability
        if (d.type === 'ksa-theme') return '#1f2937';
        if (d.type === 'ksa-code' || d.type === 'ksa-subcode') return '#374151';
        return '#111827';
      })
      .text((d) => d.name);

    // Add tooltips
    const tooltip = d3.select('body').append('div')
      .attr('class', 'knowledge-graph-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none');

    node
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', .9);
        let content = `<strong>${d.name}</strong><br/>`;
        
        // For KSA code and subcode nodes, show correct/total
        if ((d.type === 'ksa-code' || d.type === 'ksa-subcode') && d.details) {
          const status = d.mastery === 2 ? '✅ 全對' : 
                        d.mastery === 1 ? '⚠️ 部分正確' : 
                        '❌ 完全錯誤';
          content += `${status}<br/>`;
          content += `答對: ${d.details.correct}/${d.details.total} 題<br/>`;
          if (d.details.summary) {
            content += `<br/>${d.details.summary}`;
          }
        } else if (d.mastery !== undefined && d.type !== 'ksa-code' && d.type !== 'ksa-subcode') {
          content += `${t('results.knowledgeGraph.mastery')}: ${d.score || 0}%<br/>`;
        }
        
        if (d.details?.explanation) {
          content += `<br/><em>${d.details.explanation}</em>`;
        }
        
        tooltip.html(content)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode & {x: number; y: number}).x)
        .attr('y1', (d) => (d.source as GraphNode & {x: number; y: number}).y)
        .attr('x2', (d) => (d.target as GraphNode & {x: number; y: number}).x)
        .attr('y2', (d) => (d.target as GraphNode & {x: number; y: number}).y);

      node.attr('transform', (d) => `translate(${(d as GraphNode & {x: number; y: number}).x},${(d as GraphNode & {x: number; y: number}).y})`);
    });

    // Drag functions
    function dragstarted(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Update node appearance when selection changes
    if (selectedNode) {
      d3.select(svgRef.current)
        .selectAll('circle')
        .attr('stroke', (d) => (d as GraphNode).id === selectedNode.id ? '#4f46e5' : '#fff')
        .attr('stroke-width', (d) => (d as GraphNode).id === selectedNode.id ? 4 : 2);
    }

    // Add click handler to SVG background to reset zoom
    svg.on('click', () => {
      // Reset zoom when clicking on background
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
      setSelectedNode(null);
      setShowQuestionReview(false);
    });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainsData, ksaMaps, result, questions, userAnswers, i18n.language, selectedNode]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.min(800, container.clientWidth * 0.67)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showQuestionReview]); // Re-calculate when panel opens/closes

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left side - Knowledge Graph */}
      <div className={`${showQuestionReview ? 'lg:w-1/2' : 'w-full'} transition-all duration-300`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('results.knowledgeGraph.title')}
          </h3>
          <p className="text-gray-600 text-sm">
            {t('results.knowledgeGraph.description')}
          </p>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
            <span className="text-xs sm:text-sm text-gray-600">完全錯誤 / 部分正確 / 全對</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-xs sm:text-sm text-gray-600">K (知識)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs sm:text-sm text-gray-600">S (技能)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-xs sm:text-sm text-gray-600">A (態度)</span>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-2 text-xs text-gray-500">
          <p className="sm:hidden">提示：使用雙指縮放查看細節</p>
          <p>提示：點擊 KSA 代碼節點可查看相關題目</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg overflow-hidden touch-none" style={{ height: '900px' }}>
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
          <h4 className="font-semibold text-gray-900 mb-2">{selectedNode.name}</h4>
          {selectedNode.details?.summary && (
            <p className="text-sm text-gray-700 mb-3">{selectedNode.details.summary}</p>
          )}
          {(selectedNode.type === 'ksa-code' || selectedNode.type === 'ksa-subcode') && selectedNode.details && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                {selectedNode.mastery === 2 && <span className="text-green-600 text-lg">✅ 全對</span>}
                {selectedNode.mastery === 1 && <span className="text-yellow-600 text-lg">⚠️ 部分正確</span>}
                {selectedNode.mastery === 0 && <span className="text-red-600 text-lg">❌ 完全錯誤</span>}
              </div>
              <div className="text-sm text-gray-600">
                答對: {selectedNode.details.correct}/{selectedNode.details.total} 題
              </div>
              {selectedNode.details.questions && selectedNode.details.questions.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  相關題目: {selectedNode.details.questions.length} 題
                </div>
              )}
            </div>
          )}
          {selectedNode.details?.theme && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">主題：</span>
              <span className="inline-block ml-1 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {t(selectedNode.details.theme.replace(/ /g, '_'))}
              </span>
            </div>
          )}
          {selectedNode.details?.explanation && (
            <p className="text-sm text-gray-600 italic mt-2">{selectedNode.details.explanation}</p>
          )}
        </div>
      )}
      </div>
      
      {/* Right side - Question Review Panel */}
      {showQuestionReview && (
        <div className="w-full lg:w-1/2 lg:sticky lg:top-4 h-fit">
          <QuestionReview
            questions={questions}
            userAnswers={userAnswers}
            selectedQuestionIds={selectedQuestionIds}
            onClose={() => setShowQuestionReview(false)}
          />
        </div>
      )}
    </div>
  );
}
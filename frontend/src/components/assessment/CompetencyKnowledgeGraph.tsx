'use client';

/**
 * Knowledge Graph Component (Refactored)
 * Displays assessment results as an interactive graph visualization
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AssessmentResult, AssessmentQuestion, UserAnswer } from '../../types/assessment';
import QuestionReview from './QuestionReview';
import { GraphNode, KnowledgeGraphProps } from './knowledge-graph/types';
import { buildGraphData } from './knowledge-graph/graph-builder';
import { useGraphRenderer } from './knowledge-graph/use-graph-renderer';
import { GRAPH_CONFIG } from './knowledge-graph/constants';

export default function CompetencyKnowledgeGraph({
  result,
  questions = [],
  userAnswers = [],
  domainsData,
  ksaMaps
}: KnowledgeGraphProps) {
  const { t, i18n } = useTranslation('assessment');
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: GRAPH_CONFIG.defaultWidth,
    height: GRAPH_CONFIG.defaultHeight
  });
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Build graph data
  const graphData = useMemo(
    () => buildGraphData(
      result,
      questions as AssessmentQuestion[],
      userAnswers as UserAnswer[],
      ksaMaps || null,
      t
    ),
    [result, questions, userAnswers, ksaMaps, t]
  );

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);

    if ((node.type === 'ksa-code' || node.type === 'ksa-subcode') &&
        node.details?.questions?.length) {
      setSelectedQuestionIds(node.details.questions);
      setShowQuestionReview(true);
    } else {
      setShowQuestionReview(false);
    }
  }, []);

  // Render graph with D3
  useGraphRenderer(
    svgRef,
    graphData,
    dimensions,
    selectedNode,
    handleNodeClick,
    [graphData, dimensions, selectedNode, i18n.language]
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.min(
            GRAPH_CONFIG.maxHeight,
            container.clientWidth * GRAPH_CONFIG.aspectRatio
          )
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showQuestionReview]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Graph */}
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

      {/* Question Review Panel */}
      {showQuestionReview && (
        <div className="w-full lg:w-1/2 lg:sticky lg:top-4 h-fit">
          <QuestionReview
            questions={questions as AssessmentQuestion[]}
            userAnswers={userAnswers as UserAnswer[]}
            selectedQuestionIds={selectedQuestionIds}
            onClose={() => setShowQuestionReview(false)}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

interface TaskWorkflowProps {
  taskId: string;
  taskTitle: string;
  onComplete: (answer?: string) => void;
  onProgressUpdate: (progress: number) => void;
  previousAnswer?: string; // Show previous answer if available
  isEditMode?: boolean; // True when editing a completed task
  isViewOnlyMode?: boolean; // True when just viewing answers (no editing)
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: 'input' | 'chat' | 'edit' | 'submit';
}

export default function TaskWorkflow({ taskId, taskTitle, onComplete, onProgressUpdate, previousAnswer, isEditMode, isViewOnlyMode }: TaskWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(isEditMode ? 2 : isViewOnlyMode ? 0 : 0); // Start at appropriate step
  const [stepData, setStepData] = useState<Record<string, any>>({});
  
  // Parse previous answer if it's a structured object
  const parsedPreviousAnswer = React.useMemo(() => {
    if (!previousAnswer) return null;
    
    try {
      // Check if it's a JSON string containing step data
      const parsed = typeof previousAnswer === 'string' && previousAnswer.startsWith('{') 
        ? JSON.parse(previousAnswer) 
        : null;
      
      if (parsed && parsed.steps) {
        return parsed;
      }
    } catch (e) {
      // Not JSON, treat as simple string
    }
    
    // Return as simple answer for backward compatibility
    return { finalAnswer: previousAnswer };
  }, [previousAnswer]);
  
  // Check if answer is a migration placeholder
  const isMigrationPlaceholder = (text: string) => {
    return text && (
      text.includes('此任務在答案保存功能實施前完成') ||
      text.includes('暫無保存的') ||
      text === '此任務在答案保存功能實施前完成，暫無保存的答案內容。'
    );
  };
  
  // Initialize step answers - treat migration placeholders as empty
  const [videoTopic, setVideoTopic] = useState(() => {
    const value = parsedPreviousAnswer?.steps?.understand || parsedPreviousAnswer?.finalAnswer || '';
    return isMigrationPlaceholder(value) ? '' : value;
  });
  const [scriptOutline, setScriptOutline] = useState(() => {
    const value = parsedPreviousAnswer?.steps?.plan || parsedPreviousAnswer?.finalAnswer || '';
    return isMigrationPlaceholder(value) ? '' : value;
  });
  const [finalScript, setFinalScript] = useState(() => {
    const value = parsedPreviousAnswer?.steps?.execute || parsedPreviousAnswer?.finalAnswer || '';
    return isMigrationPlaceholder(value) ? '' : value;
  });
  const [taskAnswer, setTaskAnswer] = useState(() => {
    const value = parsedPreviousAnswer?.finalAnswer || '';
    return isMigrationPlaceholder(value) ? '' : value;
  });

  // Update content when previousAnswer changes (e.g., when switching tasks)
  React.useEffect(() => {
    if (parsedPreviousAnswer) {
      if (parsedPreviousAnswer.steps) {
        const understand = parsedPreviousAnswer.steps.understand || '';
        const plan = parsedPreviousAnswer.steps.plan || '';
        const execute = parsedPreviousAnswer.steps.execute || '';
        
        setVideoTopic(isMigrationPlaceholder(understand) ? '' : understand);
        setScriptOutline(isMigrationPlaceholder(plan) ? '' : plan);
        setFinalScript(isMigrationPlaceholder(execute) ? '' : execute);
      } else if (parsedPreviousAnswer.finalAnswer) {
        // Backward compatibility: fill all fields with the same answer
        const answer = parsedPreviousAnswer.finalAnswer;
        if (!isMigrationPlaceholder(answer)) {
          setVideoTopic(answer);
          setScriptOutline(answer);
          setFinalScript(answer);
        } else {
          setVideoTopic('');
          setScriptOutline('');
          setFinalScript('');
        }
      }
      const finalAnswer = parsedPreviousAnswer.finalAnswer || '';
      setTaskAnswer(isMigrationPlaceholder(finalAnswer) ? '' : finalAnswer);
    }
  }, [parsedPreviousAnswer]);

  // Reset to edit step when taskId changes (new task selected)
  React.useEffect(() => {
    if (isEditMode) {
      setCurrentStep(2); // Jump to edit step for editing
    }
  }, [taskId, isEditMode]);

  // Define workflow steps based on task
  const getWorkflowSteps = (): WorkflowStep[] => {
    // All steps including submit
    return [
      {
        id: 'understand',
        title: '理解任務',
        description: '了解任務目標和要求',
        icon: LightBulbIcon,
        action: 'input' as const
      },
      {
        id: 'plan',
        title: '與 AI 討論計劃',
        description: '和 AI 助手一起規劃方案',
        icon: ChatBubbleLeftRightIcon,
        action: 'chat' as const
      },
      {
        id: 'execute',
        title: '執行任務',
        description: '實作你的解決方案',
        icon: DocumentTextIcon,
        action: 'edit' as const
      },
      {
        id: 'submit',
        title: '提交成果',
        description: '完成並提交你的作品',
        icon: CheckCircleIcon,
        action: 'submit' as const
      }
    ];
  };

  const steps = getWorkflowSteps();
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  React.useEffect(() => {
    onProgressUpdate(progress);
  }, [currentStep, steps.length, onProgressUpdate]); // Use currentStep instead of progress

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Save all step answers as a structured object
      const structuredAnswer = {
        steps: {
          understand: videoTopic,
          plan: scriptOutline,
          execute: finalScript
        },
        finalAnswer: finalScript || taskAnswer || scriptOutline || videoTopic,
        timestamp: new Date().toISOString()
      };
      
      // Convert to JSON string for storage
      onComplete(JSON.stringify(structuredAnswer));
    }
  };

  const renderStepContent = () => {
    // In view-only mode, show content without edit capability
    if (isViewOnlyMode) {
      switch (currentStepData.action) {
        case 'input':
          return (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任務目標
                </label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className={videoTopic ? "text-gray-800" : "text-gray-400 italic"}>
                    {videoTopic || '此任務在答案保存功能實施前完成'}
                  </p>
                </div>
              </div>
            </div>
          );
          
        case 'chat':
          return (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  執行計劃
                </label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[100px]">
                  <p className={scriptOutline ? "text-gray-800 whitespace-pre-wrap" : "text-gray-400 italic"}>
                    {scriptOutline || '此任務在答案保存功能實施前完成'}
                  </p>
                </div>
              </div>
            </div>
          );
          
        case 'edit':
          return (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  成果內容
                </label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[200px]">
                  <p className={finalScript ? "text-gray-800 whitespace-pre-wrap" : "text-gray-400 italic"}>
                    {finalScript || '此任務在答案保存功能實施前完成'}
                  </p>
                </div>
              </div>
            </div>
          );
          
        case 'submit':
          return (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  任務已完成
                </h3>
                <p className="text-gray-600">
                  你已經成功完成了「{taskTitle}」任務
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-left">
                <h4 className="font-medium text-purple-900 mb-2">AI 評估</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">結構完整度</span>
                    <span className="text-purple-600 font-medium">★★★★☆</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">內容創意度</span>
                    <span className="text-purple-600 font-medium">★★★★★</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">觀眾吸引力</span>
                    <span className="text-purple-600 font-medium">★★★★☆</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {parsedPreviousAnswer?.timestamp 
                    ? `提交時間：${new Date(parsedPreviousAnswer.timestamp).toLocaleString('zh-TW')}`
                    : '任務已提交'}
                </p>
              </div>
            </div>
          );
          
        default:
          return null;
      }
    }
    
    // Normal edit mode
    switch (currentStepData.action) {
      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任務目標
              </label>
              <input
                type="text"
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                placeholder={isEditMode && !videoTopic ? "此任務在答案保存功能實施前完成，請補充你的答案..." : `請描述你對「${taskTitle}」的理解和目標...`}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                <SparklesIcon className="w-4 h-4 mr-2" />
                任務提示
              </h4>
              <ul className="space-y-2 text-sm text-purple-700">
                <li>• 仔細閱讀任務描述</li>
                <li>• 思考你想達成的目標</li>
                <li>• 準備好與 AI 討論你的想法</li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (videoTopic.trim()) {
                  setStepData({ ...stepData, topic: videoTopic });
                  handleNextStep();
                }
              }}
              disabled={!videoTopic.trim()}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
            >
              下一步
            </button>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">
                      太好了！我了解你的目標了。讓我幫你制定執行計劃：
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm font-medium mb-2">建議的執行步驟：</p>
                    <ol className="text-sm space-y-1">
                      <li>1. 分析任務需求</li>
                      <li>2. 制定解決方案</li>
                      <li>3. 逐步實施計劃</li>
                      <li>4. 檢查和優化成果</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <textarea
              value={scriptOutline}
              onChange={(e) => setScriptOutline(e.target.value)}
              placeholder={isEditMode && !scriptOutline ? "此任務在答案保存功能實施前完成，請補充你的計劃..." : "在這裡記錄你的執行計劃和想法..."}
              className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none"
            />

            <button
              onClick={() => {
                setStepData({ ...stepData, outline: scriptOutline });
                handleNextStep();
              }}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              繼續執行任務
            </button>
          </div>
        );

      case 'edit':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>任務：</strong>{taskTitle}
              </p>
              {isEditMode && (
                <p className="text-xs text-blue-600 mt-1">
                  正在編輯已完成的任務答案
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成果內容
              </label>
              <textarea
                value={finalScript}
                onChange={(e) => {
                  setFinalScript(e.target.value);
                  setTaskAnswer(e.target.value); // Update task answer
                }}
                placeholder={isEditMode && !finalScript 
                  ? "此任務在答案保存功能實施前完成，請補充你的任務成果..." 
                  : `請在這裡記錄你的任務成果...

包括：
- 完成的內容
- 使用的方法
- 學到的經驗`}
                className="w-full h-64 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors resize-none font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>字數：{finalScript.length} 字</span>
              <span>任務：{taskTitle}</span>
            </div>

            <button
              onClick={() => {
                if (finalScript.trim()) {
                  setStepData({ ...stepData, script: finalScript });
                  handleNextStep();
                }
              }}
              disabled={!finalScript.trim()}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
            >
              {isEditMode ? '更新答案' : '完成並提交'}
            </button>
          </div>
        );

      case 'submit':
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                太棒了！任務完成！
              </h3>
              <p className="text-gray-600">
                你已經成功完成了「{taskTitle}」任務
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-purple-900 mb-2">AI 評估</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">結構完整度</span>
                  <span className="text-purple-600 font-medium">★★★★☆</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">內容創意度</span>
                  <span className="text-purple-600 font-medium">★★★★★</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">觀眾吸引力</span>
                  <span className="text-purple-600 font-medium">★★★★☆</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                // Save all step answers as a structured object
                const structuredAnswer = {
                  steps: {
                    understand: videoTopic,
                    plan: scriptOutline,
                    execute: finalScript
                  },
                  finalAnswer: finalScript || taskAnswer || scriptOutline || videoTopic,
                  timestamp: new Date().toISOString()
                };
                
                // Convert to JSON string for storage
                onComplete(JSON.stringify(structuredAnswer));
              }}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              完成任務
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <motion.div
                    onClick={() => {
                      // Allow navigating in view-only mode, edit mode, or to completed steps
                      if (isViewOnlyMode || isCompleted || isEditMode) {
                        setCurrentStep(index);
                      }
                    }}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isActive ? '#7c3aed' : isCompleted ? '#10b981' : '#e5e7eb'
                    }}
                    whileHover={(isViewOnlyMode || isCompleted || isEditMode) ? { scale: 1.15 } : {}}
                    whileTap={(isViewOnlyMode || isCompleted || isEditMode) ? { scale: 0.95 } : {}}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}
                      ${(isViewOnlyMode || isCompleted || isEditMode) ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.div>
                  <span className={`
                    text-xs mt-2 font-medium
                    ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                  `}>
                    {step.title}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`
                    flex-1 h-1 mx-2 rounded
                    ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
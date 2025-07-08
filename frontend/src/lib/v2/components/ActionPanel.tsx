'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/v2/types';
import { Send, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface ActionPanelProps {
  task: Task;
  learningType: string;
  onComplete: (evaluation: any) => void;
  onAction: (action: string, data: any) => void;
}

export function ActionPanel({ task, learningType, onComplete, onAction }: ActionPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Reset state when task changes
    setInput('');
    setMessages([]);
    setSelectedAnswers({});
    setIsCompleted(false);
    setEvaluation(null);
  }, [task.id]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    onAction('message_sent', { content: userMessage });
    setLoading(true);

    try {
      // Simulate AI response (in real implementation, call API)
      setTimeout(() => {
        const aiResponse = generateAIResponse(task, userMessage);
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: any) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    onAction('answer_selected', { question_id: questionId, answer });
  };

  const handleSubmitAssessment = () => {
    const results = evaluateAssessment(task, selectedAnswers);
    setEvaluation(results);
    setIsCompleted(true);
    onComplete(results);
  };

  const handleTaskComplete = () => {
    const taskEvaluation = {
      completed: true,
      score: 100,
      feedback: 'Great job completing this task!'
    };
    setEvaluation(taskEvaluation);
    setIsCompleted(true);
    onComplete(taskEvaluation);
  };

  // Render different interfaces based on task type
  if (task.task_type === 'assessment' && task.metadata?.questions) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4">Assessment</h2>
        
        {!isCompleted ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {task.metadata.questions.map((question: any, index: number) => (
                <div key={question.id} className="bg-white rounded-lg p-4 border">
                  <p className="font-medium mb-3">
                    {index + 1}. {question.question}
                  </p>
                  
                  {question.type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {question.options.map((option: string, optIndex: number) => (
                        <label
                          key={optIndex}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={optIndex}
                            checked={selectedAnswers[question.id] === optIndex}
                            onChange={() => handleAnswerSelect(question.id, optIndex)}
                            className="text-blue-600"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={handleSubmitAssessment}
              disabled={Object.keys(selectedAnswers).length < task.metadata.questions.length}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Assessment
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Assessment Complete!</h3>
            <p className="text-gray-600 text-center mb-4">
              Score: {evaluation?.score}%
            </p>
            <p className="text-gray-600 text-center">
              {evaluation?.feedback}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default chat interface for learning and practice
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        AI Assistant
      </h2>
      
      {!isCompleted ? (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>Start a conversation with your AI tutor!</p>
                <p className="text-sm mt-2">Ask questions or request help with the task.</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {task.task_type !== 'assessment' && (
              <button
                onClick={handleTaskComplete}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark Task as Complete
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Task Complete!</h3>
          <p className="text-gray-600 text-center">
            {evaluation?.feedback || 'Great job! You can now proceed to the next task.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function generateAIResponse(task: Task, userMessage: string): string {
  // In real implementation, this would call an AI API
  const responses = [
    "That's a great question! Let me help you understand this better...",
    "You're on the right track! Consider thinking about...",
    "Excellent observation! This relates to...",
    "Let me clarify that concept for you..."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] + 
    ` Based on the task "${task.title}", ${userMessage.toLowerCase()}`;
}

function evaluateAssessment(task: Task, answers: Record<string, any>) {
  if (!task.metadata?.questions) return null;
  
  let correct = 0;
  const total = task.metadata.questions.length;
  
  task.metadata.questions.forEach((question: any) => {
    if (answers[question.id] === question.correct_answer) {
      correct++;
    }
  });
  
  const score = Math.round((correct / total) * 100);
  
  return {
    score,
    correct,
    total,
    feedback: score >= 70 
      ? 'Excellent work! You have a strong understanding of the concepts.'
      : 'Good effort! Review the material and try again to improve your score.'
  };
}
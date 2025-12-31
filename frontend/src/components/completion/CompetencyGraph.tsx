"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface TaskRecord {
  taskId: string;
  taskTitle: string;
  taskIndex: number;
  status: "completed" | "pending" | "active";
  score?: number;
  userAnswer?: string;
  correctAnswer?: string;
  timeSpent?: number;
  interactions?: Array<{
    timestamp: string;
    type: "user_input" | "ai_response";
    content: string;
  }>;
}

interface CompetencyGraphProps {
  tasks: TaskRecord[];
  domainScores: Record<string, number>;
  overallScore: number;
  language?: string;
}

export default function CompetencyGraph({
  tasks,
  domainScores,
  overallScore,
  language = "en",
}: CompetencyGraphProps) {
  const domains = Object.entries(domainScores);

  return (
    <div className="space-y-6">
      {/* Competency Knowledge Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {language === "zhTW"
              ? "能力知識圖譜"
              : "Competency Knowledge Graph"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === "zhTW" ? "整體得分" : "Overall Score"}
                </span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {overallScore}/100
                </span>
              </div>
              <Progress value={overallScore} className="h-3" />
            </div>

            {/* Domain Scores */}
            <div className="grid gap-3">
              {domains.map(([domain, score]) => (
                <div
                  key={domain}
                  className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium capitalize">
                      {domain.replace(/_/g, " ")}
                    </span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {score}
                    </span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Review - 題目回顧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            {language === "zhTW"
              ? "題目回顧與做題紀錄"
              : "Question Review & Practice Records"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {tasks.map((task, _index) => (
              <div
                key={task.taskId}
                className="border rounded-lg p-4 hover:shadow-lg transition-all duration-200"
              >
                {/* Task Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-purple-600 dark:text-purple-400">
                        #{task.taskIndex}
                      </span>
                      {task.taskTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : task.status === "active" ? (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Score and Time */}
                {task.status === "completed" && (
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {language === "zhTW" ? "得分" : "Score"}
                      </span>
                      <p className="font-bold text-lg">{task.score || 0}/100</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {language === "zhTW" ? "用時" : "Time Spent"}
                      </span>
                      <p className="font-bold text-lg">
                        {task.timeSpent
                          ? `${Math.floor(task.timeSpent / 60)}m ${task.timeSpent % 60}s`
                          : "--"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Practice Records - 做題紀錄 */}
                {task.interactions && task.interactions.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700">
                      {language === "zhTW"
                        ? "查看做題紀錄"
                        : "View Practice Records"}
                      ({task.interactions.length}{" "}
                      {language === "zhTW" ? "次互動" : "interactions"})
                    </summary>
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {task.interactions.map((interaction, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm ${
                            interaction.type === "user_input"
                              ? "bg-blue-50 dark:bg-blue-900/20 ml-4"
                              : "bg-gray-50 dark:bg-gray-800 mr-4"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-xs text-gray-500">
                              {interaction.type === "user_input"
                                ? language === "zhTW"
                                  ? "你的回答"
                                  : "Your Answer"
                                : language === "zhTW"
                                  ? "AI 回饋"
                                  : "AI Feedback"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(
                                interaction.timestamp,
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">
                            {interaction.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* User Answer vs Correct Answer */}
                {task.status === "completed" && task.userAnswer && (
                  <div className="mt-3 grid gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {language === "zhTW" ? "你的答案：" : "Your Answer:"}
                      </span>
                      <p className="mt-1 text-sm">{task.userAnswer}</p>
                    </div>
                    {task.correctAnswer &&
                      task.correctAnswer !== task.userAnswer && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            {language === "zhTW"
                              ? "正確答案："
                              : "Correct Answer:"}
                          </span>
                          <p className="mt-1 text-sm">{task.correctAnswer}</p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { Edit3, Settings, FileText } from "lucide-react";
import { TaskTemplate } from "./TaskList";

interface TaskDetailProps {
  task: TaskTemplate;
  language: string;
  editingField: string | null;
  editingValue: string;
  onStartEditing: (field: string, value: string) => void;
  onEditingValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function TaskDetail({
  task,
  language,
  editingField,
  editingValue,
  onStartEditing,
  onEditingValueChange,
  onSaveEdit,
  onCancelEdit,
}: TaskDetailProps) {
  return (
    <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Level 3: Task Detail - 任務詳細設定
      </h4>
      <div className="bg-white rounded-lg p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            任務標題
          </label>
          {editingField === `task.${task.id}.title` ? (
            <input
              type="text"
              value={editingValue}
              onChange={(e) => onEditingValueChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              className="w-full px-3 py-2 text-sm font-bold border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
              autoFocus
            />
          ) : (
            <div
              onClick={() =>
                onStartEditing(
                  `task.${task.id}.title`,
                  task.title?.[language] || task.title?.en || "",
                )
              }
              className="text-sm font-bold text-gray-800 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 group"
            >
              <span className="flex-1">
                {task.title?.[language] || task.title?.en}
              </span>
              <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            任務描述
          </label>
          {editingField === `task.${task.id}.description` ? (
            <textarea
              value={editingValue}
              onChange={(e) => onEditingValueChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Escape") onCancelEdit();
              }}
              rows={3}
              className="w-full px-3 py-2 text-sm border-2 border-purple-400 rounded-lg focus:outline-none focus:border-purple-600"
              autoFocus
            />
          ) : (
            <div
              onClick={() =>
                onStartEditing(
                  `task.${task.id}.description`,
                  task.description?.[language] || task.description?.en || "",
                )
              }
              className="text-sm text-gray-700 cursor-pointer hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors min-h-[60px] flex items-start gap-2 group"
            >
              <span className="flex-1">
                {task.description?.[language] || task.description?.en}
              </span>
              <Edit3 className="h-3 w-3 text-gray-400 group-hover:text-purple-600 flex-shrink-0 mt-0.5" />
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            任務類型
          </label>
          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
            {task.type}
          </span>
        </div>

        {/* Instructions */}
        {task.content?.instructions && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              Instructions - 指示說明
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {Array.isArray(task.content.instructions) ? (
                task.content.instructions.map(
                  (instruction: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 mt-0.5">
                        {i + 1}.
                      </span>
                      <span className="text-sm text-gray-700">
                        {instruction}
                      </span>
                    </div>
                  ),
                )
              ) : (
                <span className="text-sm text-gray-700">
                  {String(task.content.instructions)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expected Outcome */}
        {task.content?.expectedOutcome && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Expected Outcome - 預期成果
            </label>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {String(task.content.expectedOutcome)}
            </p>
          </div>
        )}

        {/* Resources */}
        {task.content?.resources &&
          Array.isArray(task.content.resources) &&
          task.content.resources.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Resources - 資源
              </label>
              <div className="space-y-2">
                {task.content.resources.map((resource: string, i: number) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded p-2 text-sm text-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span>{resource}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* AI Module Configuration */}
        {task.content?.aiModule && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              AI Module - AI 模組設定
            </label>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-gray-600">Role: </span>
                  <span className="text-sm font-medium text-purple-700">
                    {task.content.aiModule.role || "N/A"}
                  </span>
                </div>
                {task.content.aiModule.model && (
                  <div>
                    <span className="text-xs text-gray-600">Model: </span>
                    <span className="text-sm font-medium text-purple-700">
                      {task.content.aiModule.model}
                    </span>
                  </div>
                )}
              </div>
              {task.content.aiModule.persona && (
                <div>
                  <span className="text-xs text-gray-600">Persona: </span>
                  <span className="text-sm text-gray-700">
                    {task.content.aiModule.persona}
                  </span>
                </div>
              )}
              {task.content.aiModule.initialPrompt && (
                <div>
                  <span className="text-xs text-gray-600 block mb-1">
                    Initial Prompt:{" "}
                  </span>
                  <p className="text-sm text-gray-700 bg-white rounded p-2">
                    {task.content.aiModule.initialPrompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assessment Focus (PBL specific) */}
        {task.content?.assessmentFocus && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">
              Assessment Focus - 評估重點
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {task.content.assessmentFocus.primary &&
                task.content.assessmentFocus.primary.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">
                      Primary KSA:{" "}
                    </span>
                    <span className="text-sm text-gray-800">
                      {task.content.assessmentFocus.primary.join(", ")}
                    </span>
                  </div>
                )}
              {task.content.assessmentFocus.secondary &&
                task.content.assessmentFocus.secondary.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">
                      Secondary KSA:{" "}
                    </span>
                    <span className="text-sm text-gray-800">
                      {task.content.assessmentFocus.secondary.join(", ")}
                    </span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Time Limit */}
        {task.content?.timeLimit && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Time Limit - 時間限制
            </label>
            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
              {task.content.timeLimit} 分鐘
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

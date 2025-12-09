'use client';

import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';

interface CareerInfo {
  avgSalary?: string;
  demandLevel?: string;
  requiredSkills?: string[];
  [key: string]: unknown;
}

interface SkillTree {
  core?: string[];
  advanced?: string[];
  [key: string]: unknown;
}

interface XPRewards {
  completion?: number;
  challenge?: number;
  innovation?: number;
  [key: string]: unknown;
}

interface DiscoveryData {
  careerType?: string;
  careerInfo?: CareerInfo;
  skillTree?: SkillTree;
  xpRewards?: XPRewards;
  explorationPath?: string[];
  [key: string]: unknown;
}

interface DiscoveryModeSettingsProps {
  discoveryData?: DiscoveryData;
  isExpanded: boolean;
  onToggle: () => void;
}

export function DiscoveryModeSettings({
  discoveryData,
  isExpanded,
  onToggle
}: DiscoveryModeSettingsProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="font-bold text-gray-800">🔍 Discovery 專屬設定</span>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-4 mt-3">
          {/* Career Type */}
          {discoveryData?.careerType && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Career Type - 職業類型</label>
              <p className="text-sm text-gray-800 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-3 font-medium">
                {discoveryData.careerType}
              </p>
            </div>
          )}

          {/* Career Info */}
          {discoveryData?.careerInfo && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Career Information - 職業資訊</label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {discoveryData.careerInfo.avgSalary && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">平均薪資: </span>
                    <span className="text-sm text-gray-800">{discoveryData.careerInfo.avgSalary}</span>
                  </div>
                )}
                {discoveryData.careerInfo.demandLevel && (
                  <div>
                    <span className="text-xs font-medium text-gray-600">需求程度: </span>
                    <span className="text-sm text-gray-800">{discoveryData.careerInfo.demandLevel}</span>
                  </div>
                )}
                {discoveryData.careerInfo.requiredSkills && discoveryData.careerInfo.requiredSkills.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-600 block mb-1">所需技能: </span>
                    <div className="flex flex-wrap gap-1">
                      {discoveryData.careerInfo.requiredSkills.map((skill: string, i: number) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skill Tree */}
          {discoveryData?.skillTree && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Skill Tree - 技能樹</label>
              <div className="space-y-2">
                {discoveryData.skillTree.core && discoveryData.skillTree.core.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <span className="text-xs font-medium text-blue-700 block mb-1">Core Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {discoveryData.skillTree.core.map((skill: string, i: number) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {discoveryData.skillTree.advanced && discoveryData.skillTree.advanced.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <span className="text-xs font-medium text-purple-700 block mb-1">Advanced Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {discoveryData.skillTree.advanced.map((skill: string, i: number) => (
                        <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* XP Rewards */}
          {discoveryData?.xpRewards && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">XP Rewards - 經驗值獎勵</label>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 grid grid-cols-3 gap-3">
                {discoveryData.xpRewards.completion !== undefined && (
                  <div className="text-center">
                    <div className="text-xs text-gray-600">完成獎勵</div>
                    <div className="text-lg font-bold text-orange-600">{discoveryData.xpRewards.completion} XP</div>
                  </div>
                )}
                {discoveryData.xpRewards.challenge !== undefined && (
                  <div className="text-center">
                    <div className="text-xs text-gray-600">挑戰獎勵</div>
                    <div className="text-lg font-bold text-orange-600">{discoveryData.xpRewards.challenge} XP</div>
                  </div>
                )}
                {discoveryData.xpRewards.innovation !== undefined && (
                  <div className="text-center">
                    <div className="text-xs text-gray-600">創新獎勵</div>
                    <div className="text-lg font-bold text-orange-600">{discoveryData.xpRewards.innovation} XP</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exploration Path */}
          {discoveryData?.explorationPath && discoveryData.explorationPath.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Exploration Path - 探索路徑</label>
              <div className="space-y-1">
                {discoveryData.explorationPath.map((path: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                    <span className="text-xs font-bold text-gray-500">{i + 1}</span>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-700">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

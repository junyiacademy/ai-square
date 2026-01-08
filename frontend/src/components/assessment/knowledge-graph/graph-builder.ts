/**
 * Graph data builder for Knowledge Graph visualization
 */

import {
  AssessmentResult,
  AssessmentQuestion,
  UserAnswer,
} from "../../../types/assessment";
import { GraphNode, GraphLink, GraphData, KSAMastery, KSAMaps } from "./types";
import { KSA_TYPES } from "./constants";

export function calculateKSAMastery(
  questions: AssessmentQuestion[],
  userAnswers: UserAnswer[],
  ksaMaps: KSAMaps | null,
): Record<string, KSAMastery> {
  if (!ksaMaps) return {};

  const ksaMastery: Record<string, KSAMastery> = {};

  // First pass: collect all KSA codes from questions
  questions.forEach((question) => {
    if (!question?.ksa_mapping) return;

    const allCodes = [
      ...(question.ksa_mapping.knowledge || []),
      ...(question.ksa_mapping.skills || []),
      ...(question.ksa_mapping.attitudes || []),
    ];

    allCodes.forEach((code) => {
      const ksaMap = code.startsWith("K")
        ? ksaMaps.kMap
        : code.startsWith("S")
          ? ksaMaps.sMap
          : ksaMaps.aMap;

      if (!ksaMap?.[code]) return; // Skip unmapped codes

      if (!ksaMastery[code]) {
        ksaMastery[code] = { correct: 0, total: 0, questions: [] };
      }
      if (question.id) {
        ksaMastery[code].questions.push(question.id);
      }
      ksaMastery[code].total++;
    });
  });

  // Second pass: count correct answers
  userAnswers.forEach((answer) => {
    const question = questions.find((q) => q?.id === answer.questionId);
    if (!question?.ksa_mapping || !answer.isCorrect) return;

    const allCodes = [
      ...(question.ksa_mapping.knowledge || []),
      ...(question.ksa_mapping.skills || []),
      ...(question.ksa_mapping.attitudes || []),
    ];

    allCodes.forEach((code) => {
      if (ksaMastery[code]) {
        ksaMastery[code].correct++;
      }
    });
  });

  return ksaMastery;
}

export function getMasteryStatus(correct: number, total: number): number {
  if (total === 0) return 0;
  if (correct === 0) return 0; // Red: completely wrong
  if (correct === total) return 2; // Green: all correct
  return 1; // Yellow: partially correct
}

function enhanceWithEvaluation(
  calculatedMastery: Record<string, KSAMastery>,
  ksaAnalysis: AssessmentResult["ksaAnalysis"],
): Record<string, KSAMastery> {
  if (!ksaAnalysis) return calculatedMastery;

  const enhanced: Record<string, KSAMastery> = {};
  const { knowledge, skills, attitudes } = ksaAnalysis;

  const processCategory = (codes: string[] = [], isStrong: boolean) => {
    codes.forEach((code) => {
      const actual = calculatedMastery[code];
      if (actual) {
        enhanced[code] = {
          correct: isStrong
            ? Math.max(Math.ceil(actual.total * 0.8), actual.correct)
            : Math.min(Math.floor(actual.total * 0.3), actual.correct),
          total: actual.total,
          questions: actual.questions,
        };
      } else {
        enhanced[code] = {
          correct: isStrong ? 2 : 0,
          total: 2,
          questions: [],
        };
      }
    });
  };

  processCategory(knowledge?.strong, true);
  processCategory(knowledge?.weak, false);
  processCategory(skills?.strong, true);
  processCategory(skills?.weak, false);
  processCategory(attitudes?.strong, true);
  processCategory(attitudes?.weak, false);

  // Add remaining codes as medium performance
  Object.entries(calculatedMastery).forEach(([code, data]) => {
    if (!enhanced[code]) enhanced[code] = data;
  });

  return enhanced;
}

export function buildGraphData(
  result: AssessmentResult,
  questions: AssessmentQuestion[],
  userAnswers: UserAnswer[],
  ksaMaps: KSAMaps | null,
  t: (key: string) => string,
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Calculate mastery
  let ksaMastery = calculateKSAMastery(questions, userAnswers, ksaMaps);
  if (result.ksaAnalysis) {
    ksaMastery = enhanceWithEvaluation(ksaMastery, result.ksaAnalysis);
  }

  // Add center node
  nodes.push({
    id: "center",
    type: "domain",
    name: t("results.knowledgeGraph.yourProfile"),
    score: result.overallScore,
  });

  // Add KSA type nodes
  KSA_TYPES.forEach((ksaType) => {
    nodes.push({
      id: ksaType.id,
      type: "ksa-theme",
      name: t(`quiz.${ksaType.id}`),
      ksaType: ksaType.id as "knowledge" | "skills" | "attitudes",
    });

    links.push({
      source: "center",
      target: ksaType.id,
      value: 1,
    });
  });

  // Group codes by parent
  const parentCodes = new Map<string, string[]>();
  Object.keys(ksaMastery).forEach((code) => {
    const match = code.match(/^([KSA]\d+)\.(\d+)$/);
    if (match) {
      const parentCode = match[1];
      if (!parentCodes.has(parentCode)) parentCodes.set(parentCode, []);
      parentCodes.get(parentCode)!.push(code);
    } else {
      if (!parentCodes.has(code)) parentCodes.set(code, []);
    }
  });

  // Add parent nodes first
  parentCodes.forEach((_, parentCode) => {
    if (!ksaMastery[parentCode]) return;

    const ksaMap = parentCode.startsWith("K")
      ? ksaMaps?.kMap
      : parentCode.startsWith("S")
        ? ksaMaps?.sMap
        : ksaMaps?.aMap;

    const ksaInfo = ksaMap?.[parentCode];
    if (!ksaInfo) return;

    const ksaType = parentCode.startsWith("K")
      ? "knowledge"
      : parentCode.startsWith("S")
        ? "skills"
        : "attitudes";

    const data = ksaMastery[parentCode];
    nodes.push({
      id: `code-${parentCode}`,
      type: "ksa-code",
      name: parentCode,
      mastery: getMasteryStatus(data.correct, data.total),
      ksaType,
      details: {
        summary: ksaInfo.summary,
        explanation: ksaInfo.explanation,
        correct: data.correct,
        total: data.total,
        questions: data.questions,
        theme: ksaInfo.theme,
      },
    });

    links.push({
      source: ksaType,
      target: `code-${parentCode}`,
      value: 0.8,
    });
  });

  // Add all nodes (including subcodes)
  Object.entries(ksaMastery).forEach(([code, data]) => {
    if (nodes.some((n) => n.id === `code-${code}`)) return;

    const ksaMap = code.startsWith("K")
      ? ksaMaps?.kMap
      : code.startsWith("S")
        ? ksaMaps?.sMap
        : ksaMaps?.aMap;

    const ksaInfo = ksaMap?.[code];
    if (!ksaInfo) return;

    const ksaType = code.startsWith("K")
      ? "knowledge"
      : code.startsWith("S")
        ? "skills"
        : "attitudes";

    const isSubcode = code.includes(".");
    const parentMatch = code.match(/^([KSA]\d+)\.(\d+)$/);
    const parentCode = parentMatch?.[1];

    nodes.push({
      id: `code-${code}`,
      type: isSubcode ? "ksa-subcode" : "ksa-code",
      name: code,
      mastery: getMasteryStatus(data.correct, data.total),
      ksaType,
      parentCode,
      details: {
        summary: ksaInfo.summary,
        explanation: ksaInfo.explanation,
        correct: data.correct,
        total: data.total,
        questions: data.questions,
        theme: ksaInfo.theme,
      },
    });

    // Link to parent
    if (
      isSubcode &&
      parentCode &&
      nodes.some((n) => n.id === `code-${parentCode}`)
    ) {
      links.push({
        source: `code-${parentCode}`,
        target: `code-${code}`,
        value: 0.6,
      });
    } else {
      links.push({
        source: ksaType,
        target: `code-${code}`,
        value: 0.8,
      });
    }
  });

  return { nodes, links };
}

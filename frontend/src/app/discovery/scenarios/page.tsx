"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Sparkles,
  Rocket,
  Cpu,
  Lightbulb,
  Paintbrush,
  Video,
  Code,
  Box,
  Briefcase,
  Megaphone,
  Users,
  CircuitBoard,
  Bot,
  Car,
  Atom,
  Leaf,
  Factory,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import DiscoveryPageLayout from "@/components/discovery/DiscoveryPageLayout";
import ScenarioCard from "@/components/discovery/ScenarioCard";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeLanguageCode } from "@/lib/utils/language";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
// Icon mapping for career types
const careerIcons: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  content_creator: Paintbrush,
  youtuber: Video,
  app_developer: Code,
  game_designer: Box,
  tech_entrepreneur: Rocket,
  startup_founder: Briefcase,
  data_analyst: BarChart,
  ux_designer: Sparkles,
  ai_engineer: Cpu,
  ai_developer: Cpu,
  digital_marketer: Megaphone,
  social_media_manager: Users,
  product_manager: Users,
  biotech_researcher: Lightbulb,
  cybersecurity_specialist: Code,
  environmental_scientist: BarChart,
  ic_design_engineer: CircuitBoard,
  robotics_engineer: Bot,
  autonomous_vehicle_engineer: Car,
  quantum_engineer: Atom,
  green_energy_engineer: Leaf,
  smart_manufacturing_engineer: Factory,
};

// Color mapping for career types
const careerColors: Record<string, string> = {
  content_creator: "from-purple-500 to-pink-500",
  youtuber: "from-red-500 to-orange-500",
  app_developer: "from-blue-500 to-cyan-500",
  game_designer: "from-indigo-500 to-purple-500",
  tech_entrepreneur: "from-yellow-500 to-red-500",
  startup_founder: "from-green-500 to-teal-500",
  data_analyst: "from-teal-500 to-blue-500",
  ux_designer: "from-pink-500 to-purple-500",
  ai_engineer: "from-violet-500 to-purple-500",
  ai_developer: "from-violet-500 to-purple-500",
  digital_marketer: "from-orange-500 to-red-500",
  social_media_manager: "from-blue-500 to-indigo-500",
  product_manager: "from-orange-500 to-yellow-500",
  biotech_researcher: "from-green-500 to-emerald-500",
  cybersecurity_specialist: "from-gray-600 to-gray-800",
  environmental_scientist: "from-green-600 to-teal-600",
  ic_design_engineer: "from-cyan-500 to-blue-600",
  robotics_engineer: "from-orange-500 to-red-500",
  autonomous_vehicle_engineer: "from-emerald-500 to-cyan-500",
  quantum_engineer: "from-violet-500 to-purple-600",
  green_energy_engineer: "from-green-500 to-yellow-500",
  smart_manufacturing_engineer: "from-slate-500 to-blue-500",
};

// Maps broad filter IDs to actual DB category values
const categoryMapping: Record<string, string[]> = {
  technology: ["technology"],
  arts: ["arts"],
  business: ["business"],
  hardware: ["semiconductor", "manufacturing"],
  science: ["science", "quantum_technology"],
  green: ["sustainability"],
  automation: ["robotics", "autonomous_systems"],
};

// Industry filters (Row 1) - names are i18n keys
const industryFilterDefs = [
  { id: "all", nameKey: "discovery:scenarios.filters.all", icon: Sparkles },
  { id: "technology", nameKey: "discovery:scenarios.filters.technology", icon: Code },
  { id: "arts", nameKey: "discovery:scenarios.filters.arts", icon: Paintbrush },
  { id: "business", nameKey: "discovery:scenarios.filters.business", icon: Briefcase },
  { id: "hardware", nameKey: "discovery:scenarios.filters.hardware", icon: CircuitBoard },
  { id: "science", nameKey: "discovery:scenarios.filters.science", icon: Lightbulb },
  { id: "green", nameKey: "discovery:scenarios.filters.green", icon: Leaf },
  { id: "automation", nameKey: "discovery:scenarios.filters.automation", icon: Bot },
];

// Job function filters (Row 2) - names are i18n keys
const jobFunctionFilterDefs = [
  { id: "all", nameKey: "discovery:scenarios.filters.all", icon: Sparkles },
  { id: "engineer", nameKey: "discovery:scenarios.filters.engineer", icon: Cpu },
  { id: "designer", nameKey: "discovery:scenarios.filters.designer", icon: Paintbrush },
  { id: "researcher", nameKey: "discovery:scenarios.filters.researcher", icon: Lightbulb },
  { id: "creator", nameKey: "discovery:scenarios.filters.creator", icon: Video },
  { id: "pm", nameKey: "discovery:scenarios.filters.pm", icon: Users },
  { id: "business", nameKey: "discovery:scenarios.filters.businessFunc", icon: Briefcase },
];

// Map career types to job functions
const careerJobFunctions: Record<string, string> = {
  app_developer: "engineer",
  autonomous_vehicle_engineer: "engineer",
  ic_design_engineer: "engineer",
  cybersecurity_specialist: "engineer",
  ux_designer: "designer",
  game_designer: "designer",
  robotics_engineer: "designer",
  biotech_researcher: "researcher",
  environmental_scientist: "researcher",
  quantum_engineer: "researcher",
  data_analyst: "researcher",
  content_creator: "creator",
  youtuber: "creator",
  product_manager: "pm",
  smart_manufacturing_engineer: "pm",
  startup_founder: "business",
  tech_entrepreneur: "business",
  green_energy_engineer: "business",
};

export default function ScenariosPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(["discovery", "skills"]);
  const { isLoggedIn } = useAuth();
  useUserData(); // Trigger user data loading
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedJobFunction, setSelectedJobFunction] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "my">("all"); // Default to 'all' since v2 doesn't track discovery in userData
  interface Scenario {
    id: string;
    scenarioId: string;
    title: string;
    subtitle: string;
    category: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    skills: string[];
    bannerImage?: string;
    userPrograms?: {
      active?: {
        progress: number;
        completedTasks: number;
        totalTasks: number;
      };
      completed?: number;
      lastActivity?: string;
    };
    progress?: number;
    isActive?: boolean;
    completedCount?: number;
    lastActivity?: string;
  }

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [myScenarios, setMyScenarios] = useState<Scenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [isLoadingMyScenarios, setIsLoadingMyScenarios] = useState(false);

  // Load scenarios from API
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const lang = normalizeLanguageCode(i18n.language);
        const response = await authenticatedFetch(
          `/api/discovery/scenarios?lang=${lang}`,
        );
        if (response.ok) {
          const result = await response.json();
          const scenarios = result.data?.scenarios || result; // Handle both formats
          // Transform the scenarios to match the expected format
          const transformedScenarios = scenarios.map(
            (scenario: Record<string, unknown>) => {
              // Derive sourceId first (used for banner image and as careerType fallback)
              const sourceId = (
                (scenario.sourceId as string) ||
                (scenario.source_id as string) ||
                ((scenario.sourceMetadata as Record<string, unknown>)?.careerDir as string) ||
                ((scenario.discovery_data as Record<string, unknown>)?.careerType as string) ||
                "general"
              );

              const careerType =
                ((scenario.discovery_data as Record<string, unknown>)
                  ?.careerType as string) || sourceId;

              return {
                id: careerType,
                scenarioId: scenario.id, // Store the actual scenario UUID
                title: scenario.title as string, // API now returns localized string
                subtitle: scenario.description as string, // API now returns localized string
                bannerImage: `/images/discovery-banners/${sourceId}.webp`,
                category:
                  ((scenario.discovery_data as Record<string, unknown>)
                    ?.category as string) ||
                  ((scenario.discoveryData as Record<string, unknown>)
                    ?.category as string) ||
                  ((scenario.metadata as Record<string, unknown>)
                    ?.category as string) ||
                  "general",
                icon: careerIcons[careerType] || Sparkles,
                color: careerColors[careerType] || "from-gray-500 to-gray-600",
                skills:
                  ((scenario.metadata as Record<string, unknown>)
                    ?.skillFocus as string[]) || [],
                // Include user progress data from API
                primaryStatus:
                  (scenario.primaryStatus as
                    | "mastered"
                    | "in-progress"
                    | "new") || "new",
                currentProgress: (scenario.currentProgress as number) || 0,
                stats: scenario.stats || {
                  completedCount: 0,
                  activeCount: 0,
                  totalAttempts: 0,
                  bestScore: 0,
                },
              };
            },
          );
          setScenarios(transformedScenarios);
        } else {
          console.error("Failed to fetch scenarios from API");
          setScenarios([]);
        }
      } catch (error) {
        console.error("Failed to fetch scenarios:", error);
        setScenarios([]);
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    fetchScenarios();
  }, [i18n.language]);

  // Note: useUserData hook automatically loads data when user logs in

  // Load user's Discovery scenarios
  useEffect(() => {
    const loadMyScenarios = async () => {
      if (!isLoggedIn || activeTab !== "my") return;

      setIsLoadingMyScenarios(true);
      try {
        const lang = normalizeLanguageCode(i18n.language);
        const response = await authenticatedFetch(
          `/api/discovery/scenarios/my?lang=${lang}`,
        );
        if (response.ok) {
          const data = await response.json();

          // Transform the data to match the expected format
          const transformedScenarios = (data.scenarios || []).map(
            (scenario: Record<string, unknown>) => {
              // Get career type from multiple possible locations
              const careerType =
                (scenario.careerType as string) ||
                ((scenario.discoveryData as Record<string, unknown>)
                  ?.careerType as string) ||
                ((scenario.metadata as Record<string, unknown>)
                  ?.careerType as string) ||
                "general";

              // Map icon string to actual icon component
              const iconName = (scenario.icon as string) || "Sparkles";
              const iconMap: Record<
                string,
                React.ComponentType<React.SVGProps<SVGSVGElement>>
              > = {
                CodeBracketIcon: Code,
                BarChart: BarChart,
                PaintBrushIcon: Paintbrush,
                GraduationCap: Users,
                ScaleIcon: Users,
                TestTube: Lightbulb,
                Sparkles: Sparkles,
                VideoCameraIcon: Video,
              };

              return {
                id: careerType,
                scenarioId: scenario.scenarioId as string,
                title: scenario.title as string,
                subtitle: scenario.subtitle as string,
                category: (scenario.category as string) || "general",
                icon: iconMap[iconName] || careerIcons[careerType] || Sparkles,
                color: careerColors[careerType] || "from-gray-500 to-gray-600",
                skills: (scenario.skills as string[]) || [],
                // Include progress data for unified display
                primaryStatus:
                  (scenario.primaryStatus as
                    | "mastered"
                    | "in-progress"
                    | "new") || "new",
                currentProgress: (scenario.currentProgress as number) || 0,
                stats: scenario.stats || {
                  completedCount: 0,
                  activeCount: 0,
                  totalAttempts: 0,
                  bestScore: 0,
                },
                // Legacy fields
                userPrograms: scenario.userPrograms,
                progress: (scenario.progress as number) || 0,
                isActive: (scenario.isActive as boolean) || false,
                completedCount: (scenario.completedCount as number) || 0,
                lastActivity: scenario.lastActivity as string,
              };
            },
          );

          setMyScenarios(transformedScenarios);
        } else {
          console.error("Failed to fetch my scenarios");
          setMyScenarios([]);
        }
      } catch (error) {
        console.error("Error loading my scenarios:", error);
        setMyScenarios([]);
      } finally {
        setIsLoadingMyScenarios(false);
      }
    };

    loadMyScenarios();
  }, [isLoggedIn, activeTab, i18n.language]);

  const filteredScenarios =
    activeTab === "my"
      ? myScenarios
      : scenarios.filter((s) => {
          const industryMatch =
            selectedIndustry === "all" ||
            (categoryMapping[selectedIndustry]?.includes(s.category) ?? false);
          const jobMatch = selectedJobFunction === "all" || careerJobFunctions[s.id] === selectedJobFunction;
          return industryMatch && jobMatch;
        });

  const handleScenarioSelect = async (scenarioOrCareer: Scenario | string) => {
    if (!isLoggedIn) {
      // Redirect to login
      router.push("/login?redirect=/discovery/scenarios");
      return;
    }

    // Check if we have a scenario object (from API) or just a career string (from fallback)
    if (typeof scenarioOrCareer === "object" && scenarioOrCareer.scenarioId) {
      // We have a scenario from the API, navigate directly to it
      router.push(`/discovery/scenarios/${scenarioOrCareer.scenarioId}`);
    } else {
      // Fallback: try to find the scenario by career type
      const careerType =
        typeof scenarioOrCareer === "string"
          ? scenarioOrCareer
          : scenarioOrCareer.id;
      const scenario = scenarios.find((s) => s.id === careerType);

      if (scenario && scenario.scenarioId) {
        router.push(`/discovery/scenarios/${scenario.scenarioId}`);
      } else {
        // Old behavior for fallback
        alert("Scenario not found. Please refresh the page and try again.");
      }
    }
  };

  return (
    <DiscoveryPageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("discovery:scenarios.heading")}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t("discovery:scenarios.subheading")}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`
                px-6 py-2 rounded-md text-sm font-medium transition-all
                ${
                  activeTab === "all"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>{t("discovery:scenarios.tabAll")}</span>
              </div>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => setActiveTab("my")}
                className={`
                  px-6 py-2 rounded-md text-sm font-medium transition-all
                  ${
                    activeTab === "my"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <Rocket className="w-4 h-4" />
                  <span>{t("discovery:scenarios.tabMy")}</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Dual Filter Rows - Only show when viewing all */}
        {activeTab === "all" && (
          <div className="flex flex-col items-center gap-3 mb-8">
            {/* Row 1: Industry */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium w-12 text-right shrink-0">{t("discovery:scenarios.labelIndustry")}</span>
              <div className="inline-flex flex-wrap justify-center rounded-lg border border-gray-200 bg-white p-1 gap-0.5">
                {industryFilterDefs.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedIndustry(filter.id)}
                      className={`
                        flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${
                          selectedIndustry === filter.id
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t(filter.nameKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Row 2: Job Function */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium w-12 text-right shrink-0">{t("discovery:scenarios.labelJobFunction")}</span>
              <div className="inline-flex flex-wrap justify-center rounded-lg border border-gray-200 bg-white p-1 gap-0.5">
                {jobFunctionFilterDefs.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedJobFunction(filter.id)}
                      className={`
                        flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${
                          selectedJobFunction === filter.id
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t(filter.nameKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(isLoadingScenarios ||
          (activeTab === "my" && isLoadingMyScenarios)) && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500">
              {activeTab === "my" ? t("discovery:scenarios.loadingMy") : t("discovery:scenarios.loadingAll")}
            </p>
          </div>
        )}

        {/* Scenarios Grid */}
        {!isLoadingScenarios &&
          !(activeTab === "my" && isLoadingMyScenarios) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScenarios.map((scenario, index) => (
                <ScenarioCard
                  key={scenario.scenarioId || scenario.id}
                  scenario={scenario}
                  index={index}
                  showLastActivity={activeTab === "my"}
                  onSelect={handleScenarioSelect}
                />
              ))}
            </div>
          )}

        {/* Empty State */}
        {filteredScenarios.length === 0 &&
          !isLoadingScenarios &&
          !(activeTab === "my" && isLoadingMyScenarios) && (
            <div className="text-center py-16">
              {activeTab === "my" ? (
                <div>
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{t("discovery:scenarios.emptyMyTitle")}</p>
                  <p className="text-sm text-gray-400 mb-6">
                    {t("discovery:scenarios.emptyMySubtitle")}
                  </p>
                  <button
                    onClick={() => setActiveTab("all")}
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    {t("discovery:scenarios.browseAll")}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500">{t("discovery:scenarios.emptyFiltered")}</p>
              )}
            </div>
          )}
      </div>
    </DiscoveryPageLayout>
  );
}

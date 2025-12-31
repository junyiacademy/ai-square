/**
 * 內容服務 - 統一管理所有內容相關的 API 呼叫
 */
import { cacheService } from "@/lib/cache/cache-service";
import { performanceMonitor } from "@/lib/performance/performance-monitor";

// 定義內容類型
interface TreeData {
  domains: Array<Record<string, unknown>>;
  kMap?: Record<string, unknown>;
  sMap?: Record<string, unknown>;
  aMap?: Record<string, unknown>;
  ksa?: {
    knowledge: Record<string, unknown>;
    skills: Record<string, unknown>;
    attitudes: Record<string, unknown>;
  };
}

interface AssessmentData {
  id: string;
  [key: string]: unknown;
}

interface PBLScenario {
  id: string;
  [key: string]: unknown;
}

class ContentService {
  // 快取 TTL 設定
  private readonly TREE_TTL = 30 * 60 * 1000; // 30 分鐘
  private readonly ASSESSMENT_TTL = 60 * 60 * 1000; // 1 小時
  private readonly PBL_TTL = 60 * 60 * 1000; // 1 小時
  private readonly STATIC_CONTENT_TTL = 24 * 60 * 60 * 1000; // 24 小時

  /**
   * 取得關聯樹資料
   */
  async getRelationsTree(lang: string): Promise<TreeData> {
    return performanceMonitor.measureAsync(
      "content.getRelationsTree",
      async () => {
        return cacheService.fetchWithCache<TreeData>(
          `/api/relations?lang=${lang}`,
          {
            ttl: this.TREE_TTL,
            storage: "both",
          },
        );
      },
    );
  }

  /**
   * 取得評估資料
   */
  async getAssessment(assessmentId: string): Promise<AssessmentData> {
    return cacheService.fetchWithCache<AssessmentData>(
      `/api/assessments/${assessmentId}`,
      {
        ttl: this.ASSESSMENT_TTL,
        storage: "localStorage",
      },
    );
  }

  /**
   * 取得 PBL 情境資料
   */
  async getPBLScenario(scenarioId: string): Promise<PBLScenario> {
    return cacheService.fetchWithCache<PBLScenario>(
      `/api/pbl/scenarios/${scenarioId}`,
      {
        ttl: this.PBL_TTL,
        storage: "localStorage",
      },
    );
  }

  /**
   * 取得 KSA 定義資料
   */
  async getKSADefinitions(lang: string): Promise<Record<string, unknown>> {
    return cacheService.fetchWithCache<Record<string, unknown>>(
      `/api/ksa?lang=${lang}`,
      {
        ttl: this.STATIC_CONTENT_TTL,
        storage: "both",
      },
    );
  }

  /**
   * 預載重要資料
   * 用於應用程式初始化時
   */
  async preloadEssentialData(lang: string): Promise<void> {
    try {
      // 並行載入核心資料
      await Promise.all([
        this.getRelationsTree(lang),
        this.getKSADefinitions(lang),
      ]);
    } catch (error) {
      console.error("Preload failed:", error);
      // 預載失敗不應該阻擋應用程式啟動
    }
  }

  /**
   * 清除特定語言的快取
   */
  async clearLanguageCache(lang: string): Promise<void> {
    await Promise.all([
      cacheService.delete(`relations:${lang}`),
      cacheService.delete(`ksa:${lang}`),
    ]);
  }

  /**
   * 清除所有內容快取
   */
  async clearAllCache(): Promise<void> {
    await cacheService.clear();
  }

  /**
   * 取得快取統計資訊
   */
  getCacheStats(): { memoryEntries: number; localStorageSize: number } {
    let localStorageSize = 0;
    // Count cache entries

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("cache:")) {
        // Increment count
        localStorageSize += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16
      }
    });

    return {
      memoryEntries: 0, // 需要從 cacheService 暴露這個資訊
      localStorageSize: localStorageSize / 1024, // KB
    };
  }
}

// 匯出單例
export const contentService = new ContentService();

// 匯出類別（for testing）
export { ContentService };

// 匯出類型
export type { TreeData, AssessmentData, PBLScenario };

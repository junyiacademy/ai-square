export type AIUsageRecord = {
  userKey: string;
  feature: string;
  model: string;
  tokensUsed: number;
  estimatedCostUsd: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type AIUsageStats = {
  totalTokens: number;
  totalCostUsd: number;
  recordsCount: number;
  byFeature: Record<string, number>;
  byModel: Record<string, number>;
};

const MAX_RECORDS = 1000;

const DEFAULT_COST_PER_1K = Number(
  process.env.AI_USAGE_COST_PER_1K_TOKENS || "0",
);

function estimateCost(tokensUsed: number): number {
  return (tokensUsed / 1000) * DEFAULT_COST_PER_1K;
}

export class AIUsageTracker {
  private records: AIUsageRecord[] = [];

  recordUsage(record: Omit<AIUsageRecord, "estimatedCostUsd" | "timestamp">) {
    const timestamp = Date.now();
    const tokensUsed = Math.max(0, Math.floor(record.tokensUsed));

    this.records.push({
      ...record,
      tokensUsed,
      estimatedCostUsd: estimateCost(tokensUsed),
      timestamp,
    });

    if (this.records.length > MAX_RECORDS) {
      this.records.shift();
    }
  }

  getStats(options?: { userKey?: string; sinceMs?: number }): AIUsageStats {
    const cutoff = options?.sinceMs ? Date.now() - options.sinceMs : 0;
    const filtered = this.records.filter((record) => {
      if (record.timestamp < cutoff) return false;
      if (options?.userKey && record.userKey !== options.userKey) return false;
      return true;
    });

    const byFeature: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const record of filtered) {
      totalTokens += record.tokensUsed;
      totalCostUsd += record.estimatedCostUsd;
      byFeature[record.feature] =
        (byFeature[record.feature] || 0) + record.tokensUsed;
      byModel[record.model] = (byModel[record.model] || 0) + record.tokensUsed;
    }

    return {
      totalTokens,
      totalCostUsd,
      recordsCount: filtered.length,
      byFeature,
      byModel,
    };
  }

  getQuotaStatus(userKey: string) {
    const dailyQuota = Number(process.env.AI_USAGE_DAILY_TOKEN_QUOTA || "0");
    const monthlyQuota = Number(
      process.env.AI_USAGE_MONTHLY_TOKEN_QUOTA || "0",
    );

    const dailyStats = this.getStats({
      userKey,
      sinceMs: 24 * 60 * 60 * 1000,
    });
    const monthlyStats = this.getStats({
      userKey,
      sinceMs: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      daily: {
        limit: dailyQuota,
        used: dailyStats.totalTokens,
        remaining: dailyQuota ? Math.max(0, dailyQuota - dailyStats.totalTokens) : null,
      },
      monthly: {
        limit: monthlyQuota,
        used: monthlyStats.totalTokens,
        remaining: monthlyQuota
          ? Math.max(0, monthlyQuota - monthlyStats.totalTokens)
          : null,
      },
    };
  }
}

export const aiUsageTracker = new AIUsageTracker();

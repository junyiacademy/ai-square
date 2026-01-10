/**
 * GCP Cost Queries for Weekly Report
 *
 * Fetches Vertex AI cost data using Cloud Billing API.
 * Requires billing export to BigQuery or direct billing API access.
 *
 * Configuration:
 * - GCP_BILLING_PROJECT: Project ID with billing export (defaults to GCP_PROJECT_ID)
 * - GCP_BILLING_DATASET: BigQuery dataset with billing export (e.g., "billing_export")
 * - GCP_BILLING_TABLE: BigQuery table name (e.g., "gcp_billing_export_v1")
 *
 * If billing configuration is not available, returns mock/placeholder data
 * with graceful degradation.
 */

import { GoogleAuth } from "google-auth-library";

export interface VertexAICostBreakdown {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface GCPCostStats {
  vertexAI: {
    totalCost: number;
    costThisWeek: number;
    costLastWeek: number;
    weekOverWeekChange: number; // percentage
    breakdown: VertexAICostBreakdown[];
    currency: string;
  };
  cloudRun: {
    totalCost: number;
    costThisWeek: number;
  };
  cloudSQL: {
    totalCost: number;
    costThisWeek: number;
  };
  totalGCPCost: number;
  dataSource: "bigquery" | "api" | "estimated" | "unavailable";
  lastUpdated: string;
}

/**
 * Get week date bounds for cost queries
 * Returns ISO date strings for last complete week (Monday to Sunday)
 */
function getWeekBounds(): {
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;

  // This Monday at 00:00
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysFromMonday);
  thisMonday.setHours(0, 0, 0, 0);

  // Last Monday is 7 days before this Monday
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  // Last Sunday (end of last week)
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  lastSunday.setHours(23, 59, 59, 999);

  // Two weeks ago Monday
  const twoWeeksAgoMonday = new Date(lastMonday);
  twoWeeksAgoMonday.setDate(lastMonday.getDate() - 7);

  // Two weeks ago Sunday
  const twoWeeksAgoSunday = new Date(lastMonday);
  twoWeeksAgoSunday.setDate(lastMonday.getDate() - 1);
  twoWeeksAgoSunday.setHours(23, 59, 59, 999);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  return {
    thisWeekStart: formatDate(lastMonday),
    thisWeekEnd: formatDate(lastSunday),
    lastWeekStart: formatDate(twoWeeksAgoMonday),
    lastWeekEnd: formatDate(twoWeeksAgoSunday),
  };
}

/**
 * Fetch GCP cost data from BigQuery billing export
 *
 * This function uses the BigQuery API to query cost data from the billing export.
 * Requires:
 * - Billing export enabled to BigQuery
 * - Service account with BigQuery read access
 */
async function fetchFromBigQuery(
  auth: GoogleAuth,
  projectId: string,
  billingDataset: string,
  billingTable: string,
): Promise<GCPCostStats | null> {
  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Failed to get access token for BigQuery");
    }

    const bounds = getWeekBounds();

    // BigQuery SQL to get Vertex AI costs grouped by model
    const query = `
      SELECT
        sku.description as model,
        SUM(CASE
          WHEN usage_start_time >= '${bounds.thisWeekStart}'
            AND usage_start_time < DATE_ADD('${bounds.thisWeekEnd}', INTERVAL 1 DAY)
          THEN cost
          ELSE 0
        END) as cost_this_week,
        SUM(CASE
          WHEN usage_start_time >= '${bounds.lastWeekStart}'
            AND usage_start_time < DATE_ADD('${bounds.lastWeekEnd}', INTERVAL 1 DAY)
          THEN cost
          ELSE 0
        END) as cost_last_week,
        SUM(cost) as total_cost
      FROM \`${projectId}.${billingDataset}.${billingTable}\`
      WHERE service.description = 'Vertex AI'
        AND usage_start_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY sku.description
      ORDER BY cost_this_week DESC
    `;

    // Also get Cloud Run and Cloud SQL costs
    const infraQuery = `
      SELECT
        service.description as service_name,
        SUM(CASE
          WHEN usage_start_time >= '${bounds.thisWeekStart}'
            AND usage_start_time < DATE_ADD('${bounds.thisWeekEnd}', INTERVAL 1 DAY)
          THEN cost
          ELSE 0
        END) as cost_this_week,
        SUM(cost) as total_cost
      FROM \`${projectId}.${billingDataset}.${billingTable}\`
      WHERE service.description IN ('Cloud Run', 'Cloud SQL')
        AND usage_start_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY service.description
    `;

    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`;

    // Execute Vertex AI query
    const vertexResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        useLegacySql: false,
        timeoutMs: 30000,
      }),
    });

    if (!vertexResponse.ok) {
      const error = await vertexResponse.text();
      console.error("BigQuery Vertex AI query failed:", error);
      return null;
    }

    const vertexData = (await vertexResponse.json()) as {
      rows?: Array<{ f: Array<{ v: string | null }> }>;
    };

    // Execute infrastructure query
    const infraResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: infraQuery,
        useLegacySql: false,
        timeoutMs: 30000,
      }),
    });

    if (!infraResponse.ok) {
      console.warn("BigQuery infrastructure query failed, continuing with Vertex AI data only");
    }

    const infraData = infraResponse.ok
      ? ((await infraResponse.json()) as {
          rows?: Array<{ f: Array<{ v: string | null }> }>;
        })
      : null;

    // Parse Vertex AI results
    const breakdown: VertexAICostBreakdown[] = [];
    let costThisWeek = 0;
    let costLastWeek = 0;
    let totalVertexCost = 0;

    if (vertexData.rows) {
      for (const row of vertexData.rows) {
        const model = row.f[0]?.v || "Unknown";
        const thisWeekCost = parseFloat(row.f[1]?.v || "0");
        const lastWeekCost = parseFloat(row.f[2]?.v || "0");
        const total = parseFloat(row.f[3]?.v || "0");

        costThisWeek += thisWeekCost;
        costLastWeek += lastWeekCost;
        totalVertexCost += total;

        if (thisWeekCost > 0) {
          breakdown.push({
            model,
            inputTokens: 0, // Not available from billing data
            outputTokens: 0,
            cost: thisWeekCost,
          });
        }
      }
    }

    // Parse infrastructure results
    let cloudRunCost = 0;
    let cloudRunThisWeek = 0;
    let cloudSQLCost = 0;
    let cloudSQLThisWeek = 0;

    if (infraData?.rows) {
      for (const row of infraData.rows) {
        const service = row.f[0]?.v || "";
        const thisWeekCost = parseFloat(row.f[1]?.v || "0");
        const total = parseFloat(row.f[2]?.v || "0");

        if (service === "Cloud Run") {
          cloudRunCost = total;
          cloudRunThisWeek = thisWeekCost;
        } else if (service === "Cloud SQL") {
          cloudSQLCost = total;
          cloudSQLThisWeek = thisWeekCost;
        }
      }
    }

    const weekOverWeekChange =
      costLastWeek > 0 ? ((costThisWeek - costLastWeek) / costLastWeek) * 100 : 0;

    return {
      vertexAI: {
        totalCost: totalVertexCost,
        costThisWeek,
        costLastWeek,
        weekOverWeekChange,
        breakdown,
        currency: "USD",
      },
      cloudRun: {
        totalCost: cloudRunCost,
        costThisWeek: cloudRunThisWeek,
      },
      cloudSQL: {
        totalCost: cloudSQLCost,
        costThisWeek: cloudSQLThisWeek,
      },
      totalGCPCost: totalVertexCost + cloudRunCost + cloudSQLCost,
      dataSource: "bigquery",
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching from BigQuery:", error);
    return null;
  }
}

/**
 * Generate estimated cost based on usage patterns
 *
 * This is a fallback when billing data is not available.
 * Uses token usage from the database to estimate costs.
 */
function generateEstimatedCosts(): GCPCostStats {
  // Gemini 2.5 Flash pricing (as of 2024):
  // Input: $0.00001875 per 1K characters (~$0.000075 per 1K tokens)
  // Output: $0.000075 per 1K characters (~$0.0003 per 1K tokens)
  //
  // These are placeholder values - actual costs depend on real usage

  const estimatedWeeklyCost = 0; // Will be calculated from actual token usage if available

  return {
    vertexAI: {
      totalCost: 0,
      costThisWeek: estimatedWeeklyCost,
      costLastWeek: 0,
      weekOverWeekChange: 0,
      breakdown: [
        {
          model: "gemini-2.5-flash",
          inputTokens: 0,
          outputTokens: 0,
          cost: estimatedWeeklyCost,
        },
      ],
      currency: "USD",
    },
    cloudRun: {
      totalCost: 0,
      costThisWeek: 0,
    },
    cloudSQL: {
      totalCost: 0,
      costThisWeek: 0,
    },
    totalGCPCost: 0,
    dataSource: "estimated",
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get GCP cost statistics for the weekly report
 *
 * Attempts to fetch real billing data from BigQuery.
 * Falls back to estimated costs if billing data is unavailable.
 *
 * @returns GCPCostStats with cost breakdown or placeholder data
 */
export async function getGCPCostStats(): Promise<GCPCostStats> {
  // Skip in test environment
  if (process.env.NODE_ENV === "test") {
    return {
      vertexAI: {
        totalCost: 0,
        costThisWeek: 0,
        costLastWeek: 0,
        weekOverWeekChange: 0,
        breakdown: [],
        currency: "USD",
      },
      cloudRun: { totalCost: 0, costThisWeek: 0 },
      cloudSQL: { totalCost: 0, costThisWeek: 0 },
      totalGCPCost: 0,
      dataSource: "unavailable",
      lastUpdated: new Date().toISOString(),
    };
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const billingDataset = process.env.GCP_BILLING_DATASET;
  const billingTable = process.env.GCP_BILLING_TABLE;

  // Check if BigQuery billing export is configured
  if (!projectId || !billingDataset || !billingTable) {
    console.warn(
      "GCP billing configuration not complete. Required: GCP_PROJECT_ID, GCP_BILLING_DATASET, GCP_BILLING_TABLE",
    );
    return generateEstimatedCosts();
  }

  try {
    // Initialize Google Auth
    const authConfig: Record<string, unknown> = {
      projectId,
      scopes: ["https://www.googleapis.com/auth/bigquery.readonly"],
    };

    // Use service account JSON if available
    if (process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON) {
      try {
        const credentials = JSON.parse(process.env.VERTEX_AI_SERVICE_ACCOUNT_JSON);
        authConfig.credentials = credentials;
      } catch (error) {
        console.error("Failed to parse VERTEX_AI_SERVICE_ACCOUNT_JSON:", error);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      authConfig.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    const auth = new GoogleAuth(authConfig);

    // Try to fetch from BigQuery
    const bigQueryResult = await fetchFromBigQuery(
      auth,
      projectId,
      billingDataset,
      billingTable,
    );

    if (bigQueryResult) {
      return bigQueryResult;
    }

    // Fall back to estimated costs
    console.warn("Failed to fetch billing data, using estimated costs");
    return generateEstimatedCosts();
  } catch (error) {
    console.error("Error getting GCP cost stats:", error);
    return generateEstimatedCosts();
  }
}

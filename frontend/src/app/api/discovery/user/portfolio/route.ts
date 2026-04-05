/**
 * Portfolio API — stores/retrieves portfolio items in users.metadata.portfolio
 *
 * GET  /api/discovery/user/portfolio   — list all portfolio items
 * POST /api/discovery/user/portfolio   — add a new portfolio item
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/get-pool";
import { getUnifiedAuth, createUnauthorizedResponse } from "@/lib/auth/unified-auth";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

export interface PortfolioItem {
  id: string;
  careerId: string;
  title: string;
  description: string;
  skills: string[];
  xpEarned: number;
  completedAt: string;
  evidenceUrl?: string;
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pool = getPool();
    const { rows } = await pool.query<{ metadata: Record<string, unknown> }>(
      `SELECT metadata FROM users WHERE id = $1`,
      [user.id],
    );

    const metadata = rows[0]?.metadata ?? {};
    const portfolio = Array.isArray(metadata.portfolio)
      ? (metadata.portfolio as PortfolioItem[])
      : [];

    return NextResponse.json({ success: true, portfolio, total: portfolio.length });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getUnifiedAuth(request);
    if (!session?.user?.email) {
      return createUnauthorizedResponse();
    }

    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as Partial<PortfolioItem>;

    if (!body.careerId || !body.title || !body.description) {
      return NextResponse.json(
        { error: "careerId, title, and description are required" },
        { status: 400 },
      );
    }

    const newItem: PortfolioItem = {
      id: crypto.randomUUID(),
      careerId: body.careerId,
      title: body.title,
      description: body.description,
      skills: body.skills ?? [],
      xpEarned: body.xpEarned ?? 0,
      completedAt: body.completedAt ?? new Date().toISOString(),
      evidenceUrl: body.evidenceUrl,
    };

    const pool = getPool();

    // Append to existing portfolio array inside metadata JSON column
    await pool.query(
      `UPDATE users
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{portfolio}',
         COALESCE(metadata->'portfolio', '[]'::jsonb) || $1::jsonb
       ),
       updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(newItem), user.id],
    );

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Error adding portfolio item:", error);
    return NextResponse.json({ error: "Failed to add portfolio item" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

// Ultra simple health check - no external dependencies
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      message: "Simple health check - no database or Redis checks",
    },
    { status: 200 },
  );
}

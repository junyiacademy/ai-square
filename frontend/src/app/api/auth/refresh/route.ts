import { NextRequest, NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth/auth-manager";
import {
  getSession,
  destroySession,
  createSession,
} from "@/lib/auth/simple-auth";

export async function POST(request: NextRequest) {
  try {
    // Get current session token
    const currentToken = AuthManager.getSessionToken(request);

    if (!currentToken) {
      return NextResponse.json(
        { success: false, error: "No session found" },
        { status: 401 },
      );
    }

    // Get current session data from database (async)
    const sessionData = await getSession(currentToken);

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Session expired" },
        { status: 401 },
      );
    }

    // Destroy old session
    await destroySession(currentToken);

    // Create new session with same user data
    const newToken = await createSession(
      {
        userId: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        name: sessionData.name || sessionData.email.split("@")[0],
      },
      false, // Don't extend to remember me on refresh
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
    });

    // Set new token in cookie
    AuthManager.setAuthCookie(response, newToken, false);

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 500 },
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

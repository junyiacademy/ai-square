import { NextRequest, NextResponse } from "next/server";
import { AuthManager } from "@/lib/auth/auth-manager";
import { SecureSession } from "@/lib/auth/secure-session";

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get("sessionToken")?.value;

    // Destroy session in store
    if (sessionToken) {
      SecureSession.destroySession(sessionToken);
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear auth cookies
    AuthManager.clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
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

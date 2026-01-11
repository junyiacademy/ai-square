import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  OAuthProvider,
  getOAuthConfig,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchOAuthUserInfo,
  upsertOAuthUser,
  createOAuthSession,
} from "@/lib/auth/oauth-utils";

function isProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

function getBaseUrl(request: NextRequest): string {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(request.url).origin
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const config = getOAuthConfig(provider);
  if (!config) {
    return NextResponse.json(
      { error: "OAuth provider not configured" },
      { status: 501 },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const redirectTarget = url.searchParams.get("redirect") || "/pbl/scenarios";
  const redirectUri = `${getBaseUrl(request)}/api/auth/oauth/${provider}`;

  if (!code) {
    const oauthState = crypto.randomBytes(16).toString("hex");
    const authorizeUrl = buildAuthorizeUrl(
      provider,
      config,
      redirectUri,
      oauthState,
    );

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(`oauth_state_${provider}`, oauthState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    response.cookies.set(`oauth_redirect_${provider}`, redirectTarget, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    return response;
  }

  const storedState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  try {
    const accessToken = await exchangeCodeForToken(
      provider,
      config,
      code,
      redirectUri,
    );
    const userInfo = await fetchOAuthUserInfo(provider, accessToken);
    const user = await upsertOAuthUser(userInfo);
    const sessionToken = await createOAuthSession(user);

    const redirectCookie =
      request.cookies.get(`oauth_redirect_${provider}`)?.value ||
      "/pbl/scenarios";
    const safeRedirect = redirectCookie.startsWith("/")
      ? redirectCookie
      : "/pbl/scenarios";

    const response = NextResponse.redirect(
      new URL(safeRedirect, getBaseUrl(request)),
    );
    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    response.cookies.delete(`oauth_state_${provider}`);
    response.cookies.delete(`oauth_redirect_${provider}`);
    return response;
  } catch (error) {
    console.error("[OAuth] Error:", error);
    return NextResponse.json(
      { error: "OAuth login failed" },
      { status: 500 },
    );
  }
}

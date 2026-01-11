import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getPool, createSession } from "@/lib/auth/simple-auth";

export type OAuthProvider = "google" | "github";

export type OAuthUserInfo = {
  email: string;
  name: string;
  avatarUrl?: string;
};

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
};

const PROVIDER_CONFIG: Record<OAuthProvider, Omit<OAuthConfig, "clientId" | "clientSecret">> =
  {
    google: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["openid", "email", "profile"],
    },
    github: {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scopes: ["read:user", "user:email"],
    },
  };

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig | null {
  const clientId =
    provider === "google"
      ? process.env.GOOGLE_OAUTH_CLIENT_ID
      : process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret =
    provider === "google"
      ? process.env.GOOGLE_OAUTH_CLIENT_SECRET
      : process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    ...PROVIDER_CONFIG[provider],
  };
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  config: OAuthConfig,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  config: OAuthConfig,
  code: string,
  redirectUri: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (provider === "github") {
    headers.Accept = "application/json";
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("OAuth token missing in response");
  }

  return data.access_token;
}

export async function fetchOAuthUserInfo(
  provider: OAuthProvider,
  accessToken: string,
): Promise<OAuthUserInfo> {
  if (provider === "google") {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch Google user info");
    }
    const data = (await response.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!data.email) {
      throw new Error("Google user info missing email");
    }
    return {
      email: data.email,
      name: data.name || data.email.split("@")[0],
      avatarUrl: data.picture,
    };
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) {
    throw new Error("Failed to fetch GitHub user info");
  }
  const userData = (await userResponse.json()) as {
    login?: string;
    name?: string;
    avatar_url?: string;
    email?: string | null;
  };

  let email = userData.email;
  if (!email) {
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email;
    }
  }

  if (!email) {
    throw new Error("GitHub user info missing email");
  }

  return {
    email,
    name: userData.name || userData.login || email.split("@")[0],
    avatarUrl: userData.avatar_url,
  };
}

export async function upsertOAuthUser(userInfo: OAuthUserInfo) {
  const db = getPool();

  const existing = await db.query(
    "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER($1)",
    [userInfo.email],
  );

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    await db.query(
      "UPDATE users SET name = $1, email_verified = true WHERE id = $2",
      [userInfo.name, user.id],
    );
    return user;
  }

  const randomPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, role, name, email_verified, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 'student', $3, true, NOW(), NOW())
     RETURNING id, email, name, role`,
    [userInfo.email, passwordHash, userInfo.name],
  );

  return result.rows[0];
}

export async function createOAuthSession(user: {
  id: string;
  email: string;
  role: string;
  name: string;
}) {
  return createSession(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    false,
  );
}

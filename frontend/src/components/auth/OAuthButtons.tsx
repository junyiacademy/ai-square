"use client";

import Link from "next/link";

type OAuthButtonsProps = {
  redirectPath: string;
};

export function OAuthButtons({ redirectPath }: OAuthButtonsProps) {
  const googleEnabled = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  );
  const githubEnabled = Boolean(
    process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID,
  );

  const googleHref = `/api/auth/oauth/google?redirect=${encodeURIComponent(
    redirectPath,
  )}`;
  const githubHref = `/api/auth/oauth/github?redirect=${encodeURIComponent(
    redirectPath,
  )}`;

  return (
    <div className="space-y-3">
      <Link
        href={googleEnabled ? googleHref : "#"}
        aria-disabled={!googleEnabled}
        className={`w-full flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
          googleEnabled
            ? "border-gray-300 text-gray-700 hover:bg-gray-50"
            : "border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <span>Continue with Google</span>
      </Link>
      <Link
        href={githubEnabled ? githubHref : "#"}
        aria-disabled={!githubEnabled}
        className={`w-full flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
          githubEnabled
            ? "border-gray-300 text-gray-700 hover:bg-gray-50"
            : "border-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <span>Continue with GitHub</span>
      </Link>
      {!googleEnabled && !githubEnabled && (
        <p className="text-xs text-gray-500 text-center">
          Social login is not configured yet.
        </p>
      )}
    </div>
  );
}

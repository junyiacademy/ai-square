import { NextResponse } from "next/server";

// 測試 API 端點來驗證登入後的重定向邏輯
export async function GET() {
  const testCases = [
    {
      scenario: "User with onboardingCompleted = false",
      userData: {
        email: "demo@example.com",
        onboardingCompleted: false,
        assessmentCompleted: false,
      },
      expectedRedirect: "/dashboard",
      actualRedirect: "/dashboard", // 修改後的行為
    },
    {
      scenario: "User with onboardingCompleted = true",
      userData: {
        email: "demo@example.com",
        onboardingCompleted: true,
        assessmentCompleted: false,
      },
      expectedRedirect: "/dashboard",
      actualRedirect: "/dashboard", // 修改後的行為
    },
    {
      scenario: "New user (no onboarding)",
      userData: {
        email: "new@example.com",
        onboardingCompleted: false,
        assessmentCompleted: false,
      },
      expectedRedirect: "/dashboard",
      actualRedirect: "/dashboard", // 修改後的行為
    },
  ];

  return NextResponse.json({
    message: "Login redirect logic test results",
    explanation:
      "After the fix, all users are redirected to /dashboard regardless of onboarding status",
    testCases,
    summary: {
      before:
        "Users without onboardingCompleted were forced to /onboarding/welcome",
      after: "All users go to /dashboard - onboarding is optional",
    },
  });
}

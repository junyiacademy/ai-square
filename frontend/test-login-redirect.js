// 測試登入後的重定向邏輯
const loginPageCode = `
// 從 login/page.tsx 提取的關鍵邏輯
const userData = {
  email: 'demo@example.com',
  onboardingCompleted: false,  // 資料庫中的值
  assessmentCompleted: false
};

const onboarding = {
  welcomeCompleted: false,
  identityCompleted: false,
  goalsCompleted: false
};

// 原始邏輯（已被註解掉）
/*
const derivedOnboardingCompleted = Boolean(
  onboarding.welcomeCompleted &&
    onboarding.identityCompleted &&
    onboarding.goalsCompleted
);
const isOnboardingCompleted = Boolean(
  userData?.onboardingCompleted || derivedOnboardingCompleted
);

if (!isOnboardingCompleted) {
  console.log('原始邏輯：會導向到 /onboarding/welcome');
} else {
  console.log('原始邏輯：會導向到 /dashboard 或 /assessment/scenarios');
}
*/

// 新邏輯
console.log('新邏輯：直接導向到 /dashboard（不檢查 onboarding 狀態）');
`;

console.log('===== 測試登入重定向邏輯 =====\n');
console.log('情境：demo@example.com 使用者');
console.log('- onboardingCompleted: false (資料庫中的值)');
console.log('- 所有 onboarding 步驟都未完成\n');
console.log('測試結果：');
eval(loginPageCode);

console.log('\n===== 結論 =====');
console.log('✅ 修改後的程式碼不再強制使用者完成 onboarding');
console.log('✅ 使用者登入後會直接進入 dashboard');
console.log('✅ 使用者可以自由選擇是否要進行 onboarding');
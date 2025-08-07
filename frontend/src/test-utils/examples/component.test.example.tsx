/**
 * 範例：使用新的測試基礎設施進行元件測試
 * 這個檔案展示如何使用 renderWithProviders 和其他工具
 */

import { renderWithProviders, screen, waitFor } from '@/test-utils';
import { mockUseSession } from '@/test-utils/mocks/next-auth';

// 範例元件
const UserProfile = () => {
  const { data: session } = mockUseSession();
  
  if (!session) {
    return <div>Please login</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {session.user?.name}</h1>
      <p>Email: {session.user?.email}</p>
      <button>Edit Profile</button>
    </div>
  );
};

describe('UserProfile Component (Example)', () => {
  it('should show login message when not authenticated', () => {
    // 設定未認證狀態
    mockUseSession.mockReturnValueOnce({
      data: null as any,
      status: 'unauthenticated' as 'authenticated' | 'unauthenticated' | 'loading',
      update: jest.fn(),
    });
    
    renderWithProviders(<UserProfile />);
    
    expect(screen.getByText('Please login')).toBeInTheDocument();
  });
  
  it('should show user info when authenticated', async () => {
    // 使用預設的 mock session（已認證）
    const { user } = renderWithProviders(<UserProfile />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
    
    // 測試使用者互動
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);
    
    // 這裡可以斷言按鈕點擊後的行為
  });
  
  it('should handle loading state', () => {
    // 設定載入狀態
    mockUseSession.mockReturnValueOnce({
      data: null as any,
      status: 'loading' as 'authenticated' | 'unauthenticated' | 'loading',
      update: jest.fn(),
    });
    
    renderWithProviders(<UserProfile />);
    
    // 根據實際元件行為調整斷言
    expect(screen.getByText('Please login')).toBeInTheDocument();
  });
});
import { render, screen } from '@testing-library/react';
import { WelcomePanel } from '../WelcomePanel';

describe('WelcomePanel', () => {
  it('renders welcome message', () => {
    render(<WelcomePanel />);
    expect(screen.getByText('歡迎使用場景編輯器')).toBeInTheDocument();
  });

  it('displays all learning modes', () => {
    render(<WelcomePanel />);
    expect(screen.getByText('PBL 專案')).toBeInTheDocument();
    expect(screen.getByText('Discovery 探索')).toBeInTheDocument();
    expect(screen.getByText('Assessment 評測')).toBeInTheDocument();
  });
});

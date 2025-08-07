import React from 'react';
import {
  renderWithProviders,
  screen,
  getStatisticByLabel,
  getBadgeByCategory,
  getByTextWithContext,
  setupFramerMotionMocks,
  setupHeroIconsMocks
} from '@/test-utils';
import AchievementsView from '../AchievementsView';
import type { UserAchievements } from '@/lib/services/user-data-service';

// Setup common mocks
setupFramerMotionMocks();
setupHeroIconsMocks();

describe('AchievementsView', () => {
  const testTranslations = {
    'achievements.title': 'Your Achievements',
    'achievements.badges.first_task.title': 'First Task',
    'achievements.badges.first_task.description': 'Completed your first task',
    'achievements.badges.creative_thinker.title': 'Creative Thinker',
    'achievements.badges.creative_thinker.description': 'Showed creative thinking',
    'achievements.badges.ai_collaborator.title': 'AI Collaborator',
    'achievements.badges.ai_collaborator.description': 'Worked well with AI',
    'achievements.badges.problem_solver.title': 'Problem Solver',
    'achievements.badges.problem_solver.description': 'Solved complex problems',
    'achievements.badges.path_explorer.title': 'Path Explorer',
    'achievements.badges.path_explorer.description': 'Explored different paths',
  };

  const mockAchievements: UserAchievements = {
    badges: [
      { id: 'first_task', name: 'First Task', description: 'Completed first task', unlockedAt: '2024-01-01', category: 'learning' as const, xpReward: 100 },
      { id: 'creative_thinker', name: 'Creative Thinker', description: 'Creative thinking', unlockedAt: '2024-01-02', category: 'mastery' as const, xpReward: 200 }
    ],
    totalXp: 250,
    level: 3,
    completedTasks: ['task1', 'task2', 'task3', 'task4', 'task5']
  };

  it('should render without crashing', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });
    expect(screen.getByText('Your Achievements')).toBeInTheDocument();
  });

  it('should display user level, XP and badge count', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Use context-specific queries to avoid ambiguity
    expect(getByTextWithContext('Level 3', '目前等級')).toBeInTheDocument();
    expect(getByTextWithContext('250', '總經驗值')).toBeInTheDocument();
    expect(getByTextWithContext('2', '已獲得徽章')).toBeInTheDocument();
  });

  it('should render earned badges correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    expect(getBadgeByCategory('First Task', 'earned')).toBeInTheDocument();
    expect(getBadgeByCategory('Creative Thinker', 'earned')).toBeInTheDocument();
    expect(screen.getByText('Completed your first task')).toBeInTheDocument();
    expect(screen.getByText('Showed creative thinking')).toBeInTheDocument();

    // Should show "已獲得" (earned) status
    expect(screen.getAllByText('已獲得')).toHaveLength(2);
  });

  it('should render available badges correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    expect(getBadgeByCategory('AI Collaborator', 'available')).toBeInTheDocument();
    expect(getBadgeByCategory('Problem Solver', 'available')).toBeInTheDocument();
    expect(getBadgeByCategory('Path Explorer', 'available')).toBeInTheDocument();

    // Should show "待獲得" (available) status
    expect(screen.getAllByText('待獲得')).toHaveLength(3);
  });

  it('should calculate and display level progress correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Level 3 with 250 XP
    // Current level XP = 250 - (2 * 100) = 50
    // Progress = (50 / 100) * 100 = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Next level XP = 3 * 100 = 300
    // Remaining XP = 300 - 250 = 50
    expect(screen.getByText(/還需要 50 XP 升級到等級 4/)).toBeInTheDocument();
  });

  it('should display statistics correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Use context-specific queries for statistics
    expect(getByTextWithContext('5', '已完成任務')).toBeInTheDocument();
    expect(getByTextWithContext('2', '獲得徽章')).toBeInTheDocument();
    expect(getByTextWithContext('3', '目前等級')).toBeInTheDocument();
    expect(getByTextWithContext('5', '學習時數')).toBeInTheDocument();
  });

  it('should show level benefits when level > 1', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    expect(screen.getByText('等級特權')).toBeInTheDocument();
    expect(screen.getByText('解鎖進階任務')).toBeInTheDocument();
    expect(screen.getByText('獲得專屬稱號')).toBeInTheDocument();
  });

  it('should not show level benefits when level = 1', () => {
    const lowLevelAchievements: UserAchievements = {
      ...mockAchievements,
      level: 1,
      totalXp: 50
    };

    renderWithProviders(<AchievementsView achievements={lowLevelAchievements} />, {
      translations: testTranslations
    });

    expect(screen.queryByText('等級特權')).not.toBeInTheDocument();
  });

  it('should show empty state when no badges earned', () => {
    const noBadgesAchievements: UserAchievements = {
      badges: [],
      totalXp: 0,
      level: 1,
      completedTasks: []
    };

    renderWithProviders(<AchievementsView achievements={noBadgesAchievements} />, {
      translations: testTranslations
    });

    expect(screen.getByText('還沒有獲得任何徽章')).toBeInTheDocument();
    expect(screen.getByText('完成任務來獲得你的第一個徽章！')).toBeInTheDocument();
  });

  it('should render all available badge types', () => {
    const allBadgesAchievements: UserAchievements = {
      badges: [
        { id: 'first_task', name: 'First Task', description: 'Completed first task', unlockedAt: '2024-01-01', category: 'learning' as const, xpReward: 100 },
        { id: 'creative_thinker', name: 'Creative Thinker', description: 'Creative thinking', unlockedAt: '2024-01-02', category: 'mastery' as const, xpReward: 200 },
        { id: 'ai_collaborator', name: 'AI Collaborator', description: 'AI collaboration', unlockedAt: '2024-01-03', category: 'exploration' as const, xpReward: 150 },
        { id: 'problem_solver', name: 'Problem Solver', description: 'Problem solving', unlockedAt: '2024-01-04', category: 'mastery' as const, xpReward: 300 },
        { id: 'path_explorer', name: 'Path Explorer', description: 'Path exploration', unlockedAt: '2024-01-05', category: 'exploration' as const, xpReward: 250 }
      ],
      totalXp: 500,
      level: 5,
      completedTasks: ['task1', 'task2', 'task3']
    };

    renderWithProviders(<AchievementsView achievements={allBadgesAchievements} />, {
      translations: testTranslations
    });

    // All badges should be in earned section
    expect(getBadgeByCategory('First Task', 'earned')).toBeInTheDocument();
    expect(getBadgeByCategory('Creative Thinker', 'earned')).toBeInTheDocument();
    expect(getBadgeByCategory('AI Collaborator', 'earned')).toBeInTheDocument();
    expect(getBadgeByCategory('Problem Solver', 'earned')).toBeInTheDocument();
    expect(getBadgeByCategory('Path Explorer', 'earned')).toBeInTheDocument();

    // All should show as earned
    expect(screen.getAllByText('已獲得')).toHaveLength(5);
    expect(screen.queryByText('待獲得')).not.toBeInTheDocument();
  });

  it('should display correct icons for each badge type', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Trophy icon in header
    expect(screen.getByTestId('trophy-icon-solid')).toBeInTheDocument();
    
    // Star icon for earned badges section
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    
    // Trophy outline icon for available badges section
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
  });

  it('should handle zero XP and level correctly', () => {
    const zeroAchievements: UserAchievements = {
      badges: [],
      totalXp: 0,
      level: 1,
      completedTasks: []
    };

    renderWithProviders(<AchievementsView achievements={zeroAchievements} />, {
      translations: testTranslations
    });

    expect(getByTextWithContext('Level 1', '目前等級')).toBeInTheDocument();
    expect(getByTextWithContext('0', '總經驗值')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument(); // Progress
    expect(screen.getByText(/還需要 100 XP 升級到等級 2/)).toBeInTheDocument();
  });

  it('should handle high level benefits correctly', () => {
    const highLevelAchievements: UserAchievements = {
      badges: [],
      totalXp: 1000,
      level: 10,
      completedTasks: []
    };

    renderWithProviders(<AchievementsView achievements={highLevelAchievements} />, {
      translations: testTranslations
    });

    expect(screen.getByText('解鎖進階任務')).toBeInTheDocument();
    expect(screen.getByText('獲得專屬稱號')).toBeInTheDocument();
    expect(screen.getByText('解鎖特殊成就')).toBeInTheDocument();
    expect(screen.getByText('探索大師認證')).toBeInTheDocument();
  });

  it('should handle edge case of exactly leveling up', () => {
    const exactLevelAchievements: UserAchievements = {
      badges: [],
      totalXp: 300, // Exactly at level 4 threshold
      level: 3,
      completedTasks: []
    };

    renderWithProviders(<AchievementsView achievements={exactLevelAchievements} />, {
      translations: testTranslations
    });

    // Current level XP = 300 - (2 * 100) = 100
    // Progress = (100 / 100) * 100 = 100%
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/還需要 0 XP 升級到等級 4/)).toBeInTheDocument();
  });

  it('should render section headers correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    expect(screen.getByText('已獲得徽章')).toBeInTheDocument();
    expect(screen.getByText('可獲得徽章')).toBeInTheDocument();
    expect(screen.getByText('學習統計')).toBeInTheDocument();
  });

  it('should handle missing badge IDs gracefully', () => {
    const invalidBadgeAchievements: UserAchievements = {
      badges: [
        { id: 'nonexistent_badge', name: 'Nonexistent Badge', description: 'Badge that does not exist', unlockedAt: '2024-01-01', category: 'special' as const, xpReward: 0 },
        { id: 'first_task', name: 'First Task', description: 'Completed first task', unlockedAt: '2024-01-02', category: 'learning' as const, xpReward: 100 }
      ],
      totalXp: 100,
      level: 2,
      completedTasks: []
    };

    renderWithProviders(<AchievementsView achievements={invalidBadgeAchievements} />, {
      translations: testTranslations
    });

    // Should only show valid badge
    expect(getBadgeByCategory('First Task', 'earned')).toBeInTheDocument();
    expect(screen.getAllByText('已獲得')).toHaveLength(1);
  });

  it('should display subtitle text', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    expect(screen.getByText('追蹤你的學習成就和技能發展')).toBeInTheDocument();
  });

  it('should display static text labels correctly', () => {
    renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Use getAllByText for labels that might appear multiple times
    expect(screen.getAllByText('目前等級')).toHaveLength(2); // Appears in header and stats
    expect(screen.getByText('總經驗值')).toBeInTheDocument();
    expect(screen.getAllByText('已獲得徽章')).toHaveLength(2); // Header and section title
    expect(screen.getByText('下一等級進度')).toBeInTheDocument();
    expect(screen.getByText('已完成任務')).toBeInTheDocument();
    expect(screen.getByText('獲得徽章')).toBeInTheDocument();
    expect(screen.getByText('學習時數')).toBeInTheDocument();
  });

  it('should handle translation failures gracefully', () => {
    // Don't provide custom translations - should fallback to keys
    renderWithProviders(<AchievementsView achievements={mockAchievements} />);

    // Should still render with translation keys
    expect(screen.getByText('achievements.title')).toBeInTheDocument();
  });

  it('should render with proper structure and CSS classes', () => {
    const { container } = renderWithProviders(<AchievementsView achievements={mockAchievements} />, {
      translations: testTranslations
    });

    // Main container
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
    
    // Grid layouts
    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(container.querySelector('[class*="grid-cols"]')).toBeInTheDocument();
  });
});
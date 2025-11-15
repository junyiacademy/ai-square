import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  PBLScenarioCardSkeleton,
  PBLScenariosListSkeleton,
  PBLScenarioDetailsSkeleton,
  PBLTaskProgressSkeleton,
  PBLLearningContentSkeleton,
  PBLCompletionSkeleton
} from '../loading-skeletons';

// Mock the LoadingSkeleton component
jest.mock('../../ui/loading-skeleton', () => ({
  LoadingSkeleton: ({ className }: { className: string }) => (
    <div data-testid="loading-skeleton" className={className} />
  ),
  LoadingCard: () => <div data-testid="loading-card" />
}));

describe('PBL Loading Skeletons', () => {
  describe('PBLScenarioCardSkeleton', () => {
    it('renders scenario card skeleton with correct structure', () => {
      render(<PBLScenarioCardSkeleton />);

      const skeletons = screen.getAllByTestId('loading-skeleton');
      expect(skeletons).toHaveLength(5); // title, description, 2 tags, button

      // Check for correct classes
      expect(skeletons[0]).toHaveClass('h-6 w-3/4 mb-2');
      expect(skeletons[1]).toHaveClass('h-4 w-full mb-4');
      expect(skeletons[4]).toHaveClass('h-10 w-full');
    });
  });

  describe('PBLScenariosListSkeleton', () => {
    it('renders 6 scenario card skeletons in a grid', () => {
      const { container } = render(<PBLScenariosListSkeleton />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');

      // Should have 6 cards
      const skeletons = screen.getAllByTestId('loading-skeleton');
      expect(skeletons).toHaveLength(30); // 6 cards * 5 skeletons per card
    });
  });

  describe('PBLScenarioDetailsSkeleton', () => {
    it('renders complete scenario details skeleton', () => {
      render(<PBLScenarioDetailsSkeleton />);

      // Check for loading cards (objectives & prerequisites)
      const loadingCards = screen.getAllByTestId('loading-card');
      expect(loadingCards).toHaveLength(2);

      // Check for header section
      const skeletons = screen.getAllByTestId('loading-skeleton');
      expect(skeletons.length).toBeGreaterThan(10);

      // Check for tasks section (4 task items)
      const taskSkeletons = skeletons.filter(el =>
        el.classList.contains('h-5') && el.classList.contains('w-3/4')
      );
      expect(taskSkeletons).toHaveLength(4);
    });

    it('has correct structure with header, programs, objectives, tasks and action button', () => {
      const { container } = render(<PBLScenarioDetailsSkeleton />);

      // Check for main sections
      const sections = container.querySelectorAll('.rounded-lg');
      expect(sections.length).toBeGreaterThanOrEqual(5);

      // Check for blue background section (user programs)
      const programSection = container.querySelector('.bg-blue-50');
      expect(programSection).toBeInTheDocument();
    });
  });

  describe('PBLTaskProgressSkeleton', () => {
    it('renders task progress sidebar with 4 tasks', () => {
      render(<PBLTaskProgressSkeleton />);

      const skeletons = screen.getAllByTestId('loading-skeleton');

      // Should have title + 4 tasks * 3 skeletons each (circle, title, status)
      expect(skeletons.length).toBeGreaterThanOrEqual(9);

      // Check for circular skeletons (task indicators)
      const circularSkeletons = skeletons.filter(el =>
        el.classList.contains('h-8') && el.classList.contains('w-8') && el.classList.contains('rounded-full')
      );
      expect(circularSkeletons).toHaveLength(4);
    });
  });

  describe('PBLLearningContentSkeleton', () => {
    it('renders learning content with sidebar and main content', () => {
      const { container } = render(<PBLLearningContentSkeleton />);

      // Check for flex layout
      const flexContainer = container.querySelector('.flex.gap-6');
      expect(flexContainer).toBeInTheDocument();

      // Check for sidebar
      const sidebar = container.querySelector('.w-1\\/3');
      expect(sidebar).toBeInTheDocument();

      // Check for main content
      const mainContent = container.querySelector('.flex-1');
      expect(mainContent).toBeInTheDocument();
    });

    it('renders chat interface skeleton with alternating message styles', () => {
      const { container } = render(<PBLLearningContentSkeleton />);

      // Check for chat messages with alternating backgrounds
      const grayMessages = container.querySelectorAll('.bg-gray-100');
      const blueMessages = container.querySelectorAll('.bg-blue-100');

      expect(grayMessages.length).toBeGreaterThan(0);
      expect(blueMessages.length).toBeGreaterThan(0);
    });
  });

  describe('PBLCompletionSkeleton', () => {
    it('renders completion page skeleton with summary and evaluation sections', () => {
      const { container } = render(<PBLCompletionSkeleton />);

      // Check for summary card with 3 stat items
      const statItems = container.querySelectorAll('.text-center');
      expect(statItems).toHaveLength(3);

      // Check for gradient background section (AI feedback)
      const gradientSection = container.querySelector('.bg-gradient-to-r');
      expect(gradientSection).toBeInTheDocument();
    });

    it('renders task evaluation cards', () => {
      const { container } = render(<PBLCompletionSkeleton />);

      // Check for task evaluation items (4 tasks)
      const taskCards = container.querySelectorAll('.border.rounded-lg.p-4');
      expect(taskCards).toHaveLength(4);

      // Each task card should have knowledge and skill sections
      taskCards.forEach(card => {
        const grids = card.querySelectorAll('.grid-cols-2');
        expect(grids.length).toBeGreaterThan(0);
      });
    });
  });
});

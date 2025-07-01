import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TargetAudienceSection from '../TargetAudienceSection';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'target.title': 'Who Is AI Square For?',
        'target.subtitle': 'Designed for learners at every level',
        'target.audiences.individuals.title': 'Individuals',
        'target.audiences.individuals.description': 'Develop essential AI skills for your personal and professional growth',
        'target.audiences.educators.title': 'Educators',
        'target.audiences.educators.description': 'Integrate AI literacy into your curriculum with ready-to-use resources',
        'target.audiences.organizations.title': 'Organizations',
        'target.audiences.organizations.description': 'Build AI-capable teams with scalable training solutions'
      };
      return translations[key] || key;
    }
  })
}));

describe('TargetAudienceSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TargetAudienceSection />);
    expect(screen.getByText('Who Is AI Square For?')).toBeInTheDocument();
  });

  it('displays the section title', () => {
    render(<TargetAudienceSection />);
    const title = screen.getByText('Who Is AI Square For?');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H2');
    expect(title).toHaveClass('text-3xl', 'md:text-4xl', 'font-bold', 'text-gray-900');
  });

  it('displays the section subtitle', () => {
    render(<TargetAudienceSection />);
    const subtitle = screen.getByText('Designed for learners at every level');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle).toHaveClass('text-xl', 'text-gray-600');
  });

  it('renders all three audience types', () => {
    render(<TargetAudienceSection />);
    
    expect(screen.getByText('Individuals')).toBeInTheDocument();
    expect(screen.getByText('Educators')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
  });

  it('renders audience descriptions', () => {
    render(<TargetAudienceSection />);
    
    expect(screen.getByText('Develop essential AI skills for your personal and professional growth')).toBeInTheDocument();
    expect(screen.getByText('Integrate AI literacy into your curriculum with ready-to-use resources')).toBeInTheDocument();
    expect(screen.getByText('Build AI-capable teams with scalable training solutions')).toBeInTheDocument();
  });

  it('renders SVG icons for each audience', () => {
    const { container } = render(<TargetAudienceSection />);
    const svgs = container.querySelectorAll('svg');
    
    // Should have 3 SVG icons
    expect(svgs).toHaveLength(3);
    
    // Each SVG should have proper classes
    svgs.forEach(svg => {
      expect(svg).toHaveClass('w-12', 'h-12');
    });
  });

  it('applies correct gradient colors to icon containers', () => {
    const { container } = render(<TargetAudienceSection />);
    const iconContainers = container.querySelectorAll('.inline-flex.bg-gradient-to-br');
    
    expect(iconContainers[0]).toHaveClass('from-blue-400', 'to-blue-600');
    expect(iconContainers[1]).toHaveClass('from-green-400', 'to-green-600');
    expect(iconContainers[2]).toHaveClass('from-purple-400', 'to-purple-600');
  });

  it('applies background colors to audience cards', () => {
    const { container } = render(<TargetAudienceSection />);
    const cards = container.querySelectorAll('.relative.overflow-hidden.rounded-2xl');
    
    expect(cards[0]).toHaveClass('bg-blue-50');
    expect(cards[1]).toHaveClass('bg-green-50');
    expect(cards[2]).toHaveClass('bg-purple-50');
  });

  it('applies hover effects to audience cards', () => {
    const { container } = render(<TargetAudienceSection />);
    const cards = container.querySelectorAll('.relative.overflow-hidden.rounded-2xl');
    
    cards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-xl', 'transition-all', 'duration-300');
    });
  });

  it('renders decorative elements', () => {
    const { container } = render(<TargetAudienceSection />);
    const decorativeElements = container.querySelectorAll('.absolute.-bottom-10.-right-10');
    
    expect(decorativeElements).toHaveLength(3);
    
    decorativeElements.forEach((element, index) => {
      expect(element).toHaveClass('w-40', 'h-40', 'rounded-full', 'opacity-10');
      const colors = ['blue', 'green', 'purple'];
      expect(element).toHaveClass(`from-${colors[index]}-400`, `to-${colors[index]}-600`);
    });
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<TargetAudienceSection />);
    const grid = container.querySelector('.grid');
    
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-3', 'gap-8');
  });

  it('applies proper section styling', () => {
    const { container } = render(<TargetAudienceSection />);
    const section = container.querySelector('section');
    
    expect(section).toHaveClass('py-20', 'bg-white');
  });

  it('centers text content', () => {
    const { container } = render(<TargetAudienceSection />);
    const textCenterDiv = container.querySelector('.text-center');
    
    expect(textCenterDiv).toBeInTheDocument();
    expect(textCenterDiv).toHaveClass('mb-16');
  });

  it('applies shadow to icon containers', () => {
    const { container } = render(<TargetAudienceSection />);
    const iconContainers = container.querySelectorAll('.inline-flex.bg-gradient-to-br');
    
    iconContainers.forEach(container => {
      expect(container).toHaveClass('shadow-lg');
    });
  });

  it('uses proper spacing and padding', () => {
    const { container } = render(<TargetAudienceSection />);
    
    const maxWidthContainer = container.querySelector('.max-w-7xl');
    expect(maxWidthContainer).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    
    const cards = container.querySelectorAll('.relative.overflow-hidden.rounded-2xl');
    cards.forEach(card => {
      expect(card).toHaveClass('p-8');
    });
  });

  it('positions content with proper z-index', () => {
    const { container } = render(<TargetAudienceSection />);
    const contentContainers = container.querySelectorAll('.relative.z-10');
    
    expect(contentContainers).toHaveLength(3);
  });

  it('applies rounded corners to cards', () => {
    const { container } = render(<TargetAudienceSection />);
    const cards = container.querySelectorAll('.relative.overflow-hidden');
    
    cards.forEach(card => {
      expect(card).toHaveClass('rounded-2xl');
    });
  });

  it('styles icon containers with proper dimensions', () => {
    const { container } = render(<TargetAudienceSection />);
    const iconContainers = container.querySelectorAll('.inline-flex.bg-gradient-to-br');
    
    iconContainers.forEach(container => {
      expect(container).toHaveClass('w-20', 'h-20', 'rounded-2xl');
    });
  });

  it('applies margin to icon containers', () => {
    const { container } = render(<TargetAudienceSection />);
    const iconContainers = container.querySelectorAll('.inline-flex.bg-gradient-to-br');
    
    iconContainers.forEach(container => {
      expect(container).toHaveClass('mb-6');
    });
  });

  it('styles audience titles properly', () => {
    render(<TargetAudienceSection />);
    
    const titles = ['Individuals', 'Educators', 'Organizations'];
    titles.forEach(title => {
      const element = screen.getByText(title);
      expect(element.tagName).toBe('H3');
      expect(element).toHaveClass('text-2xl', 'font-bold', 'text-gray-900', 'mb-4');
    });
  });
});
/**
 * Common Component Mocks for Testing
 * Centralized mocks for frequently used components and libraries
 */
import React from 'react';

// Framer Motion Mock
export const motionMock = {
  div: ({ children, className, style, ...props }: any) => (
    <div className={className} style={style} {...props}>{children}</div>
  ),
  span: ({ children, className, style, ...props }: any) => (
    <span className={className} style={style} {...props}>{children}</span>
  ),
  button: ({ children, className, style, ...props }: any) => (
    <button className={className} style={style} {...props}>{children}</button>
  ),
  section: ({ children, className, style, ...props }: any) => (
    <section className={className} style={style} {...props}>{children}</section>
  ),
  article: ({ children, className, style, ...props }: any) => (
    <article className={className} style={style} {...props}>{children}</article>
  )
};

// Hero Icons Mock - Outline
export const heroIconsOutlineMock = {
  TrophyIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trophy-icon"><path /></svg>
  ),
  SparklesIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sparkles-icon"><path /></svg>
  ),
  CpuChipIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="cpu-chip-icon"><path /></svg>
  ),
  PuzzlePieceIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="puzzle-piece-icon"><path /></svg>
  ),
  GlobeAltIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="globe-alt-icon"><path /></svg>
  ),
  AcademicCapIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="academic-cap-icon"><path /></svg>
  ),
  StarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="star-icon"><path /></svg>
  ),
  ChartBarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chart-bar-icon"><path /></svg>
  ),
  UserIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-icon"><path /></svg>
  ),
  ClockIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="clock-icon"><path /></svg>
  ),
  CheckIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon"><path /></svg>
  ),
  XMarkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-mark-icon"><path /></svg>
  ),
  ArrowLeftIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="arrow-left-icon"><path /></svg>
  ),
  ArrowRightIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="arrow-right-icon"><path /></svg>
  ),
  HomeIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="home-icon"><path /></svg>
  ),
  Cog6ToothIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="cog-6-tooth-icon"><path /></svg>
  )
};

// Hero Icons Mock - Solid
export const heroIconsSolidMock = {
  TrophyIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trophy-icon-solid"><path /></svg>
  ),
  SparklesIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sparkles-icon-solid"><path /></svg>
  ),
  CpuChipIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="cpu-chip-icon-solid"><path /></svg>
  ),
  PuzzlePieceIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="puzzle-piece-icon-solid"><path /></svg>
  ),
  GlobeAltIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="globe-alt-icon-solid"><path /></svg>
  ),
  StarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="star-icon-solid"><path /></svg>
  ),
  ChartBarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chart-bar-icon-solid"><path /></svg>
  ),
  UserIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="user-icon-solid"><path /></svg>
  ),
  CheckIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon-solid"><path /></svg>
  )
};

// React Markdown Mock
export const reactMarkdownMock = ({ children }: { children: string }) => (
  <div data-testid="react-markdown">{children}</div>
);

// Next.js mocks
export const nextImageMock = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  ...props 
}: any) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img 
    src={src} 
    alt={alt} 
    width={width} 
    height={height} 
    className={className}
    data-testid="next-image"
    {...props} 
  />
);

export const nextLinkMock = ({ 
  href, 
  children, 
  className, 
  ...props 
}: any) => (
  <a 
    href={href} 
    className={className}
    data-testid="next-link"
    {...props}
  >
    {children}
  </a>
);

// Common mock setup functions
export const setupFramerMotionMocks = () => {
  jest.mock('framer-motion', () => ({
    motion: motionMock,
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn()
    })
  }));
};

export const setupLucideIconsMocks = () => {
  jest.mock('lucide-react', () => ({
    // Common icons used in Discovery components
    Trophy: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="trophy-icon"><path /></svg>
    ),
    Sparkles: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="sparkles-icon"><path /></svg>
    ),
    Cpu: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="cpu-icon"><path /></svg>
    ),
    GraduationCap: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="graduation-cap-icon"><path /></svg>
    ),
    Globe: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="globe-icon"><path /></svg>
    ),
    BarChart: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="bar-chart-icon"><path /></svg>
    ),
    Rocket: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="rocket-icon"><path /></svg>
    ),
    Star: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="star-icon"><path /></svg>
    ),
    // Add more as needed
    ChevronLeft: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="chevron-left-icon"><path /></svg>
    ),
    ChevronRight: ({ className }: { className?: string }) => (
      <svg className={className} data-testid="chevron-right-icon"><path /></svg>
    ),
  }));
};

export const setupNextMocks = () => {
  jest.mock('next/image', () => nextImageMock);
  jest.mock('next/link', () => nextLinkMock);
  
  // Mock Next.js router
  jest.mock('next/router', () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
      back: jest.fn(),
      forward: jest.fn(),
      reload: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      }
    })
  }));
  
  // Mock Next.js navigation
  jest.mock('next/navigation', () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn()
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/'
  }));
};

export const setupReactMarkdownMocks = () => {
  jest.mock('react-markdown', () => reactMarkdownMock);
};
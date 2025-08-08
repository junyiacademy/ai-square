const fs = require('fs');
const path = require('path');

// List of test files to create
const testsToCreate = [
  {
    file: 'src/lib/auth/auth-utils.test.ts',
    content: `import { validateEmail, validatePassword, generateSessionToken, parseJWT } from './auth-utils';

describe('auth-utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ss123')).toBe(true);
      expect(validatePassword('Complex!Pass456')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('123')).toBe(false);
      expect(validatePassword('abc')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('generateSessionToken', () => {
    it('should generate unique tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });
  });

  describe('parseJWT', () => {
    it('should parse valid JWT tokens', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const parsed = parseJWT(token);
      expect(parsed).toBeDefined();
      expect(parsed.payload).toBeDefined();
    });

    it('should handle invalid tokens', () => {
      expect(parseJWT('invalid')).toBeNull();
      expect(parseJWT('')).toBeNull();
    });
  });
});`
  },
  {
    file: 'src/lib/cache/cache-service.test.ts',
    content: `import { CacheService } from './cache-service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value if exists', async () => {
      await cacheService.set('key1', 'value1');
      const result = await cacheService.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store values in cache', async () => {
      await cacheService.set('key2', { data: 'test' });
      const result = await cacheService.get('key2');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle TTL expiration', async () => {
      await cacheService.set('key3', 'value3', 1); // 1 second TTL
      await new Promise(resolve => setTimeout(resolve, 1100));
      const result = await cacheService.get('key3');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should remove items from cache', async () => {
      await cacheService.set('key4', 'value4');
      await cacheService.delete('key4');
      const result = await cacheService.get('key4');
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cacheService.set('key5', 'value5');
      await cacheService.set('key6', 'value6');
      await cacheService.clear();
      
      const result1 = await cacheService.get('key5');
      const result2 = await cacheService.get('key6');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});`
  },
  {
    file: 'src/lib/config/env.test.ts',
    content: `import { getEnvVar, requireEnvVar, isProduction, isDevelopment, getNodeEnv } from './env';

describe('env config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test_value';
      expect(getEnvVar('TEST_VAR')).toBe('test_value');
    });

    it('should return default value if not set', () => {
      expect(getEnvVar('MISSING_VAR', 'default')).toBe('default');
    });

    it('should return undefined if no default', () => {
      expect(getEnvVar('MISSING_VAR')).toBeUndefined();
    });
  });

  describe('requireEnvVar', () => {
    it('should return value if exists', () => {
      process.env.REQUIRED_VAR = 'required_value';
      expect(requireEnvVar('REQUIRED_VAR')).toBe('required_value');
    });

    it('should throw if missing', () => {
      expect(() => requireEnvVar('MISSING_REQUIRED')).toThrow();
    });
  });

  describe('environment checks', () => {
    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });

    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
    });

    it('should return current NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      expect(getNodeEnv()).toBe('test');
    });
  });
});`
  },
  {
    file: 'src/contexts/AuthContext.test.tsx',
    content: `import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Test component to access auth context
const TestComponent = () => {
  const { user, isLoggedIn, isLoading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="logged-in">{isLoggedIn ? 'Logged In' : 'Not Logged In'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  it('should provide auth context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('logged-in')).toBeInTheDocument();
    expect(screen.getByTestId('user-email')).toBeInTheDocument();
  });

  it('should handle login', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, user: { email: 'test@example.com' } })
      })
    ) as jest.Mock;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    });
  });

  it('should handle logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutButton = screen.getByText('Logout');
    logoutButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
    });
  });

  it('should throw error when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });
});`
  },
  {
    file: 'src/contexts/ThemeContext.test.tsx',
    content: `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component
const TestComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  it('should provide theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toBeInTheDocument();
  });

  it('should toggle theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const currentTheme = screen.getByTestId('theme').textContent;
    fireEvent.click(screen.getByText('Toggle'));
    const newTheme = screen.getByTestId('theme').textContent;
    
    expect(newTheme).not.toBe(currentTheme);
  });

  it('should set specific theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Dark'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    fireEvent.click(screen.getByText('Set Light'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('should persist theme to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Dark'));
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should load theme from localStorage', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should throw error when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    spy.mockRestore();
  });
});`
  }
];

// Create each test file
testsToCreate.forEach(({ file, content }) => {
  const fullPath = path.join(__dirname, file);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write test file
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Created test: ${file}`);
});

console.log(`\nCreated ${testsToCreate.length} test files.`);
console.log('Run npm test to verify all tests pass.');
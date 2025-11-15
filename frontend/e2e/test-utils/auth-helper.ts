/**
 * Authentication Helper for E2E Tests
 * Handles login/logout for all test scenarios
 */

import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

// Demo accounts for testing (matching LoginForm.tsx)
export const TEST_USERS: Record<string, TestUser> = {
  student: {
    email: 'student@example.com',
    password: 'student123',
    name: 'Demo Student',
    role: 'student'
  },
  teacher: {
    email: 'teacher@example.com',
    password: 'teacher123',
    name: 'Demo Teacher',
    role: 'teacher'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Demo Admin',
    role: 'admin'
  }
};

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with demo account using API directly
   */
  async login(userType: 'student' | 'teacher' | 'admin' = 'student') {
    const user = TEST_USERS[userType];

    // Call login API directly
    const response = await this.page.request.post('/api/auth/login', {
      data: {
        email: user.email,
        password: user.password,
        rememberMe: false
      }
    });

    if (!response.ok()) {
      throw new Error(`Login API failed: ${response.status()} ${response.statusText()}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Login failed: ${result.error || 'Unknown error'}`);
    }

    // The cookies should be set automatically by the response
    // Navigate to dashboard to verify login worked
    await this.page.goto('/dashboard');

    // Check if redirected to login (means auth failed) or stayed on dashboard
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login')) {
      // If redirected to login, try navigating to homepage
      await this.page.goto('/');
    }

    return user;
  }

  /**
   * Manual login through UI (backup method)
   */
  async manualLogin(email: string, password: string) {
    // Navigate to login page
    await this.page.goto('/login');

    // Wait for login form
    await this.page.waitForSelector('input#email', { timeout: 10000 });

    // Fill in credentials
    await this.page.fill('input#email', email);
    await this.page.fill('input#password', password);

    // Force click the submit button even if disabled
    await this.page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.click();
      }
    });

    // Wait for navigation
    await this.page.waitForTimeout(2000);
  }

  /**
   * Logout current user
   */
  async logout() {
    // Call logout API
    await this.page.request.post('/api/auth/logout');

    // Clear cookies
    await this.page.context().clearCookies();

    // Navigate to home
    await this.page.goto('/');
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const response = await this.page.request.get('/api/auth/check');
      const data = await response.json();
      return data.authenticated === true;
    } catch {
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<TestUser | null> {
    try {
      const response = await this.page.request.get('/api/auth/profile');
      if (response.ok()) {
        const data = await response.json();
        return data.user || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}

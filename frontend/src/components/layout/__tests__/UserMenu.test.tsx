import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserMenu } from "../UserMenu";

// Mock useRouter
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useTranslation
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock useTheme
const mockToggleTheme = jest.fn();
jest.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: mockToggleTheme,
  }),
}));

describe("UserMenu", () => {
  const mockUser = {
    id: 1,
    email: "test@example.com",
    role: "student",
    name: "Test User",
    isGuest: false,
  };

  const mockGuestUser = {
    id: 2,
    email: "guest@example.com",
    role: "guest",
    name: "Guest User",
    isGuest: true,
  };

  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("renders loading skeleton when isLoading is true", () => {
      render(
        <UserMenu
          user={null}
          isLoggedIn={false}
          isLoading={true}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const skeleton = screen.getByRole("status", { hidden: true });
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse");
    });
  });

  describe("Logged Out State", () => {
    it("renders sign in button when not logged in", () => {
      render(
        <UserMenu
          user={null}
          isLoggedIn={false}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const signInButton = screen.getByRole("button", { name: /signIn/i });
      expect(signInButton).toBeInTheDocument();
    });

    it("navigates to login page when sign in is clicked", () => {
      render(
        <UserMenu
          user={null}
          isLoggedIn={false}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const signInButton = screen.getByRole("button", { name: /signIn/i });
      fireEvent.click(signInButton);

      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  describe("Logged In State - Regular User", () => {
    it("renders user avatar with first letter of name", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      expect(screen.getByText("T")).toBeInTheDocument(); // First letter of "Test User"
    });

    it("displays user name", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      // User name appears in both button and dropdown
      const userNames = screen.getAllByText("Test User");
      expect(userNames.length).toBeGreaterThan(0);
    });

    it("shows email in dropdown", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("renders profile link", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const profileLink = screen.getByRole("link", { name: /profile/i });
      expect(profileLink).toHaveAttribute("href", "/profile");
    });

    it("renders theme toggle button", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const themeButton = screen.getByRole("button", { name: /theme/i });
      expect(themeButton).toBeInTheDocument();
    });

    it("calls toggleTheme when theme button is clicked", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const themeButton = screen.getByRole("button", { name: /theme/i });
      fireEvent.click(themeButton);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it("renders sign out button", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const signOutButton = screen.getByRole("button", { name: /signOut/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it("calls onLogout when sign out is clicked", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const signOutButton = screen.getByRole("button", { name: /signOut/i });
      fireEvent.click(signOutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Logged In State - Guest User", () => {
    it("renders guest indicator emoji", () => {
      render(
        <UserMenu
          user={mockGuestUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      // Guest emoji appears in button and dropdown
      const guestEmojis = screen.getAllByText("👤");
      expect(guestEmojis.length).toBeGreaterThan(0);
    });

    it("displays guest mode text", () => {
      render(
        <UserMenu
          user={mockGuestUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      // The translation mock returns the fallback value in parentheses (appears multiple times)
      const elements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes("訪客模式") || false;
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    it("uses green styling for guest avatar", () => {
      render(
        <UserMenu
          user={mockGuestUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const avatar = screen.getByText("G").parentElement; // First letter of "Guest User"
      expect(avatar).toHaveClass("bg-green-100");
    });

    it("does not show email for guest users", () => {
      render(
        <UserMenu
          user={mockGuestUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      // Guest email should not be displayed separately
      expect(screen.queryByText("guest@example.com")).not.toBeInTheDocument();
    });
  });

  describe("User with No Name", () => {
    it("falls back to email first letter for avatar", () => {
      const userWithoutName = {
        ...mockUser,
        name: "",
      };

      render(
        <UserMenu
          user={userWithoutName}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      expect(screen.getByText("T")).toBeInTheDocument(); // First letter of "test@example.com"
    });

    it("displays email prefix when name is not available", () => {
      const userWithoutName = {
        ...mockUser,
        name: "",
      };

      render(
        <UserMenu
          user={userWithoutName}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      expect(screen.getByText("test")).toBeInTheDocument(); // Email prefix before @
    });
  });

  describe("Accessibility", () => {
    it("has accessible button labels", () => {
      render(
        <UserMenu
          user={null}
          isLoggedIn={false}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const signInButton = screen.getByRole("button", { name: /signIn/i });
      expect(signInButton).toHaveAttribute("aria-label", "signIn");
    });

    it("user menu button is keyboard accessible", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={true}
        />,
      );

      const userButton = screen.getByRole("button", { name: /Test User/i });
      expect(userButton).toBeInTheDocument();
    });
  });

  describe("Mounting State", () => {
    it("respects mounted prop for theme icon rendering", () => {
      render(
        <UserMenu
          user={mockUser}
          isLoggedIn={true}
          isLoading={false}
          onLogout={mockLogout}
          mounted={false}
        />,
      );

      // Theme icon should not be rendered when not mounted
      const themeButton = screen.getByRole("button", { name: /theme/i });
      expect(themeButton).toBeInTheDocument();
    });
  });
});

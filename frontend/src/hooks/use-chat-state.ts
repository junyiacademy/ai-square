/**
 * Chat State Hook
 *
 * Manages chat session state, messages, and user interactions.
 * Extracted from chat/page.tsx for maintainability.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
import type {
  ChatSession,
  ChatMessage,
  UserProgress,
  PBLHistory,
  User,
  QuickAction,
} from "@/types/chat";
import type { ImperativePanelHandle } from "react-resizable-panels";

export interface UseChatStateReturn {
  // State
  messages: ChatMessage[];
  message: string;
  chatSessions: ChatSession[];
  selectedChat: string | null;
  sessionId: string | null;
  currentUser: User | null;
  isLoading: boolean;
  isSending: boolean;
  isTyping: boolean;
  userProgress: UserProgress | null;
  pblHistory: PBLHistory[];
  showScrollButton: boolean;
  dropdownOpen: string | null;
  mobileActiveTab: "history" | "chat" | "resources";

  // Panel refs
  leftPanelRef: React.RefObject<ImperativePanelHandle | null>;
  rightPanelRef: React.RefObject<ImperativePanelHandle | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;

  // State setters
  setMessage: (value: string) => void;
  setDropdownOpen: (value: string | null) => void;
  setMobileActiveTab: (value: "history" | "chat" | "resources") => void;

  // Actions
  handleSendMessage: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  loadChatSession: (sessionId: string) => Promise<void>;
  startNewChat: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  scrollToBottom: () => void;
  getContextualQuickActions: () => QuickAction[];
}

export function useChatState(): UseChatStateReturn {
  const searchParams = useSearchParams();

  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // User data
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [pblHistory, setPblHistory] = useState<PBLHistory[]>([]);

  // UI state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<
    "history" | "chat" | "resources"
  >("chat");

  // Refs
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user and sessions on mount
  useEffect(() => {
    loadUserAndSessions();
  }, []);

  // Handle session ID from URL
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get("session");
    if (sessionIdFromUrl && sessionIdFromUrl !== sessionId && currentUser) {
      loadChatSession(sessionIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentUser]);

  // Load PBL history when user is loaded
  useEffect(() => {
    if (currentUser) {
      loadUserAssessmentAndProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Auto-scroll to latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const loadUserAndSessions = async () => {
    try {
      const authResponse = await authenticatedFetch("/api/auth/check");
      const authData = await authResponse.json();

      if (!authData.authenticated) {
        setIsLoading(false);
        return;
      }

      setCurrentUser(authData.user);

      const response = await authenticatedFetch("/api/chat/sessions", {
        headers: {
          "x-user-info": JSON.stringify(authData.user),
        },
      });
      const data = await response.json();
      setChatSessions(data.sessions || []);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load user and sessions:", error);
      setIsLoading(false);
    }
  };

  const loadUserAssessmentAndProgress = async () => {
    if (!currentUser) return;

    try {
      const response = await authenticatedFetch("/api/pbl/history");
      const data = await response.json();

      if (data.success && data.history) {
        const history: PBLHistory[] = data.history.map(
          (item: {
            scenario_id: string;
            scenario_title?: string;
            completed_at: string;
            overall_score?: number;
            domain?: string;
            time_spent?: number;
          }) => ({
            scenarioId: item.scenario_id,
            scenarioTitle: item.scenario_title || "Unknown Scenario",
            completedAt: item.completed_at,
            score: item.overall_score || 0,
            domain: item.domain || "General",
            timeSpent: item.time_spent || 0,
          })
        );
        setPblHistory(history);

        setUserProgress({
          completedScenarios: history.length,
          totalScenarios: 12,
          learningHours: history.reduce((acc, h) => acc + h.timeSpent / 60, 0),
          currentStreak: calculateStreak(history),
        });
      }
    } catch (error) {
      console.error("Failed to load PBL history:", error);
    }
  };

  const calculateStreak = (history: PBLHistory[]): number => {
    if (history.length === 0) return 0;

    const sorted = [...history].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const completedDate = new Date(sorted[i].completedAt);
      completedDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const loadChatSession = useCallback(
    async (sessionIdToLoad: string) => {
      if (!currentUser) return;

      try {
        const response = await authenticatedFetch(
          `/api/chat/sessions/${sessionIdToLoad}`,
          {
            headers: {
              "x-user-info": JSON.stringify(currentUser),
            },
          }
        );
        const data = await response.json();
        setMessages(data.messages || []);
        setSelectedChat(sessionIdToLoad);
        setSessionId(sessionIdToLoad);

        const newUrl = `/chat?session=${sessionIdToLoad}`;
        window.history.pushState({}, "", newUrl);
      } catch (error) {
        console.error("Failed to load chat session:", error);
      }
    },
    [currentUser]
  );

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isSending || !currentUser) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsSending(true);
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await authenticatedFetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-info": JSON.stringify(currentUser),
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          context: {},
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsTyping(false);
        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          setSelectedChat(data.sessionId);
          const newUrl = `/chat?session=${data.sessionId}`;
          window.history.pushState({}, "", newUrl);
          await loadUserAndSessions();
        } else if (data.title) {
          setChatSessions((prev) =>
            prev.map((session) =>
              session.id === sessionId
                ? { ...session, title: data.title }
                : session
            )
          );
        }
      } else {
        setIsTyping(false);
        const errorMessage: ChatMessage = {
          id: `${Date.now()}-error`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, currentUser, sessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    },
    []
  );

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSelectedChat(null);
    setSessionId(null);
    window.history.pushState({}, "", "/chat");
  }, []);

  const deleteSession = useCallback(
    async (sessionIdToDelete: string) => {
      if (!currentUser) return;

      try {
        await authenticatedFetch(`/api/chat/sessions/${sessionIdToDelete}`, {
          method: "DELETE",
          headers: {
            "x-user-info": JSON.stringify(currentUser),
          },
        });

        setChatSessions((prev) =>
          prev.filter((s) => s.id !== sessionIdToDelete)
        );
        setDropdownOpen(null);

        if (selectedChat === sessionIdToDelete) {
          startNewChat();
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    },
    [currentUser, selectedChat, startNewChat]
  );

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const getContextualQuickActions = useCallback((): QuickAction[] => {
    const defaultActions: QuickAction[] = [
      {
        icon: "light-bulb",
        label: "Explain simply",
        prompt: "Can you explain this concept in simple terms?",
      },
      {
        icon: "magnifying-glass",
        label: "Examples",
        prompt: "Can you give me real-world examples?",
      },
      {
        icon: "pencil",
        label: "Practice",
        prompt: "Can you create a practice exercise for me?",
      },
      {
        icon: "target",
        label: "What next?",
        prompt: "What should I learn next based on my progress?",
      },
    ];

    if (messages.length === 0) {
      return [
        {
          icon: "wave",
          label: "Get started",
          prompt:
            "Hi! Can you help me understand my current AI literacy level?",
        },
        {
          icon: "target",
          label: "Learning goals",
          prompt: "What should I focus on based on my assessment results?",
        },
        {
          icon: "book",
          label: "Recommend scenarios",
          prompt: "Which PBL scenarios would you recommend for me?",
        },
        {
          icon: "question",
          label: "How it works",
          prompt: "How does AI Square help me improve my AI literacy?",
        },
      ];
    }

    return defaultActions;
  }, [messages]);

  return {
    // State
    messages,
    message,
    chatSessions,
    selectedChat,
    sessionId,
    currentUser,
    isLoading,
    isSending,
    isTyping,
    userProgress,
    pblHistory,
    showScrollButton,
    dropdownOpen,
    mobileActiveTab,

    // Refs
    leftPanelRef,
    rightPanelRef,
    messagesContainerRef,
    messageEndRef,
    textareaRef,

    // Setters
    setMessage,
    setDropdownOpen,
    setMobileActiveTab,

    // Actions
    handleSendMessage,
    handleKeyDown,
    handleTextareaChange,
    loadChatSession,
    startNewChat,
    deleteSession,
    scrollToBottom,
    getContextualQuickActions,
  };
}

"use client";

import React, { useState, useEffect } from "react";
import { GraduationCap, Globe, BarChart } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  userDataService,
  type UserAchievements,
} from "@/lib/services/user-data-service";

export default function DiscoveryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSideNav, setShowSideNav] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [achievements, setAchievements] = useState<UserAchievements>({
    badges: [],
    totalXp: 0,
    level: 1,
    completedTasks: [],
  });

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await userDataService.loadUserData();
        if (userData) {
          setAchievements(userData.achievements);
        }
      } catch (error) {
        console.error("Failed to load navigation data:", error);
      }
    };
    loadData();
  }, []);

  // Handle scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollTop / (docHeight - winHeight);
      setScrollProgress(Math.min(scrollPercent * 100, 100));
      setShowSideNav(scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationItems: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    path: string;
    disabled?: boolean;
    badge?: string | number;
  }> = [
    {
      id: "overview",
      label: "總覽",
      icon: GraduationCap,
      href: "/discovery/overview",
      path: "/discovery/overview",
    },
    {
      id: "evaluation",
      label: "評估",
      icon: BarChart,
      href: "/discovery/evaluation",
      path: "/discovery/evaluation",
    },
    {
      id: "scenarios",
      label: "職業冒險",
      icon: Globe,
      href: "/discovery/scenarios",
      path: "/discovery/scenarios",
    },
  ];

  const isActive = (item: (typeof navigationItems)[0]) => {
    // Check if current path starts with the item path (for nested routes)
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  return (
    <>
      {/* Desktop: Floating Side Navigation */}
      <div
        className={`
        hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-30
        transition-all duration-500
        ${showSideNav ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-full"}
      `}
      >
        {/* Vertical Progress Bar */}
        <div className="relative">
          <div className="absolute left-0 top-0 w-1 h-40 bg-gray-200 rounded-full" />
          <div
            className="absolute left-0 top-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full transition-all duration-300"
            style={{ height: `${Math.min(scrollProgress * 1.6, 160)}px` }}
          />

          {/* Navigation Points */}
          <div className="relative -ml-3 h-40">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item);
              const position = (index / (navigationItems.length - 1)) * 100;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      router.push(item.href);
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    absolute group
                    ${active ? "scale-110" : "scale-100"}
                    ${item.disabled ? "cursor-not-allowed" : "cursor-pointer"}
                  `}
                  style={{ top: `${position}%`, transform: `translateY(-50%)` }}
                >
                  {/* Circle Button */}
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-300 shadow-lg
                    ${
                      active
                        ? "bg-purple-600 text-white"
                        : item.disabled
                          ? "bg-gray-200 text-gray-400"
                          : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                    }
                  `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label Tooltip */}
                  <div
                    className={`
                    absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap
                    bg-gray-900 text-white px-2 py-1 rounded text-xs
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                    ${item.disabled ? "hidden" : ""}
                  `}
                  >
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: Floating Action Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        {/* Progress Ring */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - scrollProgress / 100)}`}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="gradient">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center"
            >
              <span className="text-xs font-bold text-purple-600">
                {Math.round(scrollProgress)}%
              </span>
            </button>
          </div>
        </div>

        {/* Expanded Quick Navigation */}
        <AnimatePresence>
          {showMobileNav && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute bottom-full right-0 mb-4 bg-white rounded-2xl shadow-xl p-2 min-w-[200px]"
            >
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.disabled) {
                        router.push(item.href);
                        setShowMobileNav(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                      ${
                        active
                          ? "bg-purple-100 text-purple-700"
                          : item.disabled
                            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                            : "hover:bg-gray-50 text-gray-700"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Mobile Progress Info */}
              <div className="border-t border-gray-100 mt-2 pt-2 px-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">進度</span>
                  <span className="font-medium text-purple-600">
                    Lv.{achievements.level} • {achievements.totalXp} XP
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

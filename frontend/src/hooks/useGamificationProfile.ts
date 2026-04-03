"use client";

import { useState, useEffect, useCallback } from "react";
import type { GamificationProfile } from "@/lib/services/discovery/gamification-types";

const DEFAULT_PROFILE: GamificationProfile = {
  level: 1,
  totalXp: 0,
  xpToNextLevel: 500,
  achievements: [],
  streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  skillProgress: {},
};

export function useGamificationProfile() {
  const [profile, setProfile] = useState<GamificationProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/discovery/user/profile");
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in, use defaults
          setProfile(DEFAULT_PROFILE);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.success && json.profile) {
        setProfile(json.profile);
      }
    } catch (err) {
      console.error("Failed to fetch gamification profile:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

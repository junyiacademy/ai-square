import { useState, useEffect, useCallback } from "react";

interface UseQuizTimerProps {
  timeLimit: number; // in minutes
  onTimeUp: () => void;
}

export function useQuizTimer({ timeLimit, onTimeUp }: UseQuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => (timeLimit || 15) * 60);

  const handleTimeUp = useCallback(() => {
    onTimeUp();
  }, [onTimeUp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleTimeUp]);

  return { timeLeft, setTimeLeft };
}

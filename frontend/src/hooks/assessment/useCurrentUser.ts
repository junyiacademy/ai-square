import { useState, useEffect } from 'react';

export interface CurrentUser {
  id: string;
  email?: string;
}

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (isLoggedIn === 'true' && userData) {
      const user = JSON.parse(userData);
      setCurrentUser({
        id: String(user.id),
        email: user.email
      });
    }
  }, []);

  return currentUser;
}

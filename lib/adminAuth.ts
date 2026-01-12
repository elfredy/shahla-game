// Admin authentication utilities

export interface AdminSession {
  loggedIn: boolean;
  email?: string;
}

const ADMIN_STORAGE_KEY = 'words_game_admin_session';

export const adminAuthService = {
  // Save admin session to localStorage
  saveSession(email: string): void {
    if (typeof window === 'undefined') return;
    
    const session: AdminSession = {
      loggedIn: true,
      email
    };
    
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  },

  // Get admin session from localStorage
  getSession(): AdminSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (!stored) return null;
      
      const session: AdminSession = JSON.parse(stored);
      return session.loggedIn ? session : null;
    } catch (error) {
      return null;
    }
  },

  // Check if admin is logged in
  isLoggedIn(): boolean {
    const session = this.getSession();
    return session?.loggedIn === true;
  },

  // Get current admin email
  getCurrentAdmin(): string | null {
    const session = this.getSession();
    return session?.email || null;
  },

  // Logout
  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
};

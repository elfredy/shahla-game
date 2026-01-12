// Authentication utilities

export interface UserSession {
  email: string;
  accessCode: string;
  loggedIn: boolean;
  deviceFingerprint?: string;
}

const STORAGE_KEY = 'words_game_session';

export const authService = {
  // Save session to localStorage
  saveSession(email: string, accessCode: string, deviceFingerprint?: string): void {
    if (typeof window === 'undefined') return;
    
    const session: UserSession = {
      email,
      accessCode,
      loggedIn: true,
      deviceFingerprint
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  // Get session from localStorage
  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const session: UserSession = JSON.parse(stored);
      return session.loggedIn ? session : null;
    } catch (error) {
      return null;
    }
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    const session = this.getSession();
    return session?.loggedIn === true;
  },

  // Get current user email
  getCurrentUser(): string | null {
    const session = this.getSession();
    return session?.email || null;
  },

  // Logout
  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },

  // Generate random 6-digit access code
  generateAccessCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};

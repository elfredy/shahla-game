export interface Word {
  id: string;
  german: string;
  azerbaijani: string;
  chapter: string;
  level: string;
}

export interface Chapter {
  id: string;
  name: string;
  words: Word[];
}

export interface Level {
  id: string;
  name: string;
}

export interface Subscription {
  id: string;
  phoneNumber: string; // New: Phone number for OTP login
  email?: string; // Optional: Keep for backward compatibility
  // Backward-compatible status values:
  // - legacy flow: pending/approved/rejected
  // - phone/otp flow: free/paid/pending_payment
  status: 'pending' | 'approved' | 'rejected' | 'free' | 'paid' | 'pending_payment';
  accessLevel?: 'free' | 'premium'; // New (optional for legacy)
  chaptersAllowed?: number[] | 'all'; // New (optional for legacy): free=[1], paid='all'
  accessCode?: string; // Optional: Keep for backward compatibility
  deviceFingerprint?: string; // Last device fingerprint that logged in
  totalPoints?: number; // New: Total points earned
  createdAt: any;
  paidAt?: any;
  approvedBy?: string;
  whatsappContacted?: boolean; // New: Whether user contacted via WhatsApp
}

export interface ChapterPoints {
  chapterId: string;
  chapterName: string;
  points: number; // Points available in this chapter
  earnedPoints?: number; // Points earned by user
}

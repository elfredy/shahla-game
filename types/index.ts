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
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  accessCode?: string;
  createdAt: any;
  approvedAt?: any;
  approvedBy?: string;
}

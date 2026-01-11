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

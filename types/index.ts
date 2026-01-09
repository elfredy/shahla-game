export interface Word {
  id: string;
  german: string;
  azerbaijani: string;
  chapter: string;
}

export interface Chapter {
  id: string;
  name: string;
  words: Word[];
}

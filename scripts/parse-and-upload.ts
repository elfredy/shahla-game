import mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDj2T4MXZKFgSvP9RbWr3GgwHpsNRxjP0Q",
  authDomain: "wordsgame-5adb8.firebaseapp.com",
  projectId: "wordsgame-5adb8",
  storageBucket: "wordsgame-5adb8.firebasestorage.app",
  messagingSenderId: "737527761668",
  appId: "1:737527761668:web:114015aca3f17784ed9e51",
  measurementId: "G-TXZRS9T23E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface WordData {
  german: string;
  azerbaijani: string;
  chapter: string;
}

async function parseWordDocument(filePath: string): Promise<WordData[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  
  const words: WordData[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentChapter = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a chapter heading (Kapitel, Kapitel X, etc.)
    if (line.toLowerCase().includes('kapitel') || line.match(/^kapitel\s+\d+/i)) {
      currentChapter = line;
      continue;
    }
    
    // Try to parse word pairs (German - Azerbaijani)
    // Common patterns: "german word - azerbaijani word" or "german word   azerbaijani word"
    const dashMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (dashMatch && currentChapter) {
      const german = dashMatch[1].trim();
      const azerbaijani = dashMatch[2].trim();
      
      if (german && azerbaijani) {
        words.push({
          german,
          azerbaijani,
          chapter: currentChapter
        });
        continue;
      }
    }
    
    // Try tab-separated or multi-space separated
    const parts = line.split(/\s{2,}|\t/).filter(p => p.trim().length > 0);
    if (parts.length >= 2 && currentChapter) {
      const german = parts[0].trim();
      const azerbaijani = parts.slice(1).join(' ').trim();
      
      if (german && azerbaijani && german.length < 100 && azerbaijani.length < 100) {
        words.push({
          german,
          azerbaijani,
          chapter: currentChapter
        });
      }
    }
  }
  
  return words;
}

async function uploadToFirebase(words: WordData[]) {
  console.log(`Uploading ${words.length} words to Firebase...`);
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  const firstError = { error: null as any, word: '' };
  
  for (const word of words) {
    try {
      await addDoc(collection(db, 'words'), {
        german: word.german,
        azerbaijani: word.azerbaijani,
        chapter: word.chapter
      });
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`Progress: ${successCount}/${words.length} uploaded...`);
      }
    } catch (error: any) {
      errorCount++;
      if (!firstError.error) {
        firstError.error = error;
        firstError.word = word.german;
      }
      if (errorCount <= 5) {
        console.error(`✗ Error uploading ${word.german}:`, error.message || error);
      }
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`Upload Summary:`);
  console.log(`  ✓ Successfully uploaded: ${successCount}`);
  console.log(`  ✗ Failed: ${errorCount}`);
  console.log('='.repeat(60));
  
  if (errorCount > 0) {
    console.log('');
    console.log('⚠️  UPLOAD ERRORS DETECTED!');
    if (firstError.error?.code === 'permission-denied') {
      console.log('');
      console.log('🔧 SOLUTION: Firestore Security Rules need to be updated');
      console.log('');
      console.log('1. Go to: https://console.firebase.google.com/project/wordsgame-5adb8/firestore/rules');
      console.log('2. Update rules to allow write access (see FIREBASE_SETUP.md)');
      console.log('3. Click "Publish"');
      console.log('4. Wait 10-30 seconds');
      console.log('5. Run this script again: npm run parse');
      console.log('');
      console.log('📖 For detailed instructions, see FIREBASE_SETUP.md');
    } else {
      console.log(`First error was: ${firstError.error?.message || firstError.error}`);
      console.log(`For word: ${firstError.word}`);
    }
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All words uploaded successfully!');
  }
}

async function main() {
  // Try to find the file in current directory or parent directory
  let docxPath = path.join(process.cwd(), 'kontext b1 word.docx');
  if (!fs.existsSync(docxPath)) {
    docxPath = path.join(process.cwd(), '..', 'kontext b1 word.docx');
  }
  if (!fs.existsSync(docxPath)) {
    // Try in scripts directory
    docxPath = path.join(__dirname, '..', 'kontext b1 word.docx');
  }
  
  if (!fs.existsSync(docxPath)) {
    console.error(`Error: File not found. Searched in:`);
    console.error(`  - ${path.join(process.cwd(), 'kontext b1 word.docx')}`);
    console.error(`  - ${path.join(process.cwd(), '..', 'kontext b1 word.docx')}`);
    console.error(`  - ${path.join(__dirname, '..', 'kontext b1 word.docx')}`);
    console.log('\nPlease make sure the Word document "kontext b1 word.docx" is in the project root directory.');
    process.exit(1);
  }
  
  console.log(`Found file at: ${docxPath}`);
  
  console.log('Parsing Word document...');
  const words = await parseWordDocument(docxPath);
  
  console.log(`\nFound ${words.length} words in ${new Set(words.map(w => w.chapter)).size} chapters`);
  console.log('\nSample words:');
  words.slice(0, 5).forEach(w => {
    console.log(`  ${w.chapter}: ${w.german} - ${w.azerbaijani}`);
  });
  
  if (words.length === 0) {
    console.error('\nNo words found! Please check the document format.');
    console.log('Expected format: Kapitel X followed by lines like "german - azerbaijani"');
    process.exit(1);
  }
  
  console.log('\nStarting upload to Firebase...');
  await uploadToFirebase(words);
}

main().catch(console.error);

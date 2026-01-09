import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chapter, Word } from '@/types';

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const wordsRef = collection(db, 'words');
      const snapshot = await getDocs(wordsRef);
      
      const wordsData: Word[] = [];
      snapshot.forEach((doc) => {
        wordsData.push({ id: doc.id, ...doc.data() } as Word);
      });

      // Group words by chapter
      const chaptersMap = new Map<string, Chapter>();
      wordsData.forEach((word) => {
        if (!chaptersMap.has(word.chapter)) {
          chaptersMap.set(word.chapter, {
            id: word.chapter,
            name: word.chapter,
            words: []
          });
        }
        chaptersMap.get(word.chapter)!.words.push(word);
      });

      setChapters(Array.from(chaptersMap.values()));
      setLoading(false);
      setError(null);
    } catch (error: any) {
      console.error('Error loading chapters:', error);
      setLoading(false);
      
      // Check for specific Firebase errors
      if (error?.code === 'permission-denied' || error?.message?.includes('PERMISSION_DENIED')) {
        setError('firestore_not_enabled');
      } else if (error?.code === 'unavailable' || error?.message?.includes('unavailable')) {
        setError('firestore_unavailable');
      } else {
        setError('general_error');
      }
    }
  };

  const startGame = (chapterId: string) => {
    setSelectedChapter(chapterId);
    setGameStarted(true);
    setScore(0);
    setTotalQuestions(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    loadNextWord(chapterId);
  };

  const loadNextWord = (chapterId: string) => {
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (!chapter || chapter.words.length === 0) return;

    // Get random word from chapter
    const randomWord = chapter.words[Math.floor(Math.random() * chapter.words.length)];
    setCurrentWord(randomWord);

    // Get 2 random wrong answers from other words
    const allOtherWords = chapters.flatMap((ch) => 
      ch.id !== chapterId ? ch.words : []
    );
    
    const wrongAnswers: string[] = [];
    while (wrongAnswers.length < 2 && allOtherWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * allOtherWords.length);
      const wrongAnswer = allOtherWords[randomIndex].azerbaijani;
      if (wrongAnswer !== randomWord.azerbaijani && !wrongAnswers.includes(wrongAnswer)) {
        wrongAnswers.push(wrongAnswer);
      }
    }

    // Combine correct and wrong answers, then shuffle
    const allOptions = [randomWord.azerbaijani, ...wrongAnswers].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return; // Prevent multiple selections
    
    setSelectedAnswer(answer);
    const correct = answer === currentWord?.azerbaijani;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    setTotalQuestions(totalQuestions + 1);
  };

  const handleNext = () => {
    if (selectedChapter) {
      loadNextWord(selectedChapter);
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setSelectedChapter(null);
    setCurrentWord(null);
    setOptions([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setTotalQuestions(0);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Yüklənir...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Erstellt von Shahla</h1>
        </header>
        <main style={styles.main}>
          <div style={styles.errorContainer}>
            <h2 style={styles.errorTitle}>⚠️ Firebase Konfigürasyonu Lazımdır</h2>
            {error === 'firestore_not_enabled' && (
              <>
                <p style={styles.errorText}>
                  Firestore Database aktiv deyil. Zəhmət olmasa aşağıdakı addımları izləyin:
                </p>
                <ol style={styles.errorSteps}>
                  <li>
                    <a 
                      href="https://console.firebase.google.com/project/wordsgame-5adb8/firestore" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={styles.errorLink}
                    >
                      Firebase Console'a gidin
                    </a>
                    {' '}və Firestore Database oluşturun
                  </li>
                  <li>
                    Eğer API hatası alırsanız,{' '}
                    <a 
                      href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=wordsgame-5adb8" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={styles.errorLink}
                    >
                      Firestore API'sini etkinleştirin
                    </a>
                  </li>
                  <li>Birkaç dakika bekleyin ve sayfayı yenileyin</li>
                </ol>
                <p style={styles.errorNote}>
                  📖 Detaylı talimatlar için <code>FIREBASE_SETUP.md</code> dosyasına bakın
                </p>
                <button onClick={() => window.location.reload()} style={styles.retryButton}>
                  🔄 Yenidən Yoxla
                </button>
              </>
            )}
            {error === 'firestore_unavailable' && (
              <>
                <p style={styles.errorText}>Firestore şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.</p>
                <button onClick={() => window.location.reload()} style={styles.retryButton}>
                  🔄 Yenidən Yoxla
                </button>
              </>
            )}
            {error === 'general_error' && (
              <>
                <p style={styles.errorText}>Bir hata oluştu. Lütfen console'u kontrol edin ve tekrar deneyin.</p>
                <button onClick={() => window.location.reload()} style={styles.retryButton}>
                  🔄 Yenidən Yoxla
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Erstellt von Shahla</h1>
      </header>

      <main style={styles.main}>
        {!gameStarted ? (
          <div style={styles.chapterSelection}>
            <h2 style={styles.sectionTitle}>Kapitel Seçin</h2>
            {chapters.length === 0 ? (
              <div style={styles.noChaptersContainer}>
                <p style={styles.noChaptersText}>
                  Hələ heç bir kapitel yoxdur. 
                  <br />
                  <a href="/admin" style={styles.adminLink}>Admin panelindən</a> kelimələr əlavə edin və ya
                  <br />
                  <code style={styles.code}>npm run parse</code> ilə Word dosyasını yükləyin.
                </p>
              </div>
            ) : (
              <div style={styles.chapterGrid} className="chapter-grid">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => startGame(chapter.id)}
                    style={styles.chapterButton}
                    className="chapter-button"
                  >
                    <div style={styles.chapterName}>{chapter.name}</div>
                    <div style={styles.wordCount}>{chapter.words.length} söz</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.gameContainer}>
            <div style={styles.scoreContainer} className="score-container">
              <div style={styles.score}>Xal: {score}/{totalQuestions}</div>
              <button onClick={resetGame} style={styles.resetButton} className="reset-button">
                Yeni Oyun
              </button>
            </div>

            {currentWord && (
              <>
                <div style={styles.wordContainer}>
                  <div style={styles.wordLabel}>Almanca Söz:</div>
                  <div style={styles.wordText}>{currentWord.german}</div>
                </div>

                <div style={styles.optionsContainer}>
                  {options.map((option, index) => {
                    let buttonStyle = styles.optionButton;
                    if (selectedAnswer === option) {
                      buttonStyle = {
                        ...buttonStyle,
                        ...(isCorrect ? styles.correctButton : styles.incorrectButton)
                      };
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        style={buttonStyle}
                        disabled={!!selectedAnswer}
                        className="option-button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {selectedAnswer && (
                  <div style={styles.feedbackContainer}>
                    <div style={isCorrect ? styles.correctFeedback : styles.incorrectFeedback}>
                      {isCorrect ? '✓ Düzgündür!' : '✗ Səhvdir!'}
                    </div>
                    <button onClick={handleNext} style={styles.nextButton} className="next-button">
                      Növbəti Sual
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    textAlign: 'center',
    marginBottom: '20px',
    paddingTop: '10px',
  },
  title: {
    fontSize: 'clamp(28px, 6vw, 48px)',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '10px 0',
  },
  main: {
    width: '100%',
    maxWidth: '800px',
    flex: 1,
  },
  loading: {
    fontSize: '24px',
    color: '#fff',
    textAlign: 'center',
    marginTop: '100px',
  },
  chapterSelection: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  sectionTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#667eea',
    fontWeight: 'bold',
  },
  chapterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
  },
  chapterButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '15px',
    padding: '20px 15px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    color: '#fff',
  },
  chapterButtonHover: {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
  chapterName: {
    fontSize: 'clamp(16px, 3vw, 20px)',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  wordCount: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    opacity: 0.9,
  },
  gameContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'stretch',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e0e0e0',
  },
  score: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
  },
  resetButton: {
    background: '#f5576c',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    width: '100%',
  },
  wordContainer: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '15px',
    color: '#fff',
  },
  wordLabel: {
    fontSize: 'clamp(14px, 3vw, 18px)',
    marginBottom: '12px',
    opacity: 0.9,
  },
  wordText: {
    fontSize: 'clamp(24px, 5vw, 36px)',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    wordBreak: 'break-word',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '25px',
  },
  optionButton: {
    background: '#fff',
    border: '3px solid #667eea',
    borderRadius: '12px',
    padding: '16px',
    fontSize: 'clamp(16px, 3.5vw, 18px)',
    fontWeight: 'bold',
    color: '#667eea',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    width: '100%',
    wordBreak: 'break-word',
  },
  correctButton: {
    background: '#4caf50',
    borderColor: '#4caf50',
    color: '#fff',
  },
  incorrectButton: {
    background: '#f44336',
    borderColor: '#f44336',
    color: '#fff',
  },
  feedbackContainer: {
    textAlign: 'center',
    marginTop: '20px',
  },
  correctFeedback: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    color: '#4caf50',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  incorrectFeedback: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    color: '#f44336',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '15px 40px',
    fontSize: 'clamp(16px, 3.5vw, 18px)',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    width: '100%',
  },
  errorContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    maxWidth: '700px',
    margin: '0 auto',
  },
  errorTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    color: '#f5576c',
    marginBottom: '20px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  errorSteps: {
    fontSize: '16px',
    color: '#333',
    marginLeft: '20px',
    marginBottom: '20px',
    lineHeight: '2',
  },
  errorLink: {
    color: '#667eea',
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  errorNote: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    marginTop: '20px',
    textAlign: 'center',
  },
  retryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    marginTop: '20px',
    width: '100%',
  },
  noChaptersContainer: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  noChaptersText: {
    fontSize: '18px',
    color: '#666',
    lineHeight: '1.8',
  },
  adminLink: {
    color: '#667eea',
    textDecoration: 'underline',
    fontWeight: 'bold',
  },
  code: {
    background: '#f0f0f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#667eea',
  },
};


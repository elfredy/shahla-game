import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Chapter, Word, Level } from '@/types';

const LEVELS: Level[] = [
  { id: 'A2', name: 'A2 Level' },
  { id: 'B1', name: 'B1 Level' },
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
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
    // Load levels on mount - no need to load chapters until level is selected
    setLoading(false);
  }, []);

  const loadChapters = async (level: string) => {
    setLoading(true);
    try {
      const wordsRef = collection(db, 'words');
      const q = query(wordsRef, where('level', '==', level));
      const snapshot = await getDocs(q);
      
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

  const handleLevelSelect = (levelId: string) => {
    setSelectedLevel(levelId);
    setGameStarted(false);
    setSelectedChapter(null);
    loadChapters(levelId);
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

    // Get 2 random wrong answers from other words in the same level
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

  const resetToLevelSelection = () => {
    setSelectedLevel(null);
    setChapters([]);
    resetGame();
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
          <h1 style={styles.title}>Erstellt von Şəhla</h1>
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
        <h1 className="modern-title" style={styles.title}>
        ⭐️  Erstellt von <span className="shahla-name">Şəhla </span> ⭐️
        </h1>
      </header>

      <main style={styles.main}>
        {!selectedLevel ? (
          <div style={styles.levelSelection}>
            <h2 style={styles.sectionTitle}>Level Seçin</h2>
            <div style={styles.levelGrid}>
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleLevelSelect(level.id)}
                  style={styles.levelButton}
                  className="level-button"
                >
                  <div style={styles.levelName}>{level.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : !gameStarted ? (
          <div style={styles.chapterSelection}>
            <div style={styles.chapterHeader}>
              <button onClick={resetToLevelSelection} style={styles.backButton} className="back-button">
                ← Level Seçimi
              </button>
              <h2 style={styles.sectionTitle}>{selectedLevel} Level - Kapitel Seçin</h2>
            </div>
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
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    width: '100%',
    textAlign: 'center',
    marginBottom: '30px',
    paddingTop: '20px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    margin: '20px 0',
    padding: '0',
  },
  main: {
    width: '100%',
    maxWidth: '800px',
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  loading: {
    fontSize: '24px',
    color: '#fff',
    textAlign: 'center',
    marginTop: '100px',
  },
  chapterSelection: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  levelSelection: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  levelButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    border: 'none',
    borderRadius: '20px',
    padding: '35px 25px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 10px 30px rgba(30, 60, 114, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  levelName: {
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: '1px',
  },
  chapterHeader: {
    marginBottom: '25px',
  },
  backButton: {
    background: 'transparent',
    border: '2px solid rgba(30, 60, 114, 0.3)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e3c72',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: 'clamp(26px, 5vw, 36px)',
    marginBottom: '25px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  chapterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
  },
  chapterButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    border: 'none',
    borderRadius: '18px',
    padding: '22px 18px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
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
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
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
    fontSize: 'clamp(22px, 4vw, 28px)',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textAlign: 'center',
    letterSpacing: '0.5px',
  },
  resetButton: {
    background: 'linear-gradient(135deg, #f5576c 0%, #e04556 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: 'clamp(15px, 3vw, 17px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
    boxShadow: '0 6px 20px rgba(245, 87, 108, 0.4)',
  },
  wordContainer: {
    textAlign: 'center',
    marginBottom: '35px',
    padding: '30px 25px',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)',
    borderRadius: '20px',
    color: '#fff',
    boxShadow: '0 15px 40px rgba(30, 60, 114, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    position: 'relative',
    overflow: 'hidden',
  },
  wordLabel: {
    fontSize: 'clamp(15px, 3vw, 19px)',
    marginBottom: '15px',
    opacity: 0.95,
    fontWeight: '500',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  wordText: {
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: '800',
    textShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 10px rgba(0, 0, 0, 0.2)',
    wordBreak: 'break-word',
    letterSpacing: '0.5px',
    fontFamily: '"Poppins", sans-serif',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '25px',
  },
  optionButton: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '3px solid rgba(30, 60, 114, 0.3)',
    borderRadius: '16px',
    padding: '18px 20px',
    fontSize: 'clamp(17px, 3.5vw, 19px)',
    fontWeight: '600',
    color: '#1e3c72',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    width: '100%',
    wordBreak: 'break-word',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    letterSpacing: '0.3px',
  },
  correctButton: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%) !important',
    borderColor: '#4caf50 !important',
    color: '#fff !important',
    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4) !important',
  },
  incorrectButton: {
    background: 'linear-gradient(135deg, #f44336 0%, #e53935 100%) !important',
    borderColor: '#f44336 !important',
    color: '#fff !important',
    boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4) !important',
  },
  feedbackContainer: {
    textAlign: 'center',
    marginTop: '25px',
  },
  correctFeedback: {
    fontSize: 'clamp(22px, 4vw, 28px)',
    color: '#4caf50',
    fontWeight: '700',
    marginBottom: '20px',
    textShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
    letterSpacing: '0.5px',
  },
  incorrectFeedback: {
    fontSize: 'clamp(22px, 4vw, 28px)',
    color: '#f44336',
    fontWeight: '700',
    marginBottom: '20px',
    textShadow: '0 2px 10px rgba(244, 67, 54, 0.3)',
    letterSpacing: '0.5px',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px 45px',
    fontSize: 'clamp(17px, 3.5vw, 19px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px rgba(30, 60, 114, 0.4)',
    width: '100%',
    letterSpacing: '0.5px',
  },
  errorContainer: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '35px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    maxWidth: '700px',
    margin: '0 auto',
  },
  errorTitle: {
    fontSize: 'clamp(26px, 5vw, 34px)',
    background: 'linear-gradient(135deg, #f5576c 0%, #e04556 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '25px',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: '0.5px',
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
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px 35px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px rgba(30, 60, 114, 0.4)',
    marginTop: '25px',
    width: '100%',
    letterSpacing: '0.5px',
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


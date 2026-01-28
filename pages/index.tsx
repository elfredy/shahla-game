import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { Chapter, Word, Level, Subscription } from '@/types';
import { authService } from '@/lib/auth';
import { deviceTracking } from '@/lib/deviceTracking';
import { useRouter } from 'next/router';
import Link from 'next/link';

const LEVELS: Level[] = [
  { id: 'A1', name: 'A1 Level' },
  { id: 'A2', name: 'A2 Level' },
  { id: 'B1', name: 'B1 Level' },
];

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
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
  const [selectedLanguage, setSelectedLanguage] = useState<'AZ' | 'TR' | 'EN'>('AZ');
  const [translating, setTranslating] = useState(false);
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  
  // Translation cache to avoid repeated API calls
  const translationCacheRef = useRef<Map<string, string>>(new Map());

  // Helper function to get translation
  const getTranslation = async (germanText: string, targetLang: 'TR' | 'EN'): Promise<string> => {
    const cacheKey = `${germanText}_${targetLang}`;
    if (translationCacheRef.current.has(cacheKey)) {
      return translationCacheRef.current.get(cacheKey)!;
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: germanText,
          targetLang: targetLang,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      if (data.translation) {
        translationCacheRef.current.set(cacheKey, data.translation);
        return data.translation;
      }
      throw new Error('No translation received');
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Demo mode: Allow everyone to play, optional authentication for premium
    // Check authentication with Firebase Auth (optional - for premium users)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // User is authenticated with email (premium user)
        try {
          const subscriptionsRef = collection(db, 'subscriptions');
          const q = query(subscriptionsRef, where('email', '==', user.email?.toLowerCase().trim()));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const subscriptionData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Subscription;
            setSubscription(subscriptionData);
            
            const deviceInfo = deviceTracking.getDeviceInfo();
            const currentFingerprint = deviceInfo.deviceFingerprint;
            
            // Check device fingerprint from Firebase
            const storedFingerprint = subscriptionData.deviceFingerprint;
            
            // If there's a stored fingerprint and it doesn't match, logout
            if (storedFingerprint && storedFingerprint !== currentFingerprint) {
              await firebaseSignOut(auth);
              authService.logout();
              setIsAuthenticated(false);
              setSubscription(null); // Reset to demo mode
              setCheckingAuth(false);
              setLoading(false);
              return;
            }
            
            // Save session
            authService.saveSession(user.email || '', '', currentFingerprint);
            setIsAuthenticated(true);
          } else {
            // Subscription not found, logout but allow demo mode
            await firebaseSignOut(auth);
            authService.logout();
            setIsAuthenticated(false);
            setSubscription(null); // Demo mode
          }
        } catch (error) {
          console.error('Auth verification error:', error);
          setIsAuthenticated(false);
          setSubscription(null); // Demo mode on error
        }
      } else {
        // No user authenticated - Demo mode (free tier)
        setIsAuthenticated(false);
        setSubscription(null); // Demo mode
      }
      setCheckingAuth(false);
      setLoading(false);
    });

    return () => unsubscribe();
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

      let filteredChapters = Array.from(chaptersMap.values());
      
      // Apply access control based on subscription
      // Demo mode (no subscription) or free tier: Only show chapter 1
      if (!subscription || (subscription.accessLevel === 'free' && subscription.chaptersAllowed !== 'all')) {
        // Demo/Free tier: Only show chapter 1
        filteredChapters = filteredChapters.filter((chapter, index) => {
          // Extract chapter number from chapter name (e.g., "Kapitel 1" -> 1)
          const chapterMatch = chapter.name.match(/\d+/);
          const chapterNum = chapterMatch ? parseInt(chapterMatch[0]) : index + 1;
          return chapterNum === 1; // Only first chapter
        });
      }
      // Premium tier (chaptersAllowed === 'all'): Show all chapters

      setChapters(filteredChapters);
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

  const startGame = async (chapterId: string) => {
    setSelectedChapter(chapterId);
    setGameStarted(true);
    setScore(0);
    setTotalQuestions(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    await loadNextWord(chapterId);
  };

  const loadNextWord = async (chapterId: string) => {
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (!chapter || chapter.words.length === 0) return;

    setTranslating(true);
    
    try {
      // Get random word from chapter
      const randomWord = chapter.words[Math.floor(Math.random() * chapter.words.length)];
      setCurrentWord(randomWord);

      // Get translation based on selected language
      let correctAnswer: string;
      if (selectedLanguage === 'AZ') {
        correctAnswer = randomWord.azerbaijani;
      } else if (selectedLanguage === 'TR') {
        correctAnswer = await getTranslation(randomWord.german, 'TR');
      } else {
        correctAnswer = await getTranslation(randomWord.german, 'EN');
      }
      
      setCurrentCorrectAnswer(correctAnswer);

      // Get 2 random wrong answers.
      // If only one chapter is available (demo/free), fall back to other words in the same chapter.
      const sameChapterOtherWords = chapter.words.filter(
        (w) => w.german !== randomWord.german
      );
      const otherChaptersWords = chapters.flatMap((ch) =>
        ch.id !== chapterId ? ch.words : []
      );
      const allOtherWords =
        otherChaptersWords.length > 0 ? otherChaptersWords : sameChapterOtherWords;
      
      const wrongAnswers: string[] = [];
      const usedIndices = new Set<number>();
      
      // Get wrong answers based on selected language
      while (wrongAnswers.length < 2 && allOtherWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * allOtherWords.length);
        if (usedIndices.has(randomIndex)) continue;
        usedIndices.add(randomIndex);
        
        const wrongWord = allOtherWords[randomIndex];
        
        let wrongAnswer: string;
        if (selectedLanguage === 'AZ') {
          wrongAnswer = wrongWord.azerbaijani;
        } else if (selectedLanguage === 'TR') {
          wrongAnswer = await getTranslation(wrongWord.german, 'TR');
        } else {
          wrongAnswer = await getTranslation(wrongWord.german, 'EN');
        }
        
        if (wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
          wrongAnswers.push(wrongAnswer);
        }
        
        // Prevent infinite loop
        if (usedIndices.size >= allOtherWords.length) break;
      }

      // If still not enough (very small datasets), reuse same-chapter pool as a last resort.
      if (wrongAnswers.length < 2 && sameChapterOtherWords.length > 0) {
        for (const wrongWord of sameChapterOtherWords) {
          if (wrongAnswers.length >= 2) break;
          let wrongAnswer: string;
          if (selectedLanguage === 'AZ') {
            wrongAnswer = wrongWord.azerbaijani;
          } else if (selectedLanguage === 'TR') {
            wrongAnswer = await getTranslation(wrongWord.german, 'TR');
          } else {
            wrongAnswer = await getTranslation(wrongWord.german, 'EN');
          }
          if (wrongAnswer !== correctAnswer && !wrongAnswers.includes(wrongAnswer)) {
            wrongAnswers.push(wrongAnswer);
          }
        }
      }

      // Combine correct and wrong answers, then shuffle
      const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } catch (error) {
      console.error('Error loading word:', error);
      setError('Çeviri yüklenirken hata oluştu');
    } finally {
      setTranslating(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer) return; // Prevent multiple selections
    
    setSelectedAnswer(answer);
    const correct = answer === currentCorrectAnswer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }
    setTotalQuestions(totalQuestions + 1);
  };

  const handleNext = async () => {
    if (selectedChapter) {
      await loadNextWord(selectedChapter);
    }
  };

  const resetGame = async () => {
    // Save points to Firebase if user earned points
    if (subscription && score > 0) {
      try {
        const subscriptionRef = doc(db, 'subscriptions', subscription.id);
        const currentTotalPoints = subscription.totalPoints || 0;
        await updateDoc(subscriptionRef, {
          totalPoints: currentTotalPoints + score
        });
        // Update local subscription state
        setSubscription({
          ...subscription,
          totalPoints: currentTotalPoints + score
        });
      } catch (error) {
        console.error('Error saving points:', error);
      }
    }
    
    setGameStarted(false);
    setSelectedChapter(null);
    setCurrentWord(null);
    setOptions([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setTotalQuestions(0);
    setCurrentCorrectAnswer(null);
  };

  const resetToLevelSelection = async () => {
    setSelectedLevel(null);
    setChapters([]);
    await resetGame();
  };

  if (checkingAuth) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Yoxlanılır...</div>
      </div>
    );
  }

  // Demo mode: Everyone can play, no authentication required
  // Premium users can login for full access

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
        <div style={styles.headerTop}>
          {isAuthenticated ? (
            <button
              onClick={async () => {
                await firebaseSignOut(auth);
                authService.logout();
                setSubscription(null);
                setIsAuthenticated(false);
                router.reload();
              }}
              style={styles.logoutButton}
              title="Çıxış"
            >
              Çıxış
            </button>
          ) : (
            <Link href="/login" style={styles.premiumButton}>
              💎 Premium'a Geç
            </Link>
          )}
        </div>
        <h1 className="modern-title" style={styles.title}>
        ⭐️  Erstellt von <span className="shahla-name">Şəhla </span> ⭐️
        </h1>
      </header>

      <main style={styles.main}>
        {!selectedLevel ? (
          <div style={styles.levelSelection}>
            <h2 style={styles.sectionTitle}>Dil Seçin</h2>
            <div style={styles.languageGrid}>
              <button
                onClick={() => setSelectedLanguage('AZ')}
                style={{
                  ...styles.languageButton,
                  ...(selectedLanguage === 'AZ' ? styles.languageButtonActive : {})
                }}
              >
                Azərbaycan
              </button>
              <button
                onClick={() => setSelectedLanguage('TR')}
                style={{
                  ...styles.languageButton,
                  ...(selectedLanguage === 'TR' ? styles.languageButtonActive : {})
                }}
              >
                Türkçe
              </button>
              <button
                onClick={() => setSelectedLanguage('EN')}
                style={{
                  ...styles.languageButton,
                  ...(selectedLanguage === 'EN' ? styles.languageButtonActive : {})
                }}
              >
                English
              </button>
            </div>
            <h2 style={{...styles.sectionTitle, marginTop: '40px'}}>Level Seçin</h2>
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
              <>
                <div style={styles.chapterGrid} className="chapter-grid">
                  {chapters.map((chapter) => {
                    const chapterPoints = chapter.words.length; // Each word = 1 point
                    return (
                      <button
                        key={chapter.id}
                        onClick={() => startGame(chapter.id)}
                        style={styles.chapterButton}
                        className="chapter-button"
                      >
                        <div style={styles.chapterName}>{chapter.name}</div>
                        <div style={styles.wordCount}>{chapter.words.length} söz</div>
                        <div style={styles.pointsBadge}>⭐ {chapterPoints} puan</div>
                      </button>
                    );
                  })}
                </div>
                {(!subscription || (subscription.accessLevel === 'free' && subscription.chaptersAllowed !== 'all')) && (
                  <div style={styles.premiumBanner}>
                    <div style={styles.premiumBannerContent}>
                      <div style={styles.premiumBannerText}>
                        <strong>💎 Premium'a keçin!</strong>
                        <br />
                        Bütün kapitellərə çıxış əldə edin
                      </div>
                      <Link href="/login" style={styles.premiumLinkButton}>
                        🔐 Premium'a Giriş Et
                      </Link>
                      <a
                        href={`https://wa.me/994507772885?text=Merhaba, premium üyelik hakkında bilgi almak istiyorum.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.whatsappButton}
                      >
                        📱 WhatsApp ilə Əlaqə
                      </a>
                    </div>
                  </div>
                )}
              </>
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
  languageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginBottom: '40px',
  },
  languageButton: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '2px solid rgba(30, 60, 114, 0.3)',
    borderRadius: '16px',
    padding: '20px 15px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    color: '#1e3c72',
    fontSize: 'clamp(16px, 3vw, 20px)',
    fontWeight: '600',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
  },
  languageButtonActive: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    borderColor: '#1e3c72',
    color: '#fff',
    boxShadow: '0 6px 20px rgba(30, 60, 114, 0.4)',
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
    marginBottom: '4px',
  },
  pointsBadge: {
    fontSize: 'clamp(11px, 2vw, 13px)',
    fontWeight: '600',
    marginTop: '6px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  premiumBanner: {
    marginTop: '30px',
    padding: '20px',
    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
    borderRadius: '16px',
    boxShadow: '0 8px 20px rgba(37, 211, 102, 0.3)',
  },
  premiumBannerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center',
  },
  premiumLinkButton: {
    background: '#fff',
    color: '#667eea',
    border: '2px solid #fff',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    textDecoration: 'none',
    display: 'inline-block',
  },
  premiumBannerText: {
    color: '#fff',
    fontSize: 'clamp(16px, 3vw, 18px)',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  whatsappButton: {
    background: '#fff',
    color: '#25D366',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    textDecoration: 'none',
    display: 'inline-block',
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
  headerTop: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: '10px',
  },
  logoutButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backdropFilter: 'blur(10px)',
  },
  premiumButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },
  authContainer: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '50px 40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto',
  },
  authTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    marginBottom: '20px',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  authText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.8',
    marginBottom: '30px',
  },
  authButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  authButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px 30px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px rgba(30, 60, 114, 0.4)',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '0.5px',
  },
  authButtonSecondary: {
    background: 'transparent',
    color: '#1e3c72',
    border: '2px solid #1e3c72',
    borderRadius: '14px',
    padding: '16px 30px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '0.5px',
  },
};


import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Admin() {
  const [german, setGerman] = useState('');
  const [azerbaijani, setAzerbaijani] = useState('');
  const [chapter, setChapter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!german || !azerbaijani || !chapter) {
      setMessage('Zəhmət olmasa bütün sahələri doldurun!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await addDoc(collection(db, 'words'), {
        german: german.trim(),
        azerbaijani: azerbaijani.trim(),
        chapter: chapter.trim()
      });

      setMessage('✓ Söz uğurla əlavə edildi!');
      setGerman('');
      setAzerbaijani('');
      setChapter('');
    } catch (error: any) {
      console.error('Error adding word:', error);
      if (error?.code === 'permission-denied' || error?.message?.includes('PERMISSION_DENIED')) {
        setMessage('✗ Firestore Database aktiv deyil! Firebase Console-dan Firestore Database oluşturun.');
      } else {
        setMessage('✗ Xəta baş verdi! ' + (error?.message || ''));
      }
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Admin Paneli</h1>
        <a href="/" style={styles.backLink} className="back-link">← Ana Səhifə</a>
      </header>

      <main style={styles.main}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Yeni Söz Əlavə Et</h2>
          
          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Kapitel:</label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Məsələn: Kapitel 1"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Almanca Söz:</label>
              <input
                type="text"
                value={german}
                onChange={(e) => setGerman(e.target.value)}
                placeholder="Məsələn: das Haus"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Azərbaycan Tərcüməsi:</label>
              <input
                type="text"
                value={azerbaijani}
                onChange={(e) => setAzerbaijani(e.target.value)}
                placeholder="Məsələn: ev"
                style={styles.input}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton}
              className="submit-button"
            >
              {loading ? 'Yüklənir...' : 'Əlavə Et'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    position: 'relative',
    zIndex: 1,
    paddingTop: '20px',
  },
  title: {
    marginBottom: '20px',
    padding: '0',
  },
  backLink: {
    color: '#fff',
    fontSize: '18px',
    textDecoration: 'underline',
    opacity: 0.95,
    fontWeight: '600',
    transition: 'opacity 0.2s',
    display: 'inline-block',
    marginTop: '10px',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  formContainer: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '24px',
    padding: '35px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2) inset',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  formTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    marginBottom: '30px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  message: {
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '25px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    color: '#2e7d32',
    boxShadow: '0 4px 15px rgba(46, 125, 50, 0.2)',
    border: '1px solid rgba(46, 125, 50, 0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e3c72',
    marginBottom: '8px',
    letterSpacing: '0.3px',
  },
  input: {
    padding: '16px 18px',
    borderRadius: '12px',
    border: '2px solid rgba(30, 60, 114, 0.2)',
    fontSize: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 25px rgba(30, 60, 114, 0.4)',
    marginTop: '15px',
    letterSpacing: '0.5px',
  },
};

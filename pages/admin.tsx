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
        <a href="/" style={styles.backLink}>← Ana Səhifə</a>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: 'clamp(32px, 6vw, 48px)',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    marginBottom: '20px',
  },
  backLink: {
    color: '#fff',
    fontSize: '18px',
    textDecoration: 'underline',
    opacity: 0.9,
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  formContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  formTitle: {
    fontSize: '28px',
    marginBottom: '25px',
    textAlign: 'center',
    color: '#667eea',
    fontWeight: 'bold',
  },
  message: {
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#e8f5e9',
    color: '#2e7d32',
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
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    padding: '15px',
    borderRadius: '10px',
    border: '2px solid #ddd',
    fontSize: '16px',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '15px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    marginTop: '10px',
  },
};

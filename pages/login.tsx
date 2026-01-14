import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authService } from '@/lib/auth';
import { deviceTracking } from '@/lib/deviceTracking';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !accessCode) {
      setMessage('Zəhmət olmasa email və Access Code daxil edin!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(
        subscriptionsRef,
        where('email', '==', email.toLowerCase().trim()),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessage('✗ Bu email ünvanı təsdiqlənməyib və ya mövcud deyil. Zəhmət olmasa qeydiyyatdan keçin.');
        setLoading(false);
        return;
      }

      const subscriptionDoc = snapshot.docs[0];
      const subscription = subscriptionDoc.data();
      
      if (subscription.accessCode !== accessCode.trim()) {
        setMessage('✗ Access Code səhvdir! Zəhmət olmasa düzgün kodu daxil edin.');
        setLoading(false);
        return;
      }

      // Get device info
      const deviceInfo = deviceTracking.getDeviceInfo();
      const currentFingerprint = deviceInfo.deviceFingerprint;

      // Check device fingerprint from Firebase (not localStorage)
      const storedFingerprint = subscription.deviceFingerprint;
      
      // If there's a stored fingerprint and it doesn't match, block login
      if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        setMessage('✗ Bu email ünvanı başqa bir cihazda aktivdir. Yalnız bir cihazdan giriş edə bilərsiniz.');
        setLoading(false);
        return;
      }

      // Update device fingerprint in Firebase
      const subscriptionRef = doc(db, 'subscriptions', subscriptionDoc.id);
      await updateDoc(subscriptionRef, {
        deviceFingerprint: currentFingerprint
      });

      // Save session
      authService.saveSession(email.toLowerCase().trim(), accessCode.trim(), currentFingerprint);
      
      setMessage('✓ Giriş uğurlu! Yönləndirilirsiniz...');
      
      // Redirect to home page
      setTimeout(() => {
        router.push('/');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error logging in:', error);
      setMessage('✗ Xəta baş verdi! ' + (error?.message || ''));
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 className="modern-title" style={styles.title}>
          Erstellt von <span className="shahla-name">Shahla</span>
        </h1>
      </header>

      <main style={styles.main}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Giriş</h2>
          
          {message && (
            <div style={{
              ...styles.message,
              background: message.includes('✓') 
                ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              color: message.includes('✓') ? '#2e7d32' : '#c62828',
              boxShadow: message.includes('✓')
                ? '0 4px 15px rgba(46, 125, 50, 0.2)'
                : '0 4px 15px rgba(198, 40, 40, 0.2)',
              border: message.includes('✓')
                ? '1px solid rgba(46, 125, 50, 0.2)'
                : '1px solid rgba(198, 40, 40, 0.2)',
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Ünvanı:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="məsələn: example@email.com"
                style={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Access Code:</label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 rəqəmli kod"
                style={styles.input}
                required
                disabled={loading}
                maxLength={6}
                pattern="[0-9]{6}"
              />
              <small style={styles.hint}>Admin tərəfindən verilən 6 rəqəmli kod</small>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton}
              className="submit-button"
            >
              {loading ? 'Giriş edilir...' : 'Giriş Et'}
            </button>
          </form>

          <div style={styles.linkContainer}>
            <p style={styles.linkText}>
              Access Code-unuz yoxdur?{' '}
              <Link href="/register" style={styles.link}>Qeydiyyatdan keçin</Link>
            </p>
          </div>
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
  main: {
    maxWidth: '500px',
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
    border: '2px solid rgba(30, 60, 114, 0.3)',
    fontSize: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    backgroundColor: '#fff',
    color: '#333',
  },
  hint: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
    fontStyle: 'italic',
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
  linkContainer: {
    marginTop: '25px',
    textAlign: 'center',
  },
  linkText: {
    fontSize: '15px',
    color: '#666',
  },
  link: {
    color: '#667eea',
    textDecoration: 'underline',
    fontWeight: '600',
  },
};

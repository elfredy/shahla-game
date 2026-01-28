import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { authService } from '@/lib/auth';
import { deviceTracking } from '@/lib/deviceTracking';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setMessage('Zəhmət olmasa düzgün bir email ünvanı daxil edin!');
      return;
    }

    if (!password) {
      setMessage('Zəhmət olmasa şifrə daxil edin!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.toLowerCase().trim(),
        password
      );
      const user = userCredential.user;

      // Get device info
      const deviceInfo = deviceTracking.getDeviceInfo();
      const currentFingerprint = deviceInfo.deviceFingerprint;

      if (!currentFingerprint) {
        await firebaseSignOut(auth);
        setMessage('✗ Cihaz bilgisi alınamadı. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }

      // Check subscription in Firestore
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, where('email', '==', user.email?.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      let subscription: any;

      if (snapshot.empty) {
        // Create new subscription with free tier
        const newSubscription = {
          email: user.email?.toLowerCase().trim(),
          status: 'free',
          accessLevel: 'free',
          chaptersAllowed: [1], // Only first chapter for free tier
          deviceFingerprint: currentFingerprint,
          totalPoints: 0,
          createdAt: new Date(),
          whatsappContacted: false
        };
        
        // Create a new document for this user in subscriptions collection
        await setDoc(doc(db, 'subscriptions', user.uid), newSubscription);
        subscription = newSubscription;
      } else {
        // Update existing subscription
        const subscriptionDoc = snapshot.docs[0];
        subscription = subscriptionDoc.data();

        // Check device fingerprint
        const storedFingerprint = subscription.deviceFingerprint;
        
        if (storedFingerprint && storedFingerprint !== currentFingerprint) {
          await firebaseSignOut(auth);
          setMessage('✗ Bu email başqa bir cihazda aktivdir. Yalnız bir cihazdan giriş edə bilərsiniz.');
          setLoading(false);
          return;
        }

        // Update device fingerprint
        const subscriptionRef = doc(db, 'subscriptions', subscriptionDoc.id);
        await updateDoc(subscriptionRef, {
          deviceFingerprint: currentFingerprint
        });
      }

      // Save session
      authService.saveSession(user.email || '', '', currentFingerprint);
      
      setMessage('✓ Giriş uğurlu! Yönləndirilirsiniz...');
      
      // Redirect to home page
      setTimeout(() => {
        router.push('/');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error logging in:', error);
      
      if (error.code === 'auth/user-not-found') {
        setMessage('✗ Bu email ilə qeydiyyat tapılmadı. Zəhmət olmasa qeydiyyatdan keçin.');
      } else if (error.code === 'auth/wrong-password') {
        setMessage('✗ Şifrə səhvdir! Zəhmət olmasa düzgün şifrəni daxil edin.');
      } else if (error.code === 'auth/invalid-email') {
        setMessage('✗ Email ünvanı düzgün deyil. Zəhmət olmasa düzgün email daxil edin.');
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('✗ Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin və yenidən cəhd edin.');
      } else {
        setMessage('✗ Xəta baş verdi! ' + (error?.message || ''));
      }
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

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Ünvanı:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Şifrə:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrənizi daxil edin"
                style={styles.input}
                required
                disabled={loading}
              />
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
              Hesabınız yoxdur?{' '}
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
  backButton: {
    background: 'transparent',
    color: '#1e3c72',
    border: '2px solid rgba(30, 60, 114, 0.3)',
    borderRadius: '14px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    marginTop: '10px',
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

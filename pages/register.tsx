import { useState } from 'react';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { deviceTracking } from '@/lib/deviceTracking';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setMessage('Zəhmət olmasa düzgün bir email ünvanı daxil edin!');
      return;
    }

    if (!password || password.length < 6) {
      setMessage('✗ Şifrə ən azı 6 simvol olmalıdır!');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('✗ Şifrələr uyğun deyil!');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Check if email already exists in subscriptions
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, where('email', '==', email.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existing = snapshot.docs[0].data();
        if (existing.status === 'paid' || existing.status === 'approved') {
          setMessage('Bu email artıq qeydiyyatdan keçib. Giriş səhifəsinə keçin.');
        } else {
          setMessage('Bu email artıq gözləmədədir. Admin təsdiqini gözləyin.');
        }
        setLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.toLowerCase().trim(),
        password
      );
      const user = userCredential.user;

      // Get device info
      const deviceInfo = deviceTracking.getDeviceInfo();
      const currentFingerprint = deviceInfo.deviceFingerprint;

      // Create subscription in Firestore (pending - admin will approve and set to premium)
      const newSubscription = {
        email: email.toLowerCase().trim(),
        status: 'pending_payment', // Admin will change to 'paid' after payment
        accessLevel: 'free', // Will be upgraded to 'premium' by admin
        chaptersAllowed: [1], // Free tier initially
        deviceFingerprint: currentFingerprint,
        totalPoints: 0,
        createdAt: new Date(),
        whatsappContacted: false
      };
      
      await setDoc(doc(db, 'subscriptions', user.uid), newSubscription);

      // Save session
      authService.saveSession(email.toLowerCase().trim(), '', currentFingerprint);

      setMessage('✓ Qeydiyyat uğurlu! Premium üçün WhatsApp ilə əlaqə saxlayın. Yönləndirilirsiniz...');
      
      // Redirect to home page
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error registering:', error);
      if (error?.code === 'auth/email-already-in-use') {
        setMessage('✗ Bu email artıq istifadə olunur. Giriş səhifəsinə keçin.');
      } else if (error?.code === 'auth/weak-password') {
        setMessage('✗ Şifrə çox zəifdir. Daha güclü bir şifrə seçin.');
      } else if (error?.code === 'permission-denied') {
        setMessage('✗ Xəta baş verdi! Firebase konfigürasyonunu yoxlayın.');
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
          <h2 style={styles.formTitle}>Qeydiyyat</h2>
          
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
              <label style={styles.label}>Şifrə:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ən azı 6 simvol"
                style={styles.input}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Şifrəni Təsdiqlə:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrəni təkrar daxil edin"
                style={styles.input}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton}
              className="submit-button"
            >
              {loading ? 'Qeydiyyatdan keçilir...' : 'Qeydiyyatdan Keç'}
            </button>
          </form>

          <div style={styles.whatsappInfo}>
            <p style={styles.whatsappText}>
              💎 Premium üçün:{' '}
              <a
                href={`https://wa.me/994507772885?text=Merhaba, premium üyelik hakkında bilgi almak istiyorum.`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.whatsappLink}
              >
                WhatsApp ilə əlaqə saxlayın
              </a>
            </p>
          </div>

          <div style={styles.linkContainer}>
            <p style={styles.linkText}>
              Artıq Access Code-unuz var?{' '}
              <Link href="/login" style={styles.link}>Giriş edin</Link>
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
    border: '2px solid rgba(30, 60, 114, 0.2)',
    fontSize: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#333',
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
  whatsappInfo: {
    marginTop: '20px',
    padding: '15px',
    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  whatsappText: {
    fontSize: '14px',
    color: '#2e7d32',
    margin: 0,
  },
  whatsappLink: {
    color: '#25D366',
    textDecoration: 'none',
    fontWeight: '700',
  },
};

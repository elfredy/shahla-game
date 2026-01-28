import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Subscription } from '@/types';
import { adminAuthService } from '@/lib/adminAuth';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Subscriptions() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'pending_payment' | 'paid' | 'free' | 'rejected'>('all');

  useEffect(() => {
    // Check if admin is logged in
    if (adminAuthService.isLoggedIn()) {
      setIsAuthorized(true);
      loadSubscriptions();
    } else {
      router.push('/admin/login');
    }
    setCheckingAuth(false);
  }, [router]);

  const loadSubscriptions = async () => {
    try {
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(subscriptionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const subs: Subscription[] = [];
      snapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() } as Subscription);
      });

      setSubscriptions(subs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setLoading(false);
    }
  };

  const handleApprove = async (subscription: Subscription) => {
    if (!confirm(`"${subscription.email}" email ünvanını Premium olaraq təsdiqləmək istəyirsiniz?`)) {
      return;
    }

    try {
      const subscriptionRef = doc(db, 'subscriptions', subscription.id);
      
      await updateDoc(subscriptionRef, {
        status: 'paid',
        accessLevel: 'premium',
        chaptersAllowed: 'all',
        paidAt: new Date(),
        approvedBy: 'admin'
      });

      alert(`✓ Premium aktivləşdirildi!\n\n"${subscription.email}" artıq bütün kapitellərə çıxış əldə edib.`);
      
      loadSubscriptions();
    } catch (error) {
      console.error('Error approving subscription:', error);
      alert('Xəta baş verdi!');
    }
  };

  const handleReject = async (subscription: Subscription) => {
    if (!confirm(`"${subscription.email}" email ünvanını rədd etmək istəyirsiniz?`)) {
      return;
    }

    try {
      const subscriptionRef = doc(db, 'subscriptions', subscription.id);
      await updateDoc(subscriptionRef, {
        status: 'rejected',
        approvedAt: new Date(),
        approvedBy: 'admin'
      });

      loadSubscriptions();
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      alert('Xəta baş verdi!');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Kopyalandı!');
  };

  const filteredSubscriptions = filter === 'all' 
    ? subscriptions 
    : subscriptions.filter(sub => sub.status === filter);

  if (checkingAuth) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Yoxlanılır...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect to login
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Abonelik İdarəetməsi</h1>
        <div style={styles.navLinks}>
          <Link href="/admin" style={styles.navLink}>← Kelimələr</Link>
          <button
            onClick={() => {
              adminAuthService.logout();
              router.push('/admin/login');
            }}
            style={styles.logoutButton}
          >
            Çıxış
          </button>
          <Link href="/" style={styles.navLink}>Ana Səhifə</Link>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.filterContainer}>
          <button
            onClick={() => setFilter('all')}
            style={{ ...styles.filterButton, ...(filter === 'all' ? styles.filterButtonActive : {}) }}
          >
            Hamısı ({subscriptions.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={{ ...styles.filterButton, ...(filter === 'pending' ? styles.filterButtonActive : {}) }}
          >
            Gözləmədə ({subscriptions.filter(s => s.status === 'pending' || s.status === 'pending_payment').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            style={{ ...styles.filterButton, ...(filter === 'paid' ? styles.filterButtonActive : {}) }}
          >
            Premium ({subscriptions.filter(s => s.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            style={{ ...styles.filterButton, ...(filter === 'rejected' ? styles.filterButtonActive : {}) }}
          >
            Rədd Edilmiş ({subscriptions.filter(s => s.status === 'rejected').length})
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Yüklənir...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Heç bir abonelik tapılmadı.</p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Access Code</th>
                  <th style={styles.th}>Tarix</th>
                  <th style={styles.th}>Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} style={styles.tr}>
                    <td style={styles.td}>{sub.email}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        ...(sub.status === 'paid' ? styles.statusApproved : {}),
                        ...(sub.status === 'free' ? { background: '#e3f2fd', color: '#1976d2' } : {}),
                        ...(sub.status === 'pending' || sub.status === 'pending_payment' ? styles.statusPending : {}),
                        ...(sub.status === 'rejected' ? styles.statusRejected : {})
                      }}>
                        {sub.status === 'paid' ? '💎 Premium' : 
                         sub.status === 'free' ? '🆓 Free' :
                         sub.status === 'pending' || sub.status === 'pending_payment' ? '⏳ Gözləmədə' : 
                         '✗ Rədd Edilmiş'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {sub.accessCode ? (
                        <div style={styles.codeContainer}>
                          <code style={styles.code}>{sub.accessCode}</code>
                          <button
                            onClick={() => copyToClipboard(sub.accessCode!)}
                            style={styles.copyButton}
                            title="Kopyala"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span style={styles.noCode}>-</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {sub.createdAt?.toDate ? sub.createdAt.toDate().toLocaleDateString('az-AZ') : '-'}
                    </td>
                    <td style={styles.td}>
                      {(sub.status === 'pending' || sub.status === 'pending_payment') && (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleApprove(sub)}
                            style={styles.approveButton}
                          >
                            💎 Premium Yap
                          </button>
                          <button
                            onClick={() => handleReject(sub)}
                            style={styles.rejectButton}
                          >
                            Rədd Et
                          </button>
                        </div>
                      )}
                      {sub.status === 'paid' && (
                        <span style={{ color: '#4caf50', fontWeight: '600' }}>✓ Premium Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
    fontSize: 'clamp(28px, 6vw, 40px)',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '20px',
  },
  navLinks: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: {
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'underline',
    opacity: 1,
    fontWeight: '700',
    transition: 'all 0.2s',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  filterContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '2px solid rgba(30, 60, 114, 0.3)',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#1e3c72',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: '#fff',
    borderColor: '#1e3c72',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '20px',
    fontSize: '18px',
    color: '#666',
  },
  tableContainer: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: '700',
    color: '#1e3c72',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '15px',
    fontSize: '15px',
    color: '#333',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
  },
  statusApproved: {
    background: '#e8f5e9',
    color: '#2e7d32',
  },
  statusPending: {
    background: '#fff3e0',
    color: '#f57c00',
  },
  statusRejected: {
    background: '#ffebee',
    color: '#c62828',
  },
  codeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  code: {
    background: '#f5f5f5',
    padding: '6px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e3c72',
    letterSpacing: '2px',
  },
  copyButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  noCode: {
    color: '#999',
    fontStyle: 'italic',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  approveButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  rejectButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #f44336 0%, #e53935 100%)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  copyCodeButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '2px solid #667eea',
    background: 'transparent',
    color: '#667eea',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  logoutButton: {
    background: 'transparent',
    border: '2px solid rgba(255, 255, 255, 0.4)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
};

import { createPageUrl } from '@/utils';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotAccessible = (role) => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>⚠️</div>
        <h2 style={styles.title}>Akses Terbatas</h2>
        <p style={styles.message}>
          Akun Anda tidak memiliki izin untuk melihat halaman ini. 
          Silakan kembali ke Dashboard atau hubungi Administrator.
        </p>
        <button 
          onClick={() => {
            console.log('Role:', role)
            if(role == 'petani'){
                return navigate('/FarmerPortal')
            }else{
                return navigate('/FarmerPortal')
            }
            
          }} 
          style={styles.button}
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  card: { textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '400px' },
  icon: { fontSize: '48px', marginBottom: '10px' },
  title: { color: '#1f2937', marginBottom: '10px' },
  message: { color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' },
  button: { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }
};

export default NotAccessible;
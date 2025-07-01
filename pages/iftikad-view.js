import React, { useEffect, useState } from 'react';

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 320, maxWidth: '90vw', boxShadow: '0 2px 16px #0002', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
        {children}
      </div>
    </div>
  );
}

export default function IftikadView() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [absentees, setAbsentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState('');
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch week headers on mount
  useEffect(() => {
    fetch('/api/iftikad-list')
      .then(res => res.json())
      .then(data => {
        // Extract all week headers from absentees (if present)
        if (data.absentees && data.absentees.length > 0) {
          setSelectedWeek(data.absentees[0].week);
        }
        // Fetch all week headers from backend
        fetch('/api/iftikad-list?allWeeks=1')
          .then(res2 => res2.json())
          .then(data2 => {
            if (data2.weeks) setWeeks(data2.weeks);
          });
        setAbsentees(data.absentees || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Error loading data');
        setLoading(false);
      });
  }, []);

  // Fetch absentees when week changes
  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    fetch(`/api/iftikad-list?week=${encodeURIComponent(selectedWeek)}`)
      .then(res => res.json())
      .then(data => {
        setAbsentees(data.absentees || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Error loading data');
        setLoading(false);
      });
  }, [selectedWeek]);

  const markAsCalled = async (name, week) => {
    setCalling(c => ({ ...c, [name]: true }));
    try {
      await fetch('/api/iftikad-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, week }),
      });
      setAbsentees(absentees => absentees.map(a => a.name === name ? { ...a, called: 'نعم', callDate: new Date().toISOString().slice(0, 10) } : a));
    } catch {
      alert('خطأ أثناء التحديث');
    }
    setCalling(c => ({ ...c, [name]: false }));
  };

  const openUserHistory = async (name) => {
    setModalUser(name);
    setModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/iftikad-history?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setUserHistory(data.history || []);
    } catch {
      setUserHistory([]);
    }
    setHistoryLoading(false);
  };

  // Helper to get weeks for dropdown, excluding last two
  const filteredWeeks = weeks.length > 2 ? weeks.slice(0, -2) : weeks;

  // Helper to get last two weeks for filtering user history
  const lastTwoWeeks = weeks.slice(-2);

  if (loading) return <div style={{textAlign:'center',marginTop:'2rem'}}>جاري التحميل...</div>;
  if (error) return <div style={{textAlign:'center',color:'red'}}>{error}</div>;

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: "'Tajawal', 'Cairo', 'Segoe UI', 'Arial', 'sans-serif'", background: '#fdfcfa', borderRadius: 16, boxShadow: '0 2px 16px #9b715222', padding: '4vw 2vw', minHeight: '80vh' }}>
      <h2 style={{textAlign:'center',marginBottom:32, fontWeight:800, letterSpacing:1, fontSize:'clamp(1.3rem, 4vw, 2.2rem)', color:'#8c1d19'}}>قائمة افتقاد الأسبوع</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap', justifyContent:'center' }}>
        <label htmlFor="week-select" style={{ fontWeight: 600, fontSize: 'clamp(1rem, 2vw, 1.2rem)', color:'#44271c' }}>اختر الأسبوع:</label>
        <select id="week-select" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #9b7152', fontSize: 'clamp(1rem, 2vw, 1.1rem)', fontWeight: 500, background:'#fff', minWidth: 120, color:'#44271c' }}>
          {filteredWeeks.map(week => <option key={week} value={week}>{week}</option>)}
        </select>
      </div>
      <div style={{overflowX:'auto', borderRadius: 12, boxShadow: '0 1px 4px #9b715211', background:'#fff'}}>
      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        minWidth: 600,
        fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
      }}>
        <thead style={{ background: '#eab36822' }}>
          <tr>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',borderRight:'1.5px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#8c1d19',letterSpacing:0.5}}>م</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',borderRight:'1.5px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#8c1d19'}}>الاسم</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',borderRight:'1.5px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#44271c'}}>الموبايل</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',borderRight:'1.5px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#44271c'}}>تاريخ الغياب</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',borderRight:'1.5px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#44271c'}}>تم الاتصال</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#44271c'}}>تاريخ الاتصال</th>
            <th style={{padding:'14px 8px',borderBottom:'2px solid #eab368',fontWeight:800,background:'#eab36822',fontSize:'inherit',color:'#44271c'}}>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {absentees.map((a, i) => (
            <tr key={a.name} style={{
              background: i % 2 === 0 ? (a.called === 'نعم' ? '#eab36833' : '#fdfcfa') : (a.called === 'نعم' ? '#eab36822' : '#fff'),
              transition: 'background 0.3s',
              borderBottom: '1.5px solid #eab368',
              cursor: 'pointer',
              height: 60,
            }}
            onMouseOver={e => e.currentTarget.style.background = '#eab36844'}
            onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? (a.called === 'نعم' ? '#eab36833' : '#fdfcfa') : (a.called === 'نعم' ? '#eab36822' : '#fff')}
            >
              <td style={{borderRight:'1.5px solid #eab368',padding:'12px 8px',fontWeight:700,textAlign:'center',color:'#8c1d19'}}>{i+1}</td>
              <td style={{borderRight:'1.5px solid #eab368',padding:'12px 8px'}}>
                <button onClick={() => openUserHistory(a.name)} style={{ background: 'none', border: 'none', color: '#8c1d19', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, fontSize: 'inherit', padding:0 }}>{a.name}</button>
              </td>
              <td style={{direction:'ltr',borderRight:'1.5px solid #eab368',padding:'12px 8px'}}>
                {a.phone && (
                  (() => {
                    let phone = a.phone.toString();
                    if (!phone.startsWith('0')) phone = '0' + phone;
                    return (
                      <a href={`tel:${phone}`} style={{ color: '#44271c', textDecoration: 'none', fontWeight: 700, fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#eab368" viewBox="0 0 24 24" style={{marginLeft:3}}><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z"></path></svg>
                        {phone}
                      </a>
                    );
                  })()
                )}
              </td>
              <td style={{borderRight:'1.5px solid #eab368',padding:'12px 8px',color:'#44271c'}}>{a.week}</td>
              <td style={{borderRight:'1.5px solid #eab368',padding:'12px 8px'}}>{a.called === 'نعم' ? <span style={{color:'#388e3c',fontWeight:700}}>نعم</span> : <span style={{color:'#d32f2f',fontWeight:700}}>لا</span>}</td>
              <td style={{padding:'12px 8px',color:'#44271c'}}>{a.callDate}</td>
              <td style={{padding:'12px 8px'}}>
                {a.called === 'نعم' ? <span style={{color:'#388e3c',fontSize:20}}>✔️</span> : (
                  <button onClick={() => markAsCalled(a.name, a.week)} disabled={calling[a.name]} style={{ padding: '10px 18px', borderRadius: 8, background: '#8c1d19', color: '#fdfcfa', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 16, transition:'background 0.2s' }}>اتصلت به</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div style={{maxWidth:400, width:'90vw', padding: '2vw 1vw'}}>
          <h3 style={{marginBottom:16, fontWeight:800, fontSize:'clamp(1.1rem, 3vw, 1.5rem)', color:'#8c1d19'}}>تاريخ غياب {modalUser}</h3>
          {historyLoading ? <div>جاري التحميل...</div> : (
            userHistory.filter(h => !lastTwoWeeks.includes(h.week)).length === 0 ? <div>لا يوجد غيابات مسجلة</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fdfcfa', borderRadius: 8, fontSize:'clamp(0.95rem,2vw,1.1rem)' }}>
                <thead>
                  <tr>
                    <th style={{padding:'8px 4px',fontWeight:800,background:'#eab36822',color:'#8c1d19'}}>م</th>
                    <th style={{padding:'8px 4px',fontWeight:800,background:'#eab36822',color:'#44271c'}}>الأسبوع</th>
                    <th style={{padding:'8px 4px',fontWeight:800,background:'#eab36822',color:'#44271c'}}>تم الاتصال</th>
                    <th style={{padding:'8px 4px',fontWeight:800,background:'#eab36822',color:'#44271c'}}>تاريخ الاتصال</th>
                  </tr>
                </thead>
                <tbody>
                  {userHistory.filter(h => !lastTwoWeeks.includes(h.week)).map((h, i) => (
                    <tr key={h.week} style={{ background: i % 2 === 0 ? (h.called === 'نعم' ? '#eab36833' : '#fdfcfa') : (h.called === 'نعم' ? '#eab36822' : '#fff') }}>
                      <td style={{textAlign:'center',fontWeight:700,color:'#8c1d19'}}>{i+1}</td>
                      <td style={{color:'#44271c'}}>{h.week}</td>
                      <td>{h.called === 'نعم' ? <span style={{color:'#388e3c',fontWeight:700}}>نعم</span> : <span style={{color:'#d32f2f',fontWeight:700}}>لا</span>}</td>
                      <td style={{color:'#44271c'}}>{h.callDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </Modal>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import { offlineStorage } from '../api/storage';

export const DashboardScreen: React.FC = () => {
  const [role, setRole] = useState<'PARENT' | 'STUDENT' | 'TUTOR'>('PARENT');
  const [child, setChild] = useState('Ada Okafor (Year 10)');
  const [lessons, setLessons] = useState<any[]>([]);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    async function fetchLessons() {
      try {
        const res = await fetch('http://localhost:8080/api/v1/lessons');
        if (res.ok) {
          const data = await res.json();
          setLessons(data.lessons || []);
          await offlineStorage.setCache('user_lessons', data.lessons || []);
        }
      } catch (err) {
        // Offline-first read fallback (§14)
        setOfflineMode(true);
        const cached = await offlineStorage.getCache<any[]>('user_lessons');
        if (cached) {
          setLessons(cached);
        }
      }
    }
    fetchLessons();
  }, []);

  return (
    <div style={{ maxWidth: 414, margin: '0 auto', padding: '16px', background: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#0B1B3D', color: '#FFFFFF', padding: '20px', borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 700 }}>PORTAL DASHBOARD</div>
        <h1 style={{ fontSize: 20, margin: '4px 0 12px 0' }}>
          {role === 'PARENT' ? 'Parent Portal' : role === 'STUDENT' ? 'Student Portal' : 'Tutor Portal'}
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setRole('PARENT')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: role === 'PARENT' ? '#60A5FA' : 'rgba(255,255,255,0.15)', color: '#0B1B3D', fontWeight: 600, fontSize: 12 }}>
            Parent
          </button>
          <button onClick={() => setRole('STUDENT')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: role === 'STUDENT' ? '#60A5FA' : 'rgba(255,255,255,0.15)', color: '#0B1B3D', fontWeight: 600, fontSize: 12 }}>
            Student
          </button>
          <button onClick={() => setRole('TUTOR')} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: role === 'TUTOR' ? '#60A5FA' : 'rgba(255,255,255,0.15)', color: '#0B1B3D', fontWeight: 600, fontSize: 12 }}>
            Tutor
          </button>
        </div>
      </div>

      {offlineMode && (
        <div style={{ background: '#FEF3C7', color: '#B45309', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          ⚡ Offline Read Mode Active: Displaying local SQLite cache (§14).
        </div>
      )}

      {role === 'PARENT' && (
        <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>SELECT LINKED LEARNER</div>
          <select
            value={child}
            onChange={(e) => setChild(e.target.value)}
            style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
          >
            <option value="Ada Okafor (Year 10)">Ada Okafor — Year 10 (IGCSE)</option>
            <option value="Emeka Okafor (Year 8)">Emeka Okafor — Year 8 (British)</option>
          </select>
        </div>
      )}

      <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
        <h2 style={{ fontSize: 16, color: '#0B1B3D', margin: '0 0 12px 0' }}>Scheduled Lessons (WAT)</h2>
        {lessons.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 14 }}>No scheduled lessons available.</p>
        ) : (
          lessons.map((lesson) => (
            <div key={lesson.id} style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, color: '#0B1B3D', fontSize: 15 }}>{lesson.title}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Tutor: {lesson.tutorName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ background: '#EFF6FF', color: '#1E40AF', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                  {lesson.status}
                </span>
                {role === 'STUDENT' && (
                  <a href="https://zoom.us" target="_blank" rel="noreferrer" style={{ background: '#2563EB', color: '#FFF', padding: '6px 12px', borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                    Join Class &rarr;
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

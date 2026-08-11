import React, { useState, useEffect } from 'react';
import { ApiClient, Programme } from '../api/client';
import { ProgrammeCard } from '../components/ProgrammeCard';

export const HomeScreen: React.FC = () => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProg, setSelectedProg] = useState<Programme | null>(null);
  const [enrollingProg, setEnrollingProg] = useState<Programme | null>(null);

  // Enrolment Form
  const [parentEmail, setParentEmail] = useState('');
  const [learnerName, setLearnerName] = useState('');
  const [enrolSuccess, setEnrolSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await ApiClient.getProgrammes();
      setProgrammes(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleEnrolSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollingProg) return;
    setError(null);
    setEnrolSuccess(null);

    try {
      const resp = await ApiClient.createEnrollment({
        programmeId: enrollingProg.id,
        parentEmail,
        learnerName,
      });
      setEnrolSuccess(`Enrolled ${resp.enrollment.learnerName} in ${enrollingProg.title}! ID: ${resp.enrollment.id}`);
      setParentEmail('');
      setLearnerName('');
      setTimeout(() => {
        setEnrollingProg(null);
        setEnrolSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Enrolment failed');
    }
  }

  return (
    <div style={{ maxWidth: 414, margin: '0 auto', padding: '16px', background: '#F8FAFC', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Safe-Area Mobile Header */}
      <div
        style={{
          background: '#0B1B3D',
          color: '#FFFFFF',
          padding: '20px 16px',
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, color: '#60A5FA', fontWeight: 700 }}>YKAY VIRTUAL SCHOOL COMPANION</div>
        <h1 style={{ fontSize: 22, margin: '4px 0 0 0' }}>Expert teaching. Anywhere.</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>Loading mobile catalogue...</div>
      ) : (
        <div>
          {programmes.map((prog) => (
            <ProgrammeCard
              key={prog.id}
              programme={prog}
              onSelect={(p) => setSelectedProg(p)}
              onEnroll={(p) => {
                setEnrollingProg(p);
                setError(null);
                setEnrolSuccess(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Responsive Enrolment Flow Modal at Common Phone Widths (AC-11) */}
      {enrollingProg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 27, 61, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 99,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ fontSize: 20, color: '#0B1B3D', margin: '0 0 8px 0' }}>
              Enrol in {enrollingProg.title}
            </h2>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
              Fee: ₦{enrollingProg.price.toLocaleString()} NGN
            </p>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {error}
              </div>
            )}
            {enrolSuccess && (
              <div style={{ background: '#F0FDF4', color: '#166534', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {enrolSuccess}
              </div>
            )}

            <form onSubmit={handleEnrolSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B1B3D', marginBottom: 4 }}>
                  Parent Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="parent@ykay.ng"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B1B3D', marginBottom: 4 }}>
                  Learner Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ada Okafor"
                  value={learnerName}
                  onChange={(e) => setLearnerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEnrollingProg(null)}
                  style={{
                    flex: 1,
                    background: '#E2E8F0',
                    color: '#0F172A',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Enrolment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appendix C Sticky CTA Modal / Screen Preview */}
      {selectedProg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 27, 61, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 99,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>{selectedProg.curriculum}</span>
              <button
                onClick={() => setSelectedProg(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
              >
                ×
              </button>
            </div>
            <h2 style={{ fontSize: 20, color: '#0B1B3D', margin: '0 0 8px 0' }}>{selectedProg.title}</h2>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>{selectedProg.summary}</p>
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={() => {
                  const target = selectedProg;
                  setSelectedProg(null);
                  setEnrollingProg(target);
                }}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                [JOIN A COHORT]
              </button>
              <button
                onClick={() => setSelectedProg(null)}
                style={{
                  background: '#E2E8F0',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: 8,
                  padding: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                [PRIVATE TUITION]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

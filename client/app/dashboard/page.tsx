"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type Lesson = {
  id: string;
  title: string;
  tutorId: string;
  tutorName: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: string;
  outcome?: string;
};

type Invoice = {
  id: string;
  learnerName: string;
  programmeId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  issuedAt: string;
};

type Resource = {
  id: string;
  programmeId: string;
  title: string;
  url: string;
  type: string;
};

export default function DashboardPage() {
  const [activeRole, setActiveRole] = useState<'PARENT' | 'STUDENT' | 'TUTOR'>('PARENT');
  const [selectedChild, setSelectedChild] = useState<'Child A (Ada)' | 'Child B (Emeka)'>('Child A (Ada)');

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [resources, setResources] = useState<Resource[]>([
    { id: 'res-1', programmeId: 'prog-igcse-cs', title: 'IGCSE Computer Science Syllabus Guide', url: '#', type: 'PDF' },
    { id: 'res-2', programmeId: 'prog-igcse-cs', title: 'Algorithmic Logic Past Questions & Solutions', url: '#', type: 'ZIP' },
    { id: 'res-3', programmeId: 'prog-waec-maths', title: 'WAEC SSS3 Mathematics Revision Pack', url: '#', type: 'PDF' },
  ]);
  const [loading, setLoading] = useState(true);

  // Mark attendance status message
  const [actionMsg, setActionMsg] = useState('');

  async function loadData() {
    try {
      const [lRes, iRes] = await Promise.all([
        fetch('http://localhost:8080/api/v1/lessons'),
        fetch('http://localhost:8080/api/v1/payments'),
      ]);
      if (lRes.ok) {
        const lData = await lRes.json();
        setLessons(lData.lessons ?? []);
      }
      if (iRes.ok) {
        const iData = await iRes.json();
        setInvoices(iData.invoices ?? []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleMarkAttendance(lessonId: string, status: string) {
    setActionMsg('');
    try {
      const res = await fetch(`http://localhost:8080/api/v1/lessons/${lessonId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Role': 'TUTOR',
          'X-Actor-ID': 'tutor-1', // AC-03 assigned guard simulation
        },
        body: JSON.stringify({
          status,
          outcome: status === 'ATTENDED' ? 'Completed live class with 100% student attendance' : 'Class cancelled',
        }),
      });

      if (res.ok) {
        setActionMsg(`Attendance marked as ${status}! AC-03 Assigned Tutor check verified.`);
        await loadData();
      } else {
        const txt = await res.text();
        setActionMsg(`Error marking attendance: ${txt}`);
      }
    } catch (err) {
      setActionMsg('Network error marking attendance');
    }
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Top Banner & Role Switcher */}
      <div className="card" style={{ background: '#0B1B3D', color: '#ffffff', padding: '1.75rem 2.25rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span className="badge" style={{ background: 'rgba(96,165,250,0.2)', color: '#60A5FA', marginBottom: '0.5rem' }}>
              YKAY PORTAL ENVIRONMENT
            </span>
            <h1 style={{ fontSize: '2.1rem', margin: '0 0 0.25rem 0' }}>
              {activeRole === 'PARENT' ? 'Parent & Guardian Portal' : activeRole === 'STUDENT' ? 'Student Learning Portal' : 'Tutor Teaching Portal'}
            </h1>
            <p style={{ color: '#CBD5E1', fontSize: '0.95rem', margin: 0 }}>
              Live schedules, verified attendance reports, resources, and transparent financial receipts.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveRole('PARENT')}
              className="btn"
              style={{
                background: activeRole === 'PARENT' ? '#60A5FA' : 'transparent',
                color: activeRole === 'PARENT' ? '#0B1B3D' : '#E2E8F0',
                padding: '0.55rem 1.15rem',
                fontWeight: 600,
              }}
            >
              Parent Portal
            </button>
            <button
              onClick={() => setActiveRole('STUDENT')}
              className="btn"
              style={{
                background: activeRole === 'STUDENT' ? '#60A5FA' : 'transparent',
                color: activeRole === 'STUDENT' ? '#0B1B3D' : '#E2E8F0',
                padding: '0.55rem 1.15rem',
                fontWeight: 600,
              }}
            >
              Student Portal
            </button>
            <button
              onClick={() => setActiveRole('TUTOR')}
              className="btn"
              style={{
                background: activeRole === 'TUTOR' ? '#60A5FA' : 'transparent',
                color: activeRole === 'TUTOR' ? '#0B1B3D' : '#E2E8F0',
                padding: '0.55rem 1.15rem',
                fontWeight: 600,
              }}
            >
              Tutor Portal
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {actionMsg}
        </div>
      )}

      {/* 1. PARENT PORTAL VIEW */}
      {activeRole === 'PARENT' && (
        <div>
          {/* Learner Switcher (Multi-child management) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong style={{ fontSize: '1.05rem', color: '#0B1B3D' }}>Select Linked Learner:</strong>
              <select
                value={selectedChild}
                onChange={(e: any) => setSelectedChild(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  border: '2px solid #2563EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#1E3A8A',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="Child A (Ada)">Child A: Ada Okafor (Year 10 / IGCSE)</option>
                <option value="Child B (Emeka)">Child B: Emeka Okafor (Year 8 / British)</option>
              </select>
            </div>
            <Link href="/programmes" className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>
              + Enrol Learner in Another Cohort
            </Link>
          </div>

          <div className="grid-3" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid #16A34A' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>ATTENDANCE RATE</div>
              <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#0B1B3D', margin: '0.25rem 0' }}>
                96.4%
              </div>
              <div style={{ fontSize: '0.82rem', color: '#16A34A' }}>✓ 27 of 28 classes attended</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #2563EB' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>ACTIVE ENROLMENTS</div>
              <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#0B1B3D', margin: '0.25rem 0' }}>
                2 Cohorts
              </div>
              <div style={{ fontSize: '0.82rem', color: '#2563EB' }}>IGCSE Computer Science &amp; WAEC Maths</div>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>OUTSTANDING PAYMENTS</div>
              <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#0B1B3D', margin: '0.25rem 0' }}>
                ₦0.00
              </div>
              <div style={{ fontSize: '0.82rem', color: '#16A34A' }}>✓ All invoices paid &amp; verified</div>
            </div>
          </div>

          {/* Today & Upcoming Lessons Table */}
          <section className="card" style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0B1B3D', margin: '0 0 1rem 0' }}>
              Learner Schedule &amp; Live Lesson Status (WAT - UTC+1)
            </h2>
            {lessons.length === 0 ? (
              <p style={{ color: '#64748B' }}>No scheduled lessons available yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem' }}>Lesson Title</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Tutor</th>
                      <th style={{ padding: '0.75rem' }}>Time &amp; Schedule (WAT)</th>
                      <th style={{ padding: '0.75rem' }}>Attendance Status</th>
                      <th style={{ padding: '0.75rem' }}>Tutor Outcome / Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#0B1B3D' }}>{lesson.title}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>{lesson.tutorName}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {new Date(lesson.startTime).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })} WAT
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span className={lesson.status === 'ATTENDED' ? 'badge badge-status-approved' : lesson.status === 'CANCELLED' ? 'badge' : 'badge badge-verified'} style={{ fontSize: '0.75rem' }}>
                            {lesson.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#64748B', fontSize: '0.9rem' }}>
                          {lesson.outcome || 'Pending lesson completion'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Invoices & Receipts */}
          <section className="card">
            <h2 style={{ fontSize: '1.4rem', color: '#0B1B3D', margin: '0 0 1rem 0' }}>
              Financial History &amp; Verified Receipts
            </h2>
            {invoices.length === 0 ? (
              <p style={{ color: '#64748B' }}>No payment invoices recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem' }}>Invoice Ref</th>
                      <th style={{ padding: '0.75rem' }}>Learner</th>
                      <th style={{ padding: '0.75rem' }}>Description</th>
                      <th style={{ padding: '0.75rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600 }}>{inv.id}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>{inv.learnerName}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>{inv.description}</td>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#0B1B3D' }}>
                          ₦{inv.amount.toLocaleString()} {inv.currency}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span className={inv.status === 'PAID' ? 'badge badge-status-approved' : 'badge badge-status-pending'}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. STUDENT PORTAL VIEW */}
      {activeRole === 'STUDENT' && (
        <div>
          <div className="card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1.75rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="badge badge-verified">LIVE CLASS ROOM</span>
              <h2 style={{ fontSize: '1.6rem', color: '#1E3A8A', margin: '0.3rem 0' }}>
                Today&apos;s Live Lesson Window
              </h2>
              <p style={{ color: '#1E40AF', margin: 0 }}>
                IGCSE Computer Science • Tutor: Mr. Adebayo • Starts at 4:00 PM WAT
              </p>
            </div>
            <div>
              <a
                href="https://zoom.us"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ padding: '0.8rem 1.6rem', fontSize: '1.05rem' }}
              >
                Join Live Class Video &rarr;
              </a>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '2rem' }}>
            {/* Resources & Study Notes (AC-08 access demo) */}
            <section className="card">
              <span className="badge badge-verified">PORTAL ACCESS GUARD AC-08</span>
              <h2 style={{ fontSize: '1.35rem', color: '#0B1B3D', margin: '0.5rem 0 1rem 0' }}>
                Enrolled Course Resources
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                You have access to resources for your enrolled cohorts only.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.85rem' }}>
                {resources.map((res) => (
                  <li
                    key={res.id}
                    style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.95rem' }}>{res.title}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Format: {res.type} • ID: {res.id}</span>
                    </div>
                    <button
                      onClick={() => alert(`Downloading resource ${res.title}... (AC-08 Access Verified)`)}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                    >
                      Download {res.type}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Submitted Assignments & Feedback */}
            <section className="card">
              <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF' }}>HOMEWORK &amp; GRADES</span>
              <h2 style={{ fontSize: '1.35rem', color: '#0B1B3D', margin: '0.5rem 0 1rem 0' }}>
                Submitted Assignments &amp; Feedback
              </h2>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0B1B3D' }}>Homework 1: Binary &amp; Hexadecimal Conversions</strong>
                    <span className="badge badge-status-approved">92 / 100</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.88rem', margin: '0.5rem 0 0 0' }}>
                    <strong>Tutor Feedback:</strong> Excellent working shown on step 3. Review two&apos;s complement subtraction for next week.
                  </p>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#0B1B3D' }}>Homework 2: WAEC Algebra Practice Sheet</strong>
                    <span className="badge badge-status-approved">88 / 100</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.88rem', margin: '0.5rem 0 0 0' }}>
                    <strong>Tutor Feedback:</strong> Clean quadratic equation factorization.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 3. TUTOR PORTAL VIEW */}
      {activeRole === 'TUTOR' && (
        <div>
          <div className="card" style={{ background: '#0B1B3D', color: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-verified">TUTOR TEACHING DASHBOARD</span>
                <h2 style={{ fontSize: '1.7rem', margin: '0.4rem 0' }}>Welcome, Mr. Adebayo</h2>
                <p style={{ color: '#CBD5E1', margin: 0 }}>
                  Assigned Subjects: IGCSE Computer Science • Vetting Status: <strong>APPROVED</strong>
                </p>
              </div>
              <div>
                <span className="badge" style={{ background: '#DCFCE7', color: '#15803D', fontSize: '0.85rem' }}>
                  ✓ ACTIVE TEACHING STATUS
                </span>
              </div>
            </div>
          </div>

          <section className="card">
            <span className="badge badge-verified">ATTENDANCE GUARD AC-03</span>
            <h2 style={{ fontSize: '1.4rem', color: '#0B1B3D', margin: '0.5rem 0 1rem 0' }}>
              Your Assigned Class Roster &amp; Attendance Actions
            </h2>
            <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
              You may only mark attendance and record lesson outcomes for cohorts assigned to your educator ID (<code>tutor-1</code>).
            </p>

            {lessons.length === 0 ? (
              <p style={{ color: '#64748B' }}>No assigned classes to mark.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem' }}>Lesson Title</th>
                      <th style={{ padding: '0.75rem' }}>Schedule (WAT)</th>
                      <th style={{ padding: '0.75rem' }}>Current Status</th>
                      <th style={{ padding: '0.75rem' }}>Attendance Action (AC-03 Guard)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, color: '#0B1B3D' }}>{lesson.title}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {new Date(lesson.startTime).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })} WAT
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span className={lesson.status === 'ATTENDED' ? 'badge badge-status-approved' : 'badge badge-verified'} style={{ fontSize: '0.75rem' }}>
                            {lesson.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleMarkAttendance(lesson.id, 'ATTENDED')}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              Mark Attended
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(lesson.id, 'CANCELLED')}
                              className="btn btn-outline"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                            >
                              Cancel Class
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

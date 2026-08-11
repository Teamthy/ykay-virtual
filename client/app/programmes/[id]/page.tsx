"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Programme = {
  id: string;
  title: string;
  curriculum: string;
  level: string;
  subject: string;
  format: string;
  summary: string;
  price: number;
  status?: string;
};

export default function ProgrammeDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || 'prog-igcse-cs';

  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'cohorts' | 'private' | 'tutors' | 'faq'>('overview');

  useEffect(() => {
    async function fetchProgramme() {
      try {
        const res = await fetch(`http://localhost:8080/api/v1/programmes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProgramme(data);
        }
      } catch (err) {
        console.error('Failed to load programme detail', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProgramme();
  }, [id]);

  if (loading) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#64748B' }}>Loading programme detail...</p>
      </main>
    );
  }

  if (!programme) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ color: '#0B1B3D' }}>Programme Not Found</h1>
        <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>We could not find a programme matching ID {id}.</p>
        <Link href="/programmes" className="btn btn-primary">
          Back to Catalogue
        </Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1.25rem' }}>
        <Link href="/programmes" style={{ color: '#64748B' }}>Programmes</Link> &rarr;{' '}
        <span style={{ color: '#0B1B3D', fontWeight: 600 }}>{programme.title}</span>
      </div>

      {/* Header Card */}
      <div className="card" style={{ background: '#0B1B3D', color: '#ffffff', padding: '2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="badge" style={{ background: 'rgba(96,165,250,0.2)', color: '#60A5FA' }}>
                {programme.curriculum}
              </span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
                {programme.level} • {programme.subject}
              </span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '0 0 1rem 0' }}>{programme.title}</h1>
            <p style={{ fontSize: '1.08rem', color: '#CBD5E1', lineHeight: 1.6 }}>{programme.summary}</p>
          </div>

          <div className="card" style={{ background: '#ffffff', color: '#0F172A', minWidth: 280, padding: '1.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Programme Tuition</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0B1B3D', margin: '0.25rem 0 1.25rem 0' }}>
              ₦{programme.price.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#64748B' }}>/ term</span>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <Link href={`/programmes/${programme.id}/enroll`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Enrol in Cohort
              </Link>
              <Link href={`/programmes/${programme.id}/tuition`} className="btn btn-outline" style={{ width: '100%', textAlign: 'center' }}>
                Request 1:1 Private Tuition
              </Link>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', textAlign: 'center', marginTop: '0.85rem' }}>
              ✓ Instant parent receipt • ✓ Idempotent Paystack checkout
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Tabs Bar */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          Topics &amp; Syllabus
        </button>
        <button
          className={`tab-btn ${activeTab === 'cohorts' ? 'active' : ''}`}
          onClick={() => setActiveTab('cohorts')}
        >
          Available Cohorts
        </button>
        <button
          className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`}
          onClick={() => setActiveTab('private')}
        >
          Private Tuition
        </button>
        <button
          className={`tab-btn ${activeTab === 'tutors' ? 'active' : ''}`}
          onClick={() => setActiveTab('tutors')}
        >
          Vetted Tutor(s)
        </button>
        <button
          className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          FAQ
        </button>
      </div>

      {/* Tab Contents */}
      <div className="card" style={{ padding: '2rem' }}>
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>Programme Overview &amp; Learning Outcomes</h2>
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              This structured programme is designed to take learners from foundational concepts to examination mastery.
              Through weekly live video sessions, rigorous homework assignments, and guided practice tests, students gain deep conceptual understanding.
            </p>
            <h3 style={{ fontSize: '1.2rem', color: '#0B1B3D', marginBottom: '0.75rem' }}>Key Deliverables for Students &amp; Parents</h3>
            <ul style={{ display: 'grid', gap: '0.75rem', color: '#475569', paddingLeft: '1.25rem' }}>
              <li>Weekly interactive live classes via our integrated video API (UTC/WAT timezone-aware).</li>
              <li>Dedicated learning resources, exam past papers, and study guides in the Student Portal.</li>
              <li>Real-time attendance tracking and per-lesson tutor feedback visible in the Parent Portal.</li>
              <li>Mid-term and end-of-term progress reports with predicted examination scores.</li>
            </ul>
          </div>
        )}

        {activeTab === 'topics' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>Syllabus &amp; Covered Topics</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <strong style={{ color: '#0B1B3D' }}>Module 1: Foundations &amp; Core Architecture</strong>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
                  Core terminology, fundamental principles, data representation, and analytical methods.
                </p>
              </div>
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <strong style={{ color: '#0B1B3D' }}>Module 2: Advanced Problem Solving &amp; Logic</strong>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
                  Structured problem decomposition, algorithmic thinking, and syllabus-specific practice questions.
                </p>
              </div>
              <div style={{ padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <strong style={{ color: '#0B1B3D' }}>Module 3: Exam Prep &amp; Past Paper Clinics</strong>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
                  Timed examination simulations, examiner marking criteria breakdown, and individual feedback.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cohorts' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>Scheduled Cohort Deliveries</h2>
            <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
              Join an upcoming cohort. All times are displayed in your local timezone (WAT / Africa/Lagos).
            </p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="badge badge-verified">OPEN FOR ENROLMENT</span>
                  <h3 style={{ fontSize: '1.15rem', color: '#0B1B3D', margin: '0.5rem 0' }}>September 2026 Term Cohort A</h3>
                  <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                    <strong>Tutor:</strong> Mr. Adebayo • <strong>Schedule:</strong> Tuesdays &amp; Thursdays, 4:00 PM – 5:30 PM WAT
                  </div>
                </div>
                <div>
                  <Link href={`/programmes/${programme.id}/enroll?cohort=Sept-A`} className="btn btn-primary">
                    Enrol in This Cohort
                  </Link>
                </div>
              </div>

              <div style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className="badge badge-status-pending">LIMITED SEATS</span>
                  <h3 style={{ fontSize: '1.15rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Weekend Exam Revision Bootcamp</h3>
                  <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                    <strong>Tutor:</strong> Dr. Fatima Aliyu • <strong>Schedule:</strong> Saturdays, 10:00 AM – 1:00 PM WAT
                  </div>
                </div>
                <div>
                  <Link href={`/programmes/${programme.id}/enroll?cohort=Weekend-Bootcamp`} className="btn btn-primary">
                    Enrol in This Cohort
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'private' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>1:1 Private Tuition Packages</h2>
            <p style={{ color: '#475569', fontSize: '0.98rem', marginBottom: '1.5rem' }}>
              Prefer personalized 1-on-1 instruction? Our private tuition packages allow you to choose your learner&apos;s preferred schedule, focus areas, and vetted educator.
            </p>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#1E3A8A', margin: '0 0 0.5rem 0' }}>Custom Private Tuition Pathway</h3>
              <p style={{ color: '#1E40AF', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Receive a customized learning plan, flexible rescheduling, and direct parent-tutor feedback after every single session.
              </p>
              <Link href={`/programmes/${programme.id}/tuition`} className="btn btn-primary">
                Configure &amp; Request 1:1 Tuition &rarr;
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'tutors' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>Assigned Vetted Educators</h2>
            <div className="grid-2" style={{ gap: '1.5rem' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1E3A8A', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    MA
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: '#0B1B3D', display: 'block' }}>Mr. Adebayo</strong>
                    <span className="badge badge-verified">✓ 100% VETTED EDUCATORE</span>
                  </div>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
                  Lead Computer Science &amp; ICT Educator. Over 8 years teaching IGCSE and A-Level syllabus with a 94% A*–B student pass rate.
                </p>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0F766E', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    FA
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: '#0B1B3D', display: 'block' }}>Dr. Fatima Aliyu</strong>
                    <span className="badge badge-verified">✓ 100% VETTED EDUCATOR</span>
                  </div>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>
                  Senior STEM Specialist and Curriculum Consultant. PhD in Physical Sciences, specializing in Cambridge examination technique and revision bootcamps.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#0B1B3D', marginBottom: '1rem' }}>Programme Frequently Asked Questions</h2>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: '#0B1B3D', margin: '0 0 0.3rem 0' }}>What happens if a student misses a live class?</h3>
                <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
                  Class notes, resource PDFs, and practice sheets are uploaded to the Student Portal immediately after each lesson. Attendance is recorded and flagged for parents.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', color: '#0B1B3D', margin: '0 0 0.3rem 0' }}>Can I switch from a group cohort to 1:1 private tuition?</h3>
                <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
                  Yes! Parents can request an upgrade or transfer at any time from their Parent Portal, and our Academic Ops team will assist with scheduling.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type Programme = {
  id: string;
  title: string;
  curriculum: string;
  level: string;
  subject: string;
  format: string;
  summary: string;
  price: number;
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState('ALL');
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch('http://localhost:8080/api/v1/programmes?public=true');
        if (res.ok) {
          const data = await res.json();
          setProgrammes(data ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch launch catalogue', err);
      }
    }
    fetchCatalog();
  }, []);

  const filteredProgrammes = programmes.filter((prog) => {
    const matchesSearch =
      searchQuery === '' ||
      prog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prog.curriculum.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCurriculum =
      selectedCurriculum === 'ALL' ||
      prog.curriculum.toLowerCase().includes(selectedCurriculum.toLowerCase());

    return matchesSearch && matchesCurriculum;
  });

  return (
    <main>
      {/* 1. HERO SECTION */}
      <section className="hero">
        <div className="container">
          <div style={{ maxWidth: 800 }}>
            <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA', marginBottom: '1rem', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              ACADEMICALLY GOVERNED • BRITISH &amp; NIGERIAN CURRICULA
            </span>
            <h1 className="hero-title">
              Expert teaching.<br />
              <span style={{ color: '#60A5FA' }}>Structured learning.</span> Anywhere.
            </h1>
            <p className="hero-subtitle">
              YKAY Virtual School combines the rigorous standards of British and Nigerian curricula, exam bootcamps, private tuition, and group cohorts with a 100% vetted educator network.
            </p>

            {/* Interactive Hero Search */}
            <div className="hero-search" style={{ marginTop: '2rem' }}>
              <input
                type="text"
                placeholder="Search subject, exam, or level (e.g. IGCSE Computer Science, WAEC Mathematics)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '240px',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  outline: 'none',
                  color: '#0F172A',
                }}
              />
              <select
                value={selectedCurriculum}
                onChange={(e) => setSelectedCurriculum(e.target.value)}
                style={{
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Curricula</option>
                <option value="British">British Curriculum</option>
                <option value="Nigerian">Nigerian Curriculum</option>
                <option value="Digital">Digital Academy</option>
              </select>
              <Link href={`/programmes?q=${encodeURIComponent(searchQuery)}`} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Explore Catalogue
              </Link>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link href="/programmes" className="btn btn-gold">
                Browse All Programmes
              </Link>
              <Link href="/tutors" className="btn btn-secondary">
                Book Private Tuition
              </Link>
              <Link href="/tutors" style={{ color: '#93C5FD', fontWeight: 500, alignSelf: 'center', marginLeft: '0.5rem', textDecoration: 'underline' }}>
                Become a Vetted Tutor &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST STRIP */}
      <section style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0', padding: '1.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0B1B3D' }}>100% Vetted Educators</div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>6-stage background &amp; qualification checks</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0B1B3D' }}>Parent Visibility</div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>Live attendance, progress &amp; tutor notes</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0B1B3D' }}>Multi-Curriculum</div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>British (IGCSE/A-Level) &amp; Nigerian (WAEC/JAMB)</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0B1B3D' }}>Timezone Aware</div>
            <div style={{ fontSize: '0.85rem', color: '#64748B' }}>UTC storage with WAT local scheduling</div>
          </div>
        </div>
      </section>

      {/* 3. CHOOSE A PATHWAY */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-verified">LEARNING PATHWAYS</span>
            <h2 style={{ fontSize: '2.1rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Choose Your Academic Pathway</h2>
            <p style={{ color: '#64748B', maxWidth: 620, margin: '0 auto' }}>
              Whether preparing for international examinations, national certificates, or specialized digital skills, YKAY provides structured guidance.
            </p>
          </div>

          <div className="grid-2" style={{ gap: '2rem' }}>
            <div className="card card-hover" style={{ borderTop: '4px solid #1D4ED8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="badge badge-british">BRITISH CURRICULUM</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Year 7 – A Level</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>IGCSE &amp; A-Level Pathways</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Comprehensive syllabus mastery for Cambridge and Edexcel examinations. Small-group cohorts and dedicated 1:1 tutoring for English, Mathematics, Sciences, and Computer Science.
              </p>
              <Link href="/programmes?curriculum=British" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Explore British Programmes &rarr;
              </Link>
            </div>

            <div className="card card-hover" style={{ borderTop: '4px solid #15803D' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="badge badge-nigerian">NIGERIAN CURRICULUM</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>JSS1 – SSS3</span>
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>WAEC, NECO &amp; JAMB Prep</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Exam revision bootcamps and subject clinics tailored to Nigerian curriculum standards. Real exam past-question analysis, timed practice, and parent attendance reports.
              </p>
              <Link href="/programmes?curriculum=Nigerian" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Explore Nigerian Programmes &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED PROGRAMMES & UPCOMING COHORTS */}
      <section style={{ background: '#ffffff', padding: '4.5rem 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
            <div>
              <span className="badge badge-verified">LAUNCH CATALOGUE</span>
              <h2 style={{ fontSize: '2.1rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Featured Programmes &amp; Cohorts</h2>
              <p style={{ color: '#64748B' }}>Discover our initial commercial launch catalogue with verified pricing and immediate enrolment.</p>
            </div>
            <Link href="/programmes" className="btn btn-primary">
              View Complete Catalogue &rarr;
            </Link>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            {filteredProgrammes.length === 0 ? (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <p style={{ fontSize: '1.1rem', color: '#64748B' }}>No programmes match your filter criteria.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCurriculum('ALL'); }} className="btn btn-outline" style={{ marginTop: '1rem' }}>
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredProgrammes.map((prog) => (
                <div key={prog.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className={prog.curriculum.includes('British') ? 'badge badge-british' : 'badge badge-nigerian'}>
                        {prog.curriculum}
                      </span>
                      <span className="badge" style={{ background: '#F1F5F9', color: '#334155' }}>
                        {prog.format}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.3rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>{prog.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1rem' }}>
                      <strong>Level:</strong> {prog.level} &bull; <strong>Subject:</strong> {prog.subject}
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.93rem', marginBottom: '1.5rem' }}>{prog.summary}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Programme Fee</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>
                        ₦{prog.price.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748B' }}>/ term</span>
                      </div>
                    </div>
                    <Link href={`/programmes/${prog.id}`} className="btn btn-primary" style={{ padding: '0.55rem 1.15rem' }}>
                      View &amp; Enrol &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-verified">SIMPLE STEP-BY-STEP</span>
            <h2 style={{ fontSize: '2.1rem', color: '#0B1B3D', margin: '0.5rem 0' }}>How YKAY Virtual School Works</h2>
            <p style={{ color: '#64748B', maxWidth: 620, margin: '0 auto' }}>
              Built for accountability, structured outcomes, and zero administrative friction.
            </p>
          </div>

          <div className="grid-3" style={{ gap: '2rem' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                1
              </div>
              <h3 style={{ color: '#0B1B3D', marginBottom: '0.5rem' }}>Discover &amp; Match</h3>
              <p style={{ color: '#64748B', fontSize: '0.93rem' }}>
                Browse structured British or Nigerian cohorts, or request a 1:1 private tutor matched to your learner&apos;s exact level and availability.
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                2
              </div>
              <h3 style={{ color: '#0B1B3D', marginBottom: '0.5rem' }}>Enrol &amp; Pay Securely</h3>
              <p style={{ color: '#64748B', fontSize: '0.93rem' }}>
                Create a parent account, link your learner profile, and checkout via Paystack with instant receipt and enrolment confirmation.
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                3
              </div>
              <h3 style={{ color: '#0B1B3D', marginBottom: '0.5rem' }}>Learn &amp; Track Progress</h3>
              <p style={{ color: '#64748B', fontSize: '0.93rem' }}>
                Students join live classes and access resources in their portal. Parents monitor live attendance %, tutor notes, and exam readiness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ACADEMIC LEADERSHIP & SAFEGUARDING TEASER */}
      <section style={{ background: '#0B1B3D', color: '#ffffff', padding: '4.5rem 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.2)', color: '#60A5FA', marginBottom: '1rem' }}>
              GOVERNANCE &amp; TRUST
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, margin: '0.75rem 0', lineHeight: 1.2 }}>
              Academically Governed. Never a Free-for-All.
            </h2>
            <p style={{ color: '#CBD5E1', fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Unlike open tutor directories where anyone can list a profile, YKAY Virtual School is led by experienced academic leadership. We take direct responsibility for educator vetting, syllabus compliance, and child safeguarding.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.85rem', marginBottom: '2rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>✓</span> Staged 6-step tutor verification (Certificates, Identity, Interview &amp; Demo)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>✓</span> Strict safeguarding controls: private contact isolation &amp; monitored links
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>✓</span> Idempotent payment guarantees &amp; automated double-booking prevention
              </li>
            </ul>
            <Link href="/support" className="btn btn-secondary">
              Read Academic Governance Policy &rarr;
            </Link>
          </div>

          <div className="card" style={{ background: '#1E3A8A', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Our Safeguarding Promise</h3>
            <p style={{ color: '#E2E8F0', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Every learner profile is protected by object-level access controls. Minor contact details are never exposed to tutors, and every single class attendance and note is immutably timestamped in our audit trail.
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0B1B3D', fontSize: '1.2rem' }}>
                YK
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>YKAY Academic Leadership</div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>Lagos, Nigeria • Academic Quality Team</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section style={{ padding: '4.5rem 0', background: '#ffffff', borderTop: '1px solid #E2E8F0' }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="badge badge-verified">FAQ</span>
            <h2 style={{ fontSize: '2.1rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>How does YKAY differ from a tutor marketplace?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                YKAY is an academically governed virtual school. We vet every tutor through a 6-stage verification process, govern the curriculum, monitor class attendance, and provide unified parent and student portals.
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>How do timezone conversions work for cross-country learners?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                All class schedules are stored in UTC internally and displayed in your local timezone (e.g. WAT / Africa/Lagos) with clear timezone indicators on every class card.
              </p>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', color: '#0B1B3D', marginBottom: '0.5rem' }}>Can parents track multiple children from one account?</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                Yes! Parents can link multiple learner profiles (Child A, Child B) and use the Learner Switcher in the Parent Portal to check attendance, tutor feedback, and invoices for each child.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

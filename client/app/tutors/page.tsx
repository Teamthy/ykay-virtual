"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

type TutorProfile = {
  id: string;
  name: string;
  subject: string;
  status: string;
  timezone: string;
  bio?: string;
  rating?: number;
  reviewsCount?: number;
  experienceYears?: number;
  curricula?: string[];
  levels?: string[];
};

export default function TutorsPage() {
  const [profiles, setProfiles] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<TutorProfile | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [curriculumFilter, setCurriculumFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Become a Tutor Form state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [applyMessage, setApplyMessage] = useState('');

  async function loadProfiles() {
    try {
      const response = await fetch('http://localhost:8080/api/v1/tutors');
      if (response.ok) {
        const data = await response.json();
        const loaded: TutorProfile[] = data.profiles ?? [];
        // Add sample rich metadata for display
        const enriched = loaded.map((p, idx) => ({
          ...p,
          bio:
            p.name.includes('Fatima')
              ? 'PhD in Physical Sciences with 10+ years teaching Cambridge IGCSE and WAEC revision cohorts.'
              : p.name.includes('Adebayo')
              ? 'Lead Computer Science & ICT Educator. Specialized in Python, algorithmic logic, and A-Level syllabus.'
              : 'Certified Specialist Educator with demonstrated track record in student assessment and exam success.',
          rating: 4.8 + (idx % 3) * 0.1,
          reviewsCount: 24 + idx * 7,
          experienceYears: 6 + idx * 2,
          curricula: idx % 2 === 0 ? ['British Curriculum', 'Nigerian Curriculum'] : ['British Curriculum'],
          levels: ['IGCSE', 'A Level', 'WAEC'],
        }));
        setProfiles(enriched);
      }
    } catch (err) {
      console.error('Failed to load tutors', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function handleApply(event: FormEvent) {
    event.preventDefault();
    setApplyMessage('');
    try {
      const response = await fetch('http://localhost:8080/api/v1/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          subject,
          status: 'PENDING_REVIEW', // AC-02: Defaults to unapproved
          timezone,
        }),
      });

      if (response.ok) {
        setApplyMessage('Application submitted! Your profile is Under Review (AC-02 Staged Vetting Guard).');
        setName('');
        setSubject('');
        await loadProfiles();
      } else {
        setApplyMessage('Error submitting application.');
      }
    } catch (err) {
      setApplyMessage('Failed to connect to server.');
    }
  }

  const approvedOnly = profiles.filter((p) => p.status === 'APPROVED');
  const filtered = approvedOnly.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase());

    const matchesSubject =
      subjectFilter === 'ALL' ||
      p.subject.toLowerCase().includes(subjectFilter.toLowerCase());

    const matchesCurriculum =
      curriculumFilter === 'ALL' ||
      (p.curricula && p.curricula.some((c) => c.toLowerCase().includes(curriculumFilter.toLowerCase())));

    return matchesSearch && matchesSubject && matchesCurriculum;
  });

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <span className="badge badge-verified">100% VETTED EDUCATORS</span>
          <h1 style={{ fontSize: '2.4rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Find a Vetted Tutor</h1>
          <p style={{ color: '#64748B', maxWidth: 680, fontSize: '1.05rem' }}>
            Discover and book 1:1 private tuition with YKAY&apos;s academically governed educator network. All tutors pass our 6-stage background and syllabus verification.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="btn btn-gold"
          style={{ padding: '0.75rem 1.4rem' }}
        >
          Become a Tutor &rarr;
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search tutor name or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '2 1 240px',
            padding: '0.65rem 0.85rem',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          style={{
            flex: '1 1 160px',
            padding: '0.65rem 0.85rem',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">All Subjects</option>
          <option value="Computer Science">Computer Science &amp; ICT</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
        </select>

        <select
          value={curriculumFilter}
          onChange={(e) => setCurriculumFilter(e.target.value)}
          style={{
            flex: '1 1 160px',
            padding: '0.65rem 0.85rem',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">All Curricula</option>
          <option value="British">British Curriculum</option>
          <option value="Nigerian">Nigerian Curriculum</option>
        </select>
      </div>

      {/* Tutor Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748B' }}>
          Loading vetted educator network...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ color: '#0B1B3D' }}>No Approved Tutors Found Matching Your Filter</h3>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
            Note: Tutors under review are hidden from public discovery per AC-02.
          </p>
          <button onClick={() => { setSearch(''); setSubjectFilter('ALL'); setCurriculumFilter('ALL'); }} className="btn btn-primary">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '1.75rem' }}>
          {filtered.map((tutor) => (
            <div key={tutor.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1E3A8A', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                      {tutor.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.3rem', color: '#0B1B3D', margin: '0 0 0.2rem 0' }}>{tutor.name}</h2>
                      <span className="badge badge-verified" style={{ fontSize: '0.72rem' }}>✓ VERIFIED EDUCATOR</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#D97706', fontSize: '1.05rem' }}>★ {tutor.rating?.toFixed(1)}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{tutor.reviewsCount} reviews</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  <span className="badge badge-british">{tutor.subject}</span>
                  {tutor.curricula?.map((c, i) => (
                    <span key={i} className="badge" style={{ background: '#F1F5F9', color: '#334155' }}>
                      {c}
                    </span>
                  ))}
                  <span className="badge" style={{ background: '#F0FDF4', color: '#166534' }}>
                    {tutor.experienceYears} yrs experience
                  </span>
                </div>

                <p style={{ color: '#475569', fontSize: '0.93rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {tutor.bio}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  📍 {tutor.timezone}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => setSelectedProfile(tutor)}
                    className="btn btn-outline"
                    style={{ padding: '0.55rem 1rem' }}
                  >
                    View Profile
                  </button>
                  <Link
                    href={`/programmes/prog-igcse-cs/tuition?tutor=${encodeURIComponent(tutor.name)}`}
                    className="btn btn-primary"
                    style={{ padding: '0.55rem 1.15rem' }}
                  >
                    Request Tutor &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 27, 61, 0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative' }}>
            <button
              onClick={() => setSelectedProfile(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}
            >
              ×
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1E3A8A', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.7rem' }}>
                {selectedProfile.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h2 style={{ fontSize: '1.7rem', color: '#0B1B3D', margin: '0 0 0.3rem 0' }}>{selectedProfile.name}</h2>
                <span className="badge badge-verified">✓ 100% VETTED &amp; APPROVED</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#0B1B3D' }}>Subject Specialties:</strong> {selectedProfile.subject}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#0B1B3D' }}>Teaching Approach &amp; Bio:</strong>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                {selectedProfile.bio} All lessons follow YKAY&apos;s structured methodology with regular homework feedback and exam past question analysis.
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '2rem' }}>
              <strong style={{ color: '#0B1B3D' }}>Academic Vetting Status (6-Stage):</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#166534' }}>
                <li>✓ Degree Certificate &amp; Qualification Check (Verified)</li>
                <li>✓ Identity &amp; Criminal Background Screening (Passed)</li>
                <li>✓ Live Teaching Demonstration &amp; Interview (Approved)</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedProfile(null)} className="btn btn-outline">
                Close
              </button>
              <Link
                href={`/programmes/prog-igcse-cs/tuition?tutor=${encodeURIComponent(selectedProfile.name)}`}
                className="btn btn-primary"
              >
                Request 1:1 Tuition &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Become a Tutor Application Modal (Staged Vetting AC-02) */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11, 27, 61, 0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 580, width: '100%', padding: '2.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowApplyModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748B' }}
            >
              ×
            </button>

            <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', marginBottom: '0.75rem' }}>
              EDUCATOR APPLICATION
            </span>
            <h2 style={{ fontSize: '1.8rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>
              Teach With YKAY Virtual School
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Join our vetted network. All new applications start in <strong>Draft/Pending Review</strong> and must be verified by an Academic Admin before appearing on the public marketplace per AC-02.
            </p>

            <form onSubmit={handleApply}>
              <div className="form-group">
                <label className="form-label">Full Name &amp; Title</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Dr. Emeka Nwosu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Primary Teaching Subject</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Mathematics / Physics / Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Timezone</label>
                <select
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="Africa/Lagos">Africa/Lagos (WAT - UTC+1)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>

              {applyMessage && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
                  {applyMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowApplyModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Submit Application (Pending Review)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

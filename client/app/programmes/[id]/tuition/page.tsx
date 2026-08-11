"use client";

import React, { FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TuitionPage() {
  const params = useParams();
  const programmeId = Array.isArray(params?.id) ? params.id[0] : params?.id || 'prog-igcse-cs';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parentEmail, setParentEmail] = useState('');
  const [learnerName, setLearnerName] = useState('');
  const [learnerLevel, setLearnerLevel] = useState('IGCSE');
  const [subject, setSubject] = useState('Computer Science');
  const [goal, setGoal] = useState('');
  const [availability, setAvailability] = useState('Weekdays afternoon (3pm - 6pm WAT)');
  const [timezone, setTimezone] = useState('Africa/Lagos (WAT)');
  const [tutorPreference, setTutorPreference] = useState('Mr. Adebayo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/tuition-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          parentEmail,
          learnerName,
          subject,
          goal: `Level: ${learnerLevel} | Goal: ${goal} | Availability: ${availability} (${timezone}) | Pref Tutor: ${tutorPreference}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit private tuition request');
      }
      const data = await response.json();
      setResult(data.request);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: 760 }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1.25rem' }}>
        <Link href="/programmes" style={{ color: '#64748B' }}>Programmes</Link> &rarr;{' '}
        <Link href={`/programmes/${programmeId}`} style={{ color: '#64748B' }}>Programme Detail</Link> &rarr;{' '}
        <span style={{ color: '#0B1B3D', fontWeight: 600 }}>1:1 Private Tuition</span>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <span className="badge badge-verified" style={{ marginBottom: '0.75rem' }}>1:1 PRIVATE TUITION</span>
        <h1 style={{ fontSize: '2rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>
          Request Customized Private Tuition
        </h1>
        <p style={{ color: '#64748B', marginBottom: '2rem' }}>
          Our Academic Ops team matches your learner with a vetted specialist educator based on their exact syllabus, timezone, and learning goals.
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <h2 style={{ fontSize: '1.3rem', color: '#0B1B3D', marginBottom: '1.25rem' }}>1. Learner Profile &amp; Goals</h2>
            
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Learner Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Chioma Okafor"
                  value={learnerName}
                  onChange={(e) => setLearnerName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Learner Level</label>
                <select
                  className="form-select"
                  value={learnerLevel}
                  onChange={(e) => setLearnerLevel(e.target.value)}
                >
                  <option value="IGCSE">IGCSE (Year 10–11)</option>
                  <option value="A Level">A Level / SSS3</option>
                  <option value="Year 7-9">Year 7–9 / JSS</option>
                  <option value="SSS">SSS1–SSS2</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject of Focus</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Computer Science / Mathematics / Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Academic Goals &amp; Specific Focus Areas</label>
              <textarea
                required
                rows={3}
                className="form-textarea"
                placeholder="e.g. Preparing for Cambridge IGCSE May/June exam, needs help with algorithmic logic and exam past papers..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              Next: Schedule &amp; Preference &rarr;
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: '1.3rem', color: '#0B1B3D', marginBottom: '1.25rem' }}>2. Schedule &amp; Educator Matching</h2>

            <div className="form-group">
              <label className="form-label">Preferred Timezone</label>
              <select
                className="form-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Africa/Lagos (WAT)">Africa/Lagos (WAT - UTC+1)</option>
                <option value="Europe/London (GMT/BST)">Europe/London (GMT/BST)</option>
                <option value="America/New_York (EST/EDT)">America/New_York (EST/EDT)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Days &amp; Time Window</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Weekdays 4:00 PM - 6:00 PM WAT, or Saturday morning"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tutor Preference (Optional)</label>
              <select
                className="form-select"
                value={tutorPreference}
                onChange={(e) => setTutorPreference(e.target.value)}
              >
                <option value="Any Qualified Vetted Tutor">Any Qualified Vetted Specialist</option>
                <option value="Mr. Adebayo">Mr. Adebayo (Lead Computer Science)</option>
                <option value="Dr. Fatima Aliyu">Dr. Fatima Aliyu (STEM Specialist)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Parent / Guardian Email</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="parent@ykay.ng"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-outline" style={{ flex: 1 }}>
                &larr; Back
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, padding: '0.85rem' }}>
                {loading ? 'Submitting Request...' : 'Submit 1:1 Tuition Request'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && result && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1rem auto' }}>
              ✓
            </div>
            <span className="badge badge-verified">REQUEST SUBMITTED</span>
            <h2 style={{ fontSize: '1.8rem', color: '#0B1B3D', margin: '0.5rem 0' }}>
              We Have Received Your Request!
            </h2>
            <p style={{ color: '#475569', maxWidth: 540, margin: '0 auto 1.5rem auto' }}>
              Our Academic Ops team is reviewing your learner&apos;s goals and matching them with the best vetted educator. We will send your quote and schedule to <strong>{result.parentEmail}</strong> within 24 hours.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', textAlign: 'left', maxWidth: 440, margin: '0 auto 2rem auto', fontSize: '0.92rem' }}>
              <div><strong>Request ID:</strong> {result.id}</div>
              <div><strong>Learner:</strong> {result.learnerName}</div>
              <div><strong>Subject:</strong> {result.subject}</div>
              <div><strong>Status:</strong> <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>{result.status}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/dashboard" className="btn btn-primary">
                Go to Parent Portal &rarr;
              </Link>
              <Link href="/programmes" className="btn btn-outline">
                Browse Cohorts
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

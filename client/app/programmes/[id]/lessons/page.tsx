"use client";

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LessonsPage() {
  const params = useParams();
  const programmeId = Array.isArray(params?.id) ? params.id[0] : params?.id || 'prog-igcse-cs';

  const [title, setTitle] = useState('IGCSE Computer Science Live Cohort Session');
  const [tutorId, setTutorId] = useState('tutor-1');
  const [tutorName, setTutorName] = useState('Mr. Adebayo');
  const [startTime, setStartTime] = useState('2026-08-20T16:00:00Z');
  const [endTime, setEndTime] = useState('2026-08-20T17:00:00Z');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          title,
          tutorId,
          tutorName,
          startTime,
          endTime,
          timezone,
          override,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Lesson scheduled successfully! ID: ${data.lesson?.id || 'lesson-1'} (UTC storage, local WAT display)`);
      } else {
        const txt = await response.text();
        setError(txt || 'Error scheduling lesson');
      }
    } catch (err: any) {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: 720 }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1.25rem' }}>
        <Link href="/programmes" style={{ color: '#64748B' }}>Programmes</Link> &rarr;{' '}
        <Link href={`/programmes/${programmeId}`} style={{ color: '#64748B' }}>Programme Detail</Link> &rarr;{' '}
        <span style={{ color: '#0B1B3D', fontWeight: 600 }}>Schedule Lesson</span>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <span className="badge badge-verified" style={{ marginBottom: '0.75rem' }}>TEACHING OPERATIONS</span>
        <h1 style={{ fontSize: '1.9rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>
          Schedule a Live Class Session
        </h1>
        <p style={{ color: '#64748B', marginBottom: '2rem' }}>
          Create and assign a live lesson for this cohort. Includes automated double-booking prevention per AC-05.
        </p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Lesson Title</label>
            <input
              type="text"
              required
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tutor ID</label>
              <input
                type="text"
                required
                className="form-input"
                value={tutorId}
                onChange={(e) => setTutorId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tutor Display Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={tutorName}
                onChange={(e) => setTutorName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Time (UTC / RFC3339)</label>
              <input
                type="text"
                required
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time (UTC / RFC3339)</label>
              <input
                type="text"
                required
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Timezone (for Display)</label>
            <input
              type="text"
              required
              className="form-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#FEF3C7', border: '1px solid #FCD34D', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="override"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="override" style={{ fontSize: '0.88rem', color: '#92400E', cursor: 'pointer' }}>
              <strong>Authorize Double-Booking Override (AC-05):</strong> Check this only if an administrator has explicitly approved an overlapping session schedule for this tutor.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link href={`/programmes/${programmeId}`} className="btn btn-outline">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Scheduling...' : 'Schedule Live Lesson'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

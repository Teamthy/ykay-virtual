"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Programme = {
  id: string;
  title: string;
  curriculum: string;
  level: string;
  subject: string;
  format: string;
  summary: string;
  price: number;
  status: string;
};

function ProgrammesContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCurriculum = searchParams.get('curriculum') || 'ALL';
  const initialFormat = searchParams.get('format') || 'ALL';

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [curriculum, setCurriculum] = useState(initialCurriculum);
  const [level, setLevel] = useState('ALL');
  const [format, setFormat] = useState(initialFormat);

  useEffect(() => {
    async function loadProgrammes() {
      try {
        const res = await fetch('http://localhost:8080/api/v1/programmes?public=true');
        if (res.ok) {
          const data = await res.json();
          setProgrammes(data ?? []);
        }
      } catch (err) {
        console.error('Failed to fetch programmes', err);
      } finally {
        setLoading(false);
      }
    }
    loadProgrammes();
  }, []);

  const filtered = programmes.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase());

    const matchesCurriculum =
      curriculum === 'ALL' ||
      p.curriculum.toLowerCase().includes(curriculum.toLowerCase());

    const matchesLevel =
      level === 'ALL' ||
      p.level.toLowerCase().includes(level.toLowerCase());

    const matchesFormat =
      format === 'ALL' ||
      p.format.toLowerCase().includes(format.toLowerCase());

    return matchesSearch && matchesCurriculum && matchesLevel && matchesFormat;
  });

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-verified">OFFICIAL LAUNCH CATALOGUE</span>
        <h1 style={{ fontSize: '2.4rem', color: '#0B1B3D', margin: '0.5rem 0' }}>Programmes &amp; Cohorts</h1>
        <p style={{ color: '#64748B', maxWidth: 720, fontSize: '1.05rem' }}>
          Explore our structured academic programmes across British and Nigerian curricula. Join small-group cohorts or book 1:1 private tuition with verified educators.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by title, subject, or keywords..."
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
          value={curriculum}
          onChange={(e) => setCurriculum(e.target.value)}
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
          <option value="Digital">Digital Academy</option>
        </select>

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{
            flex: '1 1 140px',
            padding: '0.65rem 0.85rem',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">All Levels</option>
          <option value="IGCSE">IGCSE (Y10–11)</option>
          <option value="A Level">A Level</option>
          <option value="Year">Year 7–9</option>
          <option value="SSS">SSS1–SSS3</option>
          <option value="JSS">JSS1–JSS3</option>
        </select>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          style={{
            flex: '1 1 140px',
            padding: '0.65rem 0.85rem',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">All Formats</option>
          <option value="Cohort">Group Cohort</option>
          <option value="Private">Private Tuition</option>
          <option value="Exam">Exam Prep</option>
        </select>

        {(search !== '' || curriculum !== 'ALL' || level !== 'ALL' || format !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setCurriculum('ALL');
              setLevel('ALL');
              setFormat('ALL');
            }}
            className="btn btn-outline"
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Programme Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748B' }}>
          Loading launch catalogue...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 style={{ color: '#0B1B3D', marginBottom: '0.5rem' }}>No programmes match your filter selection</h3>
          <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
            Try broadening your search or resetting the curriculum and level filters.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setCurriculum('ALL');
              setLevel('ALL');
              setFormat('ALL');
            }}
            className="btn btn-primary"
          >
            Show All Programmes
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '1.75rem' }}>
          {filtered.map((prog) => (
            <article
              key={prog.id}
              className="card card-hover"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span className={prog.curriculum.includes('British') ? 'badge badge-british' : 'badge badge-nigerian'}>
                    {prog.curriculum}
                  </span>
                  <span className="badge" style={{ background: '#F1F5F9', color: '#334155' }}>
                    {prog.format}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>{prog.title}</h2>
                <div style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1rem' }}>
                  <strong>Level:</strong> {prog.level} &bull; <strong>Subject:</strong> {prog.subject}
                </div>
                <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  {prog.summary}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Programme Fee</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>
                    ₦{prog.price.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#64748B' }}>/ term</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <Link href={`/programmes/${prog.id}`} className="btn btn-outline" style={{ padding: '0.55rem 1rem' }}>
                    Details
                  </Link>
                  <Link href={`/programmes/${prog.id}/enroll`} className="btn btn-primary" style={{ padding: '0.55rem 1.15rem' }}>
                    Enrol Now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProgrammesPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading launch catalogue...</div>}>
      <ProgrammesContent />
    </Suspense>
  );
}

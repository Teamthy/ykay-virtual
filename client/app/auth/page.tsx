"use client";

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'PARENT' | 'STUDENT' | 'TUTOR'>('PARENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const endpoint = mode === 'signin' ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const payload = mode === 'signin'
      ? { email, password }
      : { email, password, roles: [role] };

    try {
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // Store short-lived access token + refresh token simulation (§2 Confirmed Product Decisions)
        if (data.token) {
          localStorage.setItem('ykay_token', data.token);
        }
        setMessage(
          mode === 'signin'
            ? 'Sign in successful! Redirecting to dashboard...'
            : `Account created for ${email} with role ${role}! You can now sign in.`
        );

        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        const txt = await response.text();
        setError(txt || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err) {
      setError('Could not connect to authentication service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: '3.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 500, width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-verified" style={{ marginBottom: '0.5rem' }}>SECURE ACCESS</span>
          <h1 style={{ fontSize: '1.9rem', color: '#0B1B3D', margin: '0.4rem 0' }}>
            {mode === 'signin' ? 'Sign In to YKAY' : 'Create an Account'}
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            {mode === 'signin'
              ? 'Access your Parent, Student, or Educator portal.'
              : 'Join as a Parent/Guardian, Learner, or Educator.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '0.35rem', borderRadius: '10px', marginBottom: '1.75rem' }}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.92rem',
              background: mode === 'signin' ? '#ffffff' : 'transparent',
              color: mode === 'signin' ? '#0B1B3D' : '#64748B',
              boxShadow: mode === 'signin' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.92rem',
              background: mode === 'signup' ? '#ffffff' : 'transparent',
              color: mode === 'signup' ? '#0B1B3D' : '#64748B',
              boxShadow: mode === 'signup' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">I am joining as a:</label>
              <select
                className="form-select"
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
              >
                <option value="PARENT">Parent / Guardian (Enrol learners &amp; manage payments)</option>
                <option value="STUDENT">Student / Learner (Join live classes &amp; access resources)</option>
                <option value="TUTOR">Educator / Tutor (Teach cohorts &amp; private lessons)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. parent@ykay.ng"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {mode === 'signup' && (
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.25rem' }}>
              🔒 Passwords are stored using adaptive hashing per §5 security requirements.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
          >
            {loading ? 'Processing...' : mode === 'signin' ? 'Sign In to Portal' : 'Create Account'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '1.75rem', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748B' }}>
          By continuing, you agree to YKAY Virtual School&apos;s{' '}
          <Link href="/support" style={{ color: '#2563EB', textDecoration: 'underline' }}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/support" style={{ color: '#2563EB', textDecoration: 'underline' }}>
            Safeguarding Privacy Policy
          </Link>.
        </div>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useState } from 'react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch('http://localhost:8080/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, roles: ['PARENT'] })
    });

    const data = await response.text();
    setMessage(response.ok ? `Registered: ${data}` : `Error: ${data}`);
  }

  return (
    <main style={{ maxWidth: 480, margin: '3rem auto', padding: '2rem', background: '#fff', borderRadius: 12 }}>
      <h1>Parent sign-up</h1>
      <p>This is a minimal first-step auth experience for the MVP.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
        </label>
        <button type="submit" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }}>Register</button>
      </form>
      {message ? <p style={{ marginTop: '1rem' }}>{message}</p> : null}
    </main>
  );
}

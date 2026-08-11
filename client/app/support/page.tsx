"use client";

import { FormEvent, useState } from 'react';

export default function SupportPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [result, setResult] = useState('');

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const response = await fetch('http://localhost:8080/api/v1/support/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.text();
        setResult(response.ok ? `Ticket created: ${data}` : `Error: ${data}`);
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640 }}>
            <h1>Contact support</h1>
            <p>This is the first support workflow for parent and learner issues.</p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <label>
                    Name
                    <input type="text" value={name} onChange={(event) => setName(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Email
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Subject
                    <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Message
                    <textarea value={message} onChange={(event) => setMessage(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <button type="submit" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }}>Submit ticket</button>
            </form>
            {result ? <p style={{ marginTop: '1rem' }}>{result}</p> : null}
        </main>
    );
}

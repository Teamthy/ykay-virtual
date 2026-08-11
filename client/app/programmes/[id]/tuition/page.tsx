"use client";

import { FormEvent, useState } from 'react';

export default function TuitionPage({ params }: { params: { id: string } }) {
    const [parentEmail, setParentEmail] = useState('');
    const [learnerName, setLearnerName] = useState('');
    const [subject, setSubject] = useState('');
    const [goal, setGoal] = useState('');
    const [message, setMessage] = useState('');

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const response = await fetch('http://localhost:8080/api/v1/tuition-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                programmeId: params.id,
                parentEmail,
                learnerName,
                subject,
                goal
            })
        });

        const data = await response.text();
        setMessage(response.ok ? `Tuition request created: ${data}` : `Error: ${data}`);
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640 }}>
            <h1>Request private tuition</h1>
            <p>Parents can now request a tutor for a specific programme.</p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <label>
                    Parent email
                    <input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Learner name
                    <input type="text" value={learnerName} onChange={(event) => setLearnerName(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Subject
                    <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Goal
                    <textarea value={goal} onChange={(event) => setGoal(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <button type="submit" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }}>Submit tuition request</button>
            </form>
            {message ? <p style={{ marginTop: '1rem' }}>{message}</p> : null}
        </main>
    );
}

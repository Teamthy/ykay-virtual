"use client";

import { FormEvent, useState } from 'react';

export default function EnrollPage({ params }: { params: { id: string } }) {
    const [parentEmail, setParentEmail] = useState('');
    const [learnerName, setLearnerName] = useState('');
    const [message, setMessage] = useState('');

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const response = await fetch('http://localhost:8080/api/v1/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                programmeId: params.id,
                parentEmail,
                learnerName
            })
        });

        const data = await response.text();
        setMessage(response.ok ? `Enrollment created: ${data}` : `Error: ${data}`);
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640 }}>
            <h1>Enroll now</h1>
            <p>This is the first enrolment step for the parent journey.</p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <label>
                    Parent email
                    <input type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Learner name
                    <input type="text" value={learnerName} onChange={(event) => setLearnerName(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <button type="submit" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }}>Create enrollment</button>
            </form>
            {message ? <p style={{ marginTop: '1rem' }}>{message}</p> : null}
        </main>
    );
}

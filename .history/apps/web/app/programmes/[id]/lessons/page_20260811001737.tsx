"use client";

import { FormEvent, useState } from 'react';

export default function LessonsPage({ params }: { params: { id: string } }) {
    const [title, setTitle] = useState('');
    const [tutorId, setTutorId] = useState('tutor-1');
    const [tutorName, setTutorName] = useState('');
    const [startTime, setStartTime] = useState('2026-08-20T16:00:00Z');
    const [endTime, setEndTime] = useState('2026-08-20T17:00:00Z');
    const [timezone, setTimezone] = useState('Africa/Lagos');
    const [message, setMessage] = useState('');

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const response = await fetch('http://localhost:8080/api/v1/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                programmeId: params.id,
                title,
                tutorName,
                startTime,
                endTime,
                timezone
            })
        });

        const data = await response.text();
        setMessage(response.ok ? `Lesson created: ${data}` : `Error: ${data}`);
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 640 }}>
            <h1>Schedule a lesson</h1>
            <p>This adds the first lesson-management step for the teaching operations slice.</p>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <label>
                    Lesson title
                    <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Tutor ID
                    <input type="text" value={tutorId} onChange={(event) => setTutorId(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Tutor name
                    <input type="text" value={tutorName} onChange={(event) => setTutorName(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Start time
                    <input type="text" value={startTime} onChange={(event) => setStartTime(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    End time
                    <input type="text" value={endTime} onChange={(event) => setEndTime(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <label>
                    Timezone
                    <input type="text" value={timezone} onChange={(event) => setTimezone(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.35rem' }} />
                </label>
                <button type="submit" style={{ padding: '0.8rem 1rem', cursor: 'pointer' }}>Create lesson</button>
            </form>
            {message ? <p style={{ marginTop: '1rem' }}>{message}</p> : null}
        </main>
    );
}

"use client";

import { FormEvent, useEffect, useState } from 'react';

type TutorProfile = {
    id: string;
    name: string;
    subject: string;
    status: string;
    timezone: string;
};

export default function TutorsPage() {
    const [profiles, setProfiles] = useState<TutorProfile[]>([]);
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [timezone, setTimezone] = useState('');

    async function loadProfiles() {
        const response = await fetch('http://localhost:8080/api/v1/tutors');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setProfiles(data.profiles ?? []);
    }

    useEffect(() => {
        loadProfiles();
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const response = await fetch('http://localhost:8080/api/v1/tutors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, subject, timezone }),
        });

        if (response.ok) {
            setName('');
            setSubject('');
            setTimezone('');
            await loadProfiles();
        }
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 840 }}>
            <h1>Tutor directory</h1>
            <p>This is the first tutor-facing experience for the PRD’s tutor network slice.</p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem', maxWidth: 480 }}>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tutor name" required />
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" required />
                <input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Timezone" />
                <button type="submit">Create profile</button>
            </form>

            <section style={{ marginTop: '1.5rem' }}>
                <h2>Profiles</h2>
                {profiles.length === 0 ? (
                    <p>No tutor profiles available yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {profiles.map((profile) => (
                            <li key={profile.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{profile.name}</strong>
                                <div>Subject: {profile.subject}</div>
                                <div>Status: {profile.status}</div>
                                <div>Timezone: {profile.timezone}</div>
                                {profile.status === 'APPROVED' ? <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>Available for lessons</div> : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

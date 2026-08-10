"use client";

import { useEffect, useState } from 'react';

type TutorProfile = {
    id: string;
    name: string;
    subject: string;
    status: string;
    timezone: string;
};

export default function TutorsPage() {
    const [profiles, setProfiles] = useState<TutorProfile[]>([]);

    useEffect(() => {
        async function loadProfiles() {
            const response = await fetch('http://localhost:8080/api/v1/tutors');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setProfiles(data.profiles ?? []);
        }

        loadProfiles();
    }, []);

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 840 }}>
            <h1>Tutor directory</h1>
            <p>This is the first tutor-facing experience for the PRD’s tutor network slice.</p>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>Approved profiles</h2>
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
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

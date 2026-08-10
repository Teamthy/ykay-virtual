"use client";

import { useEffect, useState } from 'react';

type Summary = {
    id: string;
    title: string;
    curriculum: string;
    status: string;
    enrollmentCount: number;
};

export default function AdminPage() {
    const [summaries, setSummaries] = useState<Summary[]>([]);

    useEffect(() => {
        async function loadSummaries() {
            const response = await fetch('http://localhost:8080/api/v1/admin/programme-summaries');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setSummaries(data.summaries ?? []);
        }

        loadSummaries();
    }, []);

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 840 }}>
            <h1>Admin operations</h1>
            <p>This view reflects the first admin-facing programme summary experience for the MVP.</p>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>Programme overview</h2>
                {summaries.length === 0 ? (
                    <p>No programme summaries available yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {summaries.map((summary) => (
                            <li key={summary.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{summary.title}</strong>
                                <div>Curriculum: {summary.curriculum}</div>
                                <div>Status: {summary.status}</div>
                                <div>Enrollments: {summary.enrollmentCount}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

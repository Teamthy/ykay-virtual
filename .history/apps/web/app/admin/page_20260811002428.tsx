"use client";

import { useEffect, useState } from 'react';

type Summary = {
    id: string;
    title: string;
    curriculum: string;
    status: string;
    enrollmentCount: number;
};

type TutorProfile = {
    id: string;
    name: string;
    subject: string;
    status: string;
    timezone: string;
};

type SupportTicket = {
    id: string;
    name: string;
    subject: string;
    status: string;
};

export default function AdminPage() {
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [tutors, setTutors] = useState<TutorProfile[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);

    async function loadSummaries() {
        const response = await fetch('http://localhost:8080/api/v1/admin/programme-summaries');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setSummaries(data.summaries ?? []);
    }

    async function loadTutors() {
        const response = await fetch('http://localhost:8080/api/v1/tutors');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setTutors(data.profiles ?? []);
    }

    async function loadTickets() {
        const response = await fetch('http://localhost:8080/api/v1/support/tickets');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setTickets(data.tickets ?? []);
    }

    useEffect(() => {
        loadSummaries();
        loadTutors();
        loadTickets();
    }, []);

    async function handleApprove(id: string) {
        await fetch(`http://localhost:8080/api/v1/tutors/status?id=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
        });
        await loadTutors();
    }

    async function handleCloseTicket(id: string) {
        await fetch(`http://localhost:8080/api/v1/support/tickets/status?id=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CLOSED' }),
        });
        await loadTickets();
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 960 }}>
            <h1>Admin operations</h1>
            <p>This view reflects the first admin-facing programme summary and tutor review experience for the MVP.</p>

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

            <section style={{ marginTop: '1.5rem' }}>
                <h2>Tutor review queue</h2>
                {tutors.length === 0 ? (
                    <p>No tutor applications yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {tutors.map((tutor) => (
                            <li key={tutor.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{tutor.name}</strong>
                                <div>Subject: {tutor.subject}</div>
                                <div>Status: {tutor.status}</div>
                                <div>Timezone: {tutor.timezone}</div>
                                {tutor.status !== 'APPROVED' ? (
                                    <button onClick={() => handleApprove(tutor.id)} style={{ marginTop: '0.75rem' }}>
                                        Approve
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section style={{ marginTop: '1.5rem' }}>
                <h2>Support queue</h2>
                {tickets.length === 0 ? (
                    <p>No support tickets yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {tickets.map((ticket) => (
                            <li key={ticket.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{ticket.subject}</strong>
                                <div>From: {ticket.name}</div>
                                <div>Status: {ticket.status}</div>
                                {ticket.status !== 'CLOSED' ? (
                                    <button onClick={() => handleCloseTicket(ticket.id)} style={{ marginTop: '0.75rem' }}>
                                        Close ticket
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

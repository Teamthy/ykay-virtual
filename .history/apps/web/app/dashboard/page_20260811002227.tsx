"use client";

import { useEffect, useState } from 'react';

type Lesson = {
    id: string;
    title: string;
    tutorName: string;
    status: string;
    outcome?: string;
    startTime: string;
    endTime: string;
    timezone: string;
};

type TutorProfile = {
    id: string;
    name: string;
    subject: string;
    status: string;
    timezone: string;
};

export default function DashboardPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [tutors, setTutors] = useState<TutorProfile[]>([]);

    async function refreshLessons() {
        const response = await fetch('http://localhost:8080/api/v1/lessons');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setLessons(data.lessons ?? []);
    }

    useEffect(() => {
        async function loadTutors() {
            const response = await fetch('http://localhost:8080/api/v1/tutors');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setTutors((data.profiles ?? []).filter((profile: TutorProfile) => profile.status === 'APPROVED'));
        }

        refreshLessons();
        loadTutors();
    }, []);

    async function updateLessonStatus(lessonId: string, status: string) {
        await fetch(`http://localhost:8080/api/v1/lessons/${lessonId}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, outcome: status === 'ATTENDED' ? 'Completed successfully' : status === 'CANCELLED' ? 'Cancelled' : '' }),
        });
        await refreshLessons();
    }

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 840 }}>
            <h1>Parent dashboard</h1>
            <p>This view shows upcoming lessons and current attendance status for the learner journey.</p>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>Upcoming lessons</h2>
                {lessons.length === 0 ? (
                    <p>No lessons scheduled yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {lessons.map((lesson) => (
                            <li key={lesson.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{lesson.title}</strong>
                                <div>Tutor: {lesson.tutorName}</div>
                                <div>Status: {lesson.status}</div>
                                {lesson.outcome ? <div>Outcome: {lesson.outcome}</div> : null}
                                <div>Starts: {new Date(lesson.startTime).toLocaleString()}</div>
                                <div>Ends: {new Date(lesson.endTime).toLocaleString()}</div>
                                <div>Timezone: {lesson.timezone}</div>
                                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => updateLessonStatus(lesson.id, 'ATTENDED')}>Mark attended</button>
                                    <button onClick={() => updateLessonStatus(lesson.id, 'CANCELLED')}>Cancel</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section style={{ marginTop: '1.5rem' }}>
                <h2>Approved tutors</h2>
                {tutors.length === 0 ? (
                    <p>No approved tutors available yet.</p>
                ) : (
                    <ul style={{ display: 'grid', gap: '0.75rem', padding: 0, listStyle: 'none' }}>
                        {tutors.map((tutor) => (
                            <li key={tutor.id} style={{ border: '1px solid #d1d5db', borderRadius: '0.75rem', padding: '1rem' }}>
                                <strong>{tutor.name}</strong>
                                <div>Subject: {tutor.subject}</div>
                                <div>Timezone: {tutor.timezone}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

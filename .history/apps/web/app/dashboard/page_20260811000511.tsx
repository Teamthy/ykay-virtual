"use client";

import { useEffect, useState } from 'react';

type Lesson = {
    id: string;
    title: string;
    tutorName: string;
    status: string;
    startTime: string;
    timezone: string;
};

export default function DashboardPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);

    useEffect(() => {
        async function loadLessons() {
            const response = await fetch('http://localhost:8080/api/v1/lessons');
            if (!response.ok) {
                return;
            }
            const data = await response.json();
            setLessons(data.lessons ?? []);
        }

        loadLessons();
    }, []);

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
                                <div>Starts: {new Date(lesson.startTime).toLocaleString()}</div>
                                <div>Timezone: {lesson.timezone}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}

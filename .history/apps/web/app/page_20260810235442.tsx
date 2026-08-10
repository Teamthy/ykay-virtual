import Link from 'next/link';

export default function HomePage() {
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>YKAY Virtual School</h1>
            <p>Expert teaching. Structured learning. Anywhere.</p>
            <p>The first slice is focused on the core parent journey: discover a programme, view its details, and begin the enrolment path.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <Link href="/programmes" style={{ color: '#0f766e', textDecoration: 'underline' }}>
                    Browse programmes
                </Link>
                <Link href="/auth" style={{ color: '#0f766e', textDecoration: 'underline' }}>
                    Open auth experience
                </Link>
            </div>
        </main>
    );
}

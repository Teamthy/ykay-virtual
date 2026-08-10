import Link from 'next/link';

export default function HomePage() {
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>YKAY Virtual School</h1>
            <p>Expert teaching. Structured learning. Anywhere.</p>
            <p>The first slice is being prepared around parent, learner, programme, and enrollment flows.</p>
            <p>
                <Link href="/auth" style={{ color: '#0f766e', textDecoration: 'underline' }}>
                    Open the first auth experience
                </Link>
            </p>
        </main>
    );
}

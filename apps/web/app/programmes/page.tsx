import Link from 'next/link';

async function getProgrammes() {
    const response = await fetch('http://localhost:8080/api/v1/programmes', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to load programmes');
    }
    return response.json();
}

export default async function ProgrammesPage() {
    const programmes = await getProgrammes();

    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>Programmes</h1>
            <p>Browse the launch catalogue for the first commercial slice.</p>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
                {programmes.map((programme: any) => (
                    <article key={programme.id} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '1rem', background: '#fff' }}>
                        <h2>{programme.title}</h2>
                        <p>{programme.summary}</p>
                        <p><strong>Curriculum:</strong> {programme.curriculum} • <strong>Level:</strong> {programme.level} • <strong>Format:</strong> {programme.format}</p>
                        <p><strong>Price:</strong> ₦{programme.price.toLocaleString()}</p>
                        <Link href={`/programmes/${programme.id}`} style={{ color: '#0f766e', textDecoration: 'underline' }}>
                            View programme
                        </Link>
                    </article>
                ))}
            </div>
        </main>
    );
}

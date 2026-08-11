import './globals.css';
import Link from 'next/link';

export const metadata = {
    title: 'YKAY Virtual School — Expert Teaching. Structured Learning. Anywhere.',
    description: 'Trusted, academically governed online school combining British and Nigerian curricula, examination preparation, private tuition, group cohorts, digital skills, and a vetted tutor network.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <header className="header">
                    <div className="container nav-bar">
                        <Link href="/" className="brand-logo">
                            YKAY <span>Virtual School</span>
                        </Link>
                        <nav className="nav-links">
                            <Link href="/programmes" className="nav-link">Programmes</Link>
                            <Link href="/tutors" className="nav-link">Find a Tutor</Link>
                            <Link href="/dashboard" className="nav-link">Student & Parent Portal</Link>
                            <Link href="/admin" className="nav-link">Academic Ops (Admin)</Link>
                            <Link href="/support" className="nav-link">Support</Link>
                            <Link href="/auth" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                                Sign In / Join
                            </Link>
                        </nav>
                    </div>
                </header>

                <div style={{ minHeight: 'calc(100vh - 220px)' }}>
                    {children}
                </div>

                <footer style={{ background: '#0B1B3D', color: '#94A3B8', padding: '3.5rem 0 2rem 0', marginTop: '4rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem' }}>
                                YKAY <span style={{ color: '#60A5FA' }}>Virtual School</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                A trusted, academically governed online school combining British &amp; Nigerian curricula, examination preparation, private tuition, group cohorts, and a vetted tutor network.
                            </p>
                            <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#CBD5E1' }}>
                                📍 Lagos, Nigeria • Timezone-aware learning (UTC/WAT)
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>Academic Pathways</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <li><Link href="/programmes?curriculum=British" style={{ color: '#94A3B8' }}>British Curriculum (Year 7–A Level)</Link></li>
                                <li><Link href="/programmes?curriculum=Nigerian" style={{ color: '#94A3B8' }}>Nigerian Curriculum (JSS1–SSS3)</Link></li>
                                <li><Link href="/programmes?format=Exam" style={{ color: '#94A3B8' }}>IGCSE, WAEC, NECO &amp; JAMB Prep</Link></li>
                                <li><Link href="/programmes?curriculum=Digital" style={{ color: '#94A3B8' }}>Digital Academy &amp; Computer Science</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>Portals &amp; Governance</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <li><Link href="/dashboard" style={{ color: '#94A3B8' }}>Parent Portal &amp; Learner Visibility</Link></li>
                                <li><Link href="/dashboard" style={{ color: '#94A3B8' }}>Student Portal &amp; Live Roster</Link></li>
                                <li><Link href="/tutors" style={{ color: '#94A3B8' }}>Vetted Tutor Marketplace</Link></li>
                                <li><Link href="/admin" style={{ color: '#94A3B8' }}>Academic Operations &amp; Safeguarding</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>Safeguarding &amp; Trust</div>
                            <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: '#CBD5E1' }}>
                                YKAY owns tutor quality, programme standards, and learner safeguarding. All tutors complete a 6-stage vetting and background check.
                            </p>
                            <Link href="/support" className="btn btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
                                Safeguarding Escalation
                            </Link>
                        </div>
                    </div>
                    <div className="container" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
                        <div>&copy; 2026 YKAY Virtual School. All rights reserved.</div>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <Link href="/support" style={{ color: '#94A3B8' }}>Privacy Notice</Link>
                            <Link href="/support" style={{ color: '#94A3B8' }}>Safeguarding Policy</Link>
                            <Link href="/support" style={{ color: '#94A3B8' }}>Terms of Service</Link>
                        </div>
                    </div>
                </footer>
            </body>
        </html>
    );
}

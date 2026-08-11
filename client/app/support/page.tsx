"use client";

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Academic Programme Enquiries');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('http://localhost:8080/api/v1/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject: `[${category}] ${subject}`,
          message,
        }),
      });

      if (response.ok) {
        setResult('Your support ticket has been logged with our Academic Ops team. We respond to all enquiries within 6 hours.');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setResult('Error submitting support ticket.');
      }
    } catch (err) {
      setResult('Failed to connect to support server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: 880 }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="badge badge-verified">HELP &amp; GOVERNANCE</span>
        <h1 style={{ fontSize: '2.4rem', color: '#0B1B3D', margin: '0.4rem 0' }}>
          Contact Support &amp; Academic Leadership
        </h1>
        <p style={{ color: '#64748B', maxWidth: 640, margin: '0 auto', fontSize: '1.05rem' }}>
          Have questions about our British or Nigerian curricula, tuition billing, or safeguarding policies? We are here to help.
        </p>
      </div>

      <div className="grid-2" style={{ gap: '2rem', alignItems: 'flex-start' }}>
        {/* Support Ticket Form */}
        <div className="card" style={{ padding: '2.25rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#0B1B3D', marginBottom: '1.25rem' }}>
            Submit a Support Enquiry
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Mrs. Chioma Okafor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="parent@ykay.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Enquiry Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Academic Programme Enquiries">Academic Programme Enquiries</option>
                <option value="1:1 Private Tuition Matching">1:1 Private Tuition Matching</option>
                <option value="Payment & Billing">Payment &amp; Paystack Billing</option>
                <option value="Safeguarding & Governance Concern">Safeguarding &amp; Governance Concern (§12)</option>
                <option value="Tutor Application Enquiry">Tutor Application &amp; Vetting</option>
                <option value="Technical Support">Portal Technical Support</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. IGCSE Mathematics class schedule question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Message</label>
              <textarea
                rows={4}
                required
                className="form-textarea"
                placeholder="Please describe how we can assist you..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {result && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.92rem' }}>
                {result}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              {loading ? 'Submitting Enquiry...' : 'Submit Support Enquiry'}
            </button>
          </form>
        </div>

        {/* Support Channels & Safeguarding Info */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ background: '#0B1B3D', color: '#ffffff', padding: '2rem' }}>
            <span className="badge" style={{ background: 'rgba(96,165,250,0.2)', color: '#60A5FA', marginBottom: '0.75rem' }}>
              DIRECT WHATSAPP ASSISTANCE
            </span>
            <h3 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem 0' }}>Instant Parent Support</h3>
            <p style={{ color: '#CBD5E1', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Need urgent help choosing a cohort or checking class schedules? Connect directly with our Academic Helpdesk on WhatsApp.
            </p>
            <a
              href="https://wa.me/2348000000000"
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
              style={{ width: '100%', textAlign: 'center' }}
            >
              Open WhatsApp Helpdesk &rarr;
            </a>
          </div>

          <div className="card" style={{ borderTop: '4px solid #166534' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>
              Safeguarding &amp; Child Protection (§12)
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              YKAY Virtual School operates under strict child safeguarding protocols. Minor contact information is never shared with educators, and any safeguarding concern is escalated immediately to our Principal Academic Officer.
            </p>
            <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
              ✓ Dedicated Safeguarding Hotline • ✓ Monitored Lesson Logs
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', color: '#0B1B3D', margin: '0 0 0.5rem 0' }}>
              Office Hours &amp; Location
            </h3>
            <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7 }}>
              <div><strong>Academic Operations Center:</strong> Lagos, Nigeria (WAT / UTC+1)</div>
              <div><strong>Support Hours:</strong> Monday – Saturday, 8:00 AM – 8:00 PM WAT</div>
              <div><strong>Email:</strong> academic-support@ykay.ng</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

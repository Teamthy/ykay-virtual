import React from 'react';
import { Programme } from '../api/client';

export interface ProgrammeCardProps {
  programme: Programme;
  onSelect: (prog: Programme) => void;
  onEnroll: (prog: Programme) => void;
}

export const ProgrammeCard: React.FC<ProgrammeCardProps> = ({ programme, onSelect, onEnroll }) => {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 2px 4px rgba(11, 27, 61, 0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            background: programme.curriculum.includes('British') ? '#EFF6FF' : '#F0FDF4',
            color: programme.curriculum.includes('British') ? '#1E40AF' : '#166534',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: 9999,
            textTransform: 'uppercase',
          }}
        >
          {programme.curriculum}
        </span>
        <span
          style={{
            background: '#F1F5F9',
            color: '#334155',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 9999,
          }}
        >
          {programme.format}
        </span>
      </div>

      <h3
        onClick={() => onSelect(programme)}
        style={{
          color: '#0B1B3D',
          fontSize: 18,
          fontWeight: 700,
          margin: '4px 0 8px 0',
          cursor: 'pointer',
        }}
      >
        {programme.title}
      </h3>

      <div style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>
        <strong>Level:</strong> {programme.level} &bull; <strong>Subject:</strong> {programme.subject}
      </div>

      <p style={{ color: '#475569', fontSize: 14, lineHeight: '1.5', margin: '0 0 16px 0' }}>
        {programme.summary}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #E2E8F0',
          paddingTop: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>FEE</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
            ₦{programme.price.toLocaleString()}
          </div>
        </div>

        <button
          onClick={() => onEnroll(programme)}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Enrol Now
        </button>
      </div>
    </div>
  );
};

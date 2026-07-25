'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminUserSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/admin/users?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(`/admin/users`);
    }
  }

  return (
    <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6f7a72', fontSize: '20px' }}>search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: '100%', padding: '12px 16px 12px 40px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#ffffff', color: '#0b1c30', fontSize: '16px', outline: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}
          onFocus={(e) => e.target.style.borderColor = '#004e34'}
          onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
        />
      </div>
      <button type="submit" className="az-btn-secondary" style={{ padding: '10px 16px', fontSize: '14px' }}>Search</button>
      {initialQuery && (
        <button type="button" onClick={() => { setQuery(''); router.push('/admin/users'); }} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#6f7a72', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '14px' }}>Clear</button>
      )}
    </form>
  );
}

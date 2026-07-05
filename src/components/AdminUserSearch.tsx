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
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-variant)', fontSize: '20px' }}>search</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', color: 'var(--v2-text)', fontSize: '14px', outline: 'none' }}
        />
      </div>
      <button type="submit" className="v2-btn v2-btn-secondary" style={{ padding: '8px 16px' }}>Search</button>
      {initialQuery && (
        <button type="button" onClick={() => { setQuery(''); router.push('/admin/users'); }} className="v2-btn v2-btn-secondary" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid transparent', color: 'var(--v2-text-variant)' }}>Clear</button>
      )}
    </form>
  );
}

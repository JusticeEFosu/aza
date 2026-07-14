'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function FundraisersPage() {
  const [fundraisers, setFundraisers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatorSlug, setCreatorSlug] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchFundraisers();
  }, []);

  const fetchFundraisers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('creator_profiles').select('slug').eq('id', user.id).single();
    if (profile?.slug) setCreatorSlug(profile.slug);

    const res = await fetch(`/api/fundraisers?creatorId=${user.id}`);
    const json = await res.json();
    if (json.data) {
      setFundraisers(json.data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetAmount('');
    setShowLeaderboard(true);
    setIsActive(true);
    setEditingId(null);
  };

  const openEdit = (f: any) => {
    setTitle(f.title);
    setDescription(f.description || '');
    setTargetAmount((f.target_amount / 100).toString());
    setShowLeaderboard(f.show_leaderboard);
    setIsActive(f.is_active);
    setEditingId(f.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const payload = {
      title,
      description,
      targetAmount: Math.floor(parseFloat(targetAmount) * 100), // convert to kobo
      showLeaderboard,
      isActive
    };

    if (editingId) {
      await fetch(`/api/fundraisers/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/fundraisers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    setIsSaving(false);
    setShowModal(false);
    resetForm();
    fetchFundraisers();
  };

  const copyShareLink = (id: string) => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const url = `${origin}/c/${creatorSlug}#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fundraiser?')) return;
    await fetch(`/api/fundraisers/${id}`, { method: 'DELETE' });
    fetchFundraisers();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <main className="v2-main-content" style={{ maxWidth: '800px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="v2-dash-title">Fundraisers</h1>
          <p className="v2-dash-desc">Set goals and let your fans support your specific projects.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="v2-btn v2-btn-primary"
        >
          Create Goal
        </button>
      </header>

      {fundraisers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>target</span>
          <p style={{ fontSize: '16px', fontWeight: 500 }}>No active goals</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>Create a fundraiser to start receiving targeted support.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fundraisers.map(f => {
            const progress = f.target_amount > 0 ? Math.min(100, Math.round((f.current_amount / f.target_amount) * 100)) : 0;
            return (
              <div key={f.id} style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--v2-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {f.title}
                      {!f.is_active && <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--v2-surface-low)', borderRadius: '12px' }}>Closed</span>}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--v2-text-variant)', fontSize: '14px' }}>{f.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => copyShareLink(f.id)} 
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--v2-outline)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedId === f.id ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--v2-green)' }}>check</span>
                          <span style={{ color: 'var(--v2-green)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>share</span>
                          Share
                        </>
                      )}
                    </button>
                    <button onClick={() => openEdit(f)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--v2-outline)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Edit</button>
                    <button onClick={() => handleDelete(f.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Delete</button>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                    <span style={{ color: 'var(--v2-primary)' }}>Raised: ₦{(f.current_amount / 100).toLocaleString()}</span>
                    <span style={{ color: 'var(--v2-text-variant)' }}>Goal: ₦{(f.target_amount / 100).toLocaleString()}</span>
                  </div>
                  <div style={{ height: '12px', background: 'var(--v2-surface-container)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--v2-green)', transition: 'width 0.5s ease-out' }}></div>
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: 'var(--v2-text-variant)', fontWeight: 600 }}>
                    {progress}% Funded
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--v2-surface-lowest)', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)' }}>
              {editingId ? 'Edit Fundraiser' : 'Create Fundraiser'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--v2-text-variant)' }}>Goal Title</label>
                <input 
                  required
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="v2-input"
                  placeholder="e.g., New Camera Equipment"
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--v2-text-variant)' }}>Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="v2-input"
                  placeholder="What is this goal for?"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: 'var(--v2-text-variant)' }}>Target Amount (₦)</label>
                <input 
                  required
                  type="number" 
                  min="1000"
                  value={targetAmount} 
                  onChange={e => setTargetAmount(e.target.value)}
                  className="v2-input"
                  placeholder="50000"
                  style={{ width: '100%' }}
                />
                <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--v2-text-variant)', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                  Note: MyAzaa applies a 5% platform fee to help keep the lights on, in addition to standard Paystack processing fees.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--v2-surface-low)', padding: '16px', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="showLeaderboard"
                  checked={showLeaderboard}
                  onChange={e => setShowLeaderboard(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--v2-green)' }}
                />
                <div>
                  <label htmlFor="showLeaderboard" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--v2-primary)', cursor: 'pointer' }}>Show Top 10 Leaderboard</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--v2-text-variant)' }}>Display a public list of your top supporters for this goal.</p>
                </div>
              </div>

              {editingId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--v2-green)' }}
                  />
                  <label htmlFor="isActive" style={{ fontWeight: 500, fontSize: '14px', color: 'var(--v2-primary)', cursor: 'pointer' }}>Goal is active and accepting donations</label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="v2-btn" style={{ background: 'transparent', color: 'var(--v2-primary)' }}>Cancel</button>
                <button type="submit" disabled={isSaving} className="v2-btn v2-btn-primary">
                  {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

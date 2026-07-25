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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Donors Modal State
  const [viewingDonorsId, setViewingDonorsId] = useState<string | null>(null);
  const [donorsList, setDonorsList] = useState<any[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(false);

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
    const url = `${origin}/fundraiser/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchDonors = async (id: string) => {
    setViewingDonorsId(id);
    setLoadingDonors(true);
    setDonorsList([]);
    try {
      const res = await fetch(`/api/fundraisers/${id}/donations`);
      const json = await res.json();
      if (json.data) {
        setDonorsList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch donors', err);
    }
    setLoadingDonors(false);
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
    <main style={{ maxWidth: '800px', padding: '32px 16px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Fundraisers</h1>
          <p style={{ fontSize: '16px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', margin: '4px 0 0 0' }}>Set goals and let your fans support your specific projects.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="az-btn-primary"
          style={{ backgroundColor: '#fed65b', color: '#745c00', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, borderRadius: '8px', padding: '10px 20px', border: 'none', cursor: 'pointer' }}
        >
          Create Goal
        </button>
      </header>

      {fundraisers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#3f4943', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#004e34' }}>target</span>
          <p style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-heading, Montserrat, sans-serif)', color: '#0b1c30' }}>No active goals</p>
          <p style={{ fontSize: '14px', marginTop: '4px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Create a fundraiser to start receiving targeted support.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fundraisers.map(f => {
            const progress = f.target_amount > 0 ? Math.min(100, Math.round((f.current_amount / f.target_amount) * 100)) : 0;
            return (
              <div key={f.id} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, margin: '0 0 8px 0', color: '#0b1c30', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {f.title}
                      {!f.is_active && <span style={{ fontSize: '12px', padding: '2px 8px', background: '#eff4ff', color: '#3f4943', borderRadius: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Closed</span>}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', color: '#3f4943', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{f.description}</p>
                  </div>
                  {/* Desktop Action Row (All 4 buttons visible) */}
                  <div className="v2-hidden-mobile" style={{ gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => fetchDonors(f.id)} style={{ padding: '6px 12px', background: '#eff4ff', color: '#004e34', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span>
                      Donors
                    </button>
                    <button 
                      onClick={() => copyShareLink(f.id)} 
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedId === f.id ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#059669' }}>check</span>
                          <span style={{ color: '#059669' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#3f4943' }}>share</span>
                          Share
                        </>
                      )}
                    </button>
                    <button onClick={() => openEdit(f)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#0b1c30' }}>Edit</button>
                    <button onClick={() => handleDelete(f.id)} style={{ padding: '6px 12px', background: '#fef2f2', color: '#ba1a1a', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Delete</button>
                  </div>

                  {/* Mobile Action Row (Donors & Share + ••• Menu) */}
                  <div className="v2-hidden-desktop" style={{ gap: '6px', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
                    <button onClick={() => fetchDonors(f.id)} style={{ padding: '6px 10px', background: '#eff4ff', color: '#004e34', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span>
                      Donors
                    </button>
                    <button 
                      onClick={() => copyShareLink(f.id)} 
                      style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedId === f.id ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#059669' }}>check</span>
                          <span style={{ color: '#059669' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#3f4943' }}>share</span>
                          Share
                        </>
                      )}
                    </button>

                    {/* ••• Mobile Menu Button */}
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === f.id ? null : f.id)}
                      style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0b1c30' }}>more_vert</span>
                    </button>

                    {/* Mobile Dropdown for Edit & Delete */}
                    {openMenuId === f.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 50, minWidth: '110px' }}>
                        <button 
                          onClick={() => { setOpenMenuId(null); openEdit(f); }}
                          style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0b1c30', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          Edit
                        </button>
                        <button 
                          onClick={() => { setOpenMenuId(null); handleDelete(f.id); }}
                          style={{ padding: '8px 12px', background: '#fef2f2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#ba1a1a', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    <span style={{ color: '#004e34', fontWeight: 700 }}>Raised: ₦{(f.current_amount / 100).toLocaleString()}</span>
                    <span style={{ color: '#3f4943' }}>Goal: ₦{(f.target_amount / 100).toLocaleString()}</span>
                  </div>
                  <div style={{ height: '10px', background: '#eff4ff', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#004e34', transition: 'width 0.5s ease-out' }}></div>
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: '#3f4943', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
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
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>
              {editingId ? 'Edit Fundraiser' : 'Create Fundraiser'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Goal Title</label>
                <input 
                  required
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="az-input"
                  placeholder="e.g., New Camera Equipment"
                  style={{ width: '100%', fontSize: '16px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="az-textarea"
                  placeholder="What is this goal for?"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '16px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Target Amount (₦)</label>
                <input 
                  required
                  type="number" 
                  min="1000"
                  value={targetAmount} 
                  onChange={e => setTargetAmount(e.target.value)}
                  className="az-input"
                  placeholder="50000"
                  style={{ width: '100%', fontSize: '16px' }}
                />
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#3f4943', display: 'flex', alignItems: 'flex-start', gap: '4px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                  Note: MyAzaa applies a 5% platform fee to help keep the lights on, in addition to standard Paystack processing fees.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff4ff', padding: '16px', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="showLeaderboard"
                  checked={showLeaderboard}
                  onChange={e => setShowLeaderboard(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#004e34' }}
                />
                <div>
                  <label htmlFor="showLeaderboard" style={{ fontWeight: 600, fontSize: '14px', color: '#0b1c30', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Show Top 10 Leaderboard</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Display a public list of your top supporters for this goal.</p>
                </div>
              </div>

              {editingId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#004e34' }}
                  />
                  <label htmlFor="isActive" style={{ fontWeight: 500, fontSize: '14px', color: '#0b1c30', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Goal is active and accepting donations</label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 20px', color: '#0b1c30', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Cancel</button>
                <button type="submit" disabled={isSaving} className="az-btn-primary" style={{ backgroundColor: '#fed65b', color: '#745c00', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, borderRadius: '8px', padding: '10px 20px', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donors List Modal */}
      {viewingDonorsId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Donors</h2>
              <button onClick={() => setViewingDonorsId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3f4943' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
              {loadingDonors ? (
                <p style={{ textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Loading donors...</p>
              ) : donorsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>inbox</span>
                  <p style={{ margin: 0 }}>No donations yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {donorsList.map((d: any) => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{d.donor_name || 'Anonymous'}</p>
                        {d.donor_note && <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#3f4943', fontStyle: 'italic', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>"{d.donor_note}"</p>}
                        <p style={{ margin: 0, fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ fontWeight: 700, color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                        ₦{(d.amount / 100).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

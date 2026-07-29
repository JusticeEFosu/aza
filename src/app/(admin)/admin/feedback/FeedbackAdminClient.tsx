'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type FeedbackItem = {
  id: string;
  user_id: string | null;
  email: string | null;
  type: string;
  message: string;
  page_url: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  profiles: { display_name: string; email: string } | null;
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  bug: { label: 'Bug', color: '#dc2626', bg: '#fef2f2', icon: 'bug_report' },
  feature: { label: 'Feature', color: '#7c3aed', bg: '#f5f3ff', icon: 'lightbulb' },
  general: { label: 'General', color: '#2563eb', bg: '#eff6ff', icon: 'chat' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#d97706', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
  resolved: { label: 'Resolved', color: '#059669', bg: '#ecfdf5' },
};

export default function FeedbackAdminClient({ feedback: initialFeedback }: { feedback: FeedbackItem[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // New State for Inbox layout
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = feedback.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    all: feedback.length,
    new: feedback.filter((f) => f.status === 'new').length,
    in_progress: feedback.filter((f) => f.status === 'in_progress').length,
    resolved: feedback.filter((f) => f.status === 'resolved').length,
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      // Optimistic update
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      router.refresh();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to permanently delete ${ids.length} feedback item(s)?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      
      setFeedback(prev => prev.filter(f => !ids.includes(f.id)));
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      if (activeId && ids.includes(activeId)) setActiveId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(f => f.id));
    }
  };

  const activeFeedback = filtered.find(f => f.id === activeId);

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '24px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Feedback Inbox
        </h1>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>
          Manage bug reports, feature requests, and general feedback.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px', flexShrink: 0 }}>
        {[
          { key: 'all', label: 'Total', count: counts.all, color: '#0b1c30' },
          { key: 'new', label: 'New', count: counts.new, color: '#d97706' },
          { key: 'in_progress', label: 'In Progress', count: counts.in_progress, color: '#2563eb' },
          { key: 'resolved', label: 'Resolved', count: counts.resolved, color: '#059669' },
        ].map((s) => (
          <div
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            style={{
              background: '#ffffff',
              border: '1px solid',
              borderColor: filterStatus === s.key ? s.color : '#E2E8F0',
              borderWidth: filterStatus === s.key ? '2px' : '1px',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '24px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>
              {s.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Action bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', background: '#ffffff', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '100px' }}>
          {[
            { value: 'all', label: 'All Types' },
            { value: 'bug', label: 'Bugs' },
            { value: 'feature', label: 'Features' },
            { value: 'general', label: 'General' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              style={{
                padding: '6px 16px',
                borderRadius: '100px',
                border: 'none',
                background: filterType === opt.value ? '#004e34' : 'transparent',
                color: filterType === opt.value ? '#ffffff' : '#3f4943',
                fontSize: '13px',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', background: '#fef2f2', padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => handleDelete(selectedIds)}
              disabled={isDeleting}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}
      </div>

      {/* Main Split Pane */}
      <div style={{ display: 'flex', flex: 1, gap: '20px', minHeight: 0, overflow: 'hidden' }}>
        
        {/* LEFT PANE (Inbox List) */}
        <div style={{ 
          flex: '0 0 350px', 
          background: '#ffffff', 
          border: '1px solid #E2E8F0', 
          borderRadius: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}>
          {/* List Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8f9ff' }}>
            <input 
              type="checkbox" 
              checked={selectedIds.length === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6f7a72', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select All
            </span>
          </div>

          {/* List Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6f7a72', fontSize: '14px' }}>
                No feedback found.
              </div>
            ) : (
              filtered.map(item => {
                const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.general;
                const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
                const submitter = item.profiles?.display_name || item.profiles?.email || item.email || 'Anonymous';
                const isSelected = selectedIds.includes(item.id);
                const isActive = activeId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      background: isActive ? '#f0fdf4' : (isSelected ? '#f8f9ff' : '#ffffff'),
                      transition: 'background 0.15s',
                      display: 'flex',
                      gap: '12px',
                    }}
                  >
                    <div style={{ paddingTop: '2px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {}}
                        onClick={(e) => toggleSelection(e, item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0b1c30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {submitter}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6f7a72' }}>
                          {new Date(item.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                         <span style={{ fontSize: '11px', background: typeConf.bg, color: typeConf.color, padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                           {typeConf.label}
                         </span>
                         <span style={{ fontSize: '11px', background: statusConf.bg, color: statusConf.color, padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                           {statusConf.label}
                         </span>
                      </div>
                      
                      <p style={{ margin: 0, fontSize: '13px', color: '#3f4943', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                        {item.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE (Reading Pane) */}
        <div style={{ 
          flex: 1, 
          background: '#ffffff', 
          border: '1px solid #E2E8F0', 
          borderRadius: '12px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!activeFeedback ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6f7a72' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#E2E8F0', marginBottom: '16px' }}>inbox</span>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>Select a feedback item to read</p>
            </div>
          ) : (
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Reading Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0b1c30' }}>
                    {activeFeedback.profiles?.display_name || activeFeedback.profiles?.email || activeFeedback.email || 'Anonymous User'}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6f7a72' }}>
                    <span>{new Date(activeFeedback.created_at).toLocaleString('en-GB')}</span>
                    {activeFeedback.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                        {activeFeedback.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleDelete([activeFeedback.id])}
                    disabled={isDeleting}
                    style={{
                      background: 'transparent',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    Delete
                  </button>

                  <select
                    value={activeFeedback.status}
                    onChange={(e) => handleStatusChange(activeFeedback.id, e.target.value)}
                    disabled={updatingId === activeFeedback.id}
                    style={{
                      background: STATUS_CONFIG[activeFeedback.status]?.bg || '#fff',
                      color: STATUS_CONFIG[activeFeedback.status]?.color || '#000',
                      border: `1px solid ${STATUS_CONFIG[activeFeedback.status]?.color || '#E2E8F0'}`,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="new">Mark New</option>
                    <option value="in_progress">Mark In Progress</option>
                    <option value="resolved">Mark Resolved</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6f7a72', marginBottom: '12px', fontWeight: 700 }}>Message</h4>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: '#0b1c30',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {activeFeedback.message}
                </p>
              </div>

              {/* Page URL */}
              {activeFeedback.page_url && (
                <div>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6f7a72', marginBottom: '8px', fontWeight: 700 }}>Page URL</h4>
                  <a href={activeFeedback.page_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span>
                    {activeFeedback.page_url}
                  </a>
                </div>
              )}

              {/* Screenshot */}
              {activeFeedback.screenshot_url && (
                <div>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6f7a72', marginBottom: '12px', fontWeight: 700 }}>Screenshot</h4>
                  <a href={activeFeedback.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={activeFeedback.screenshot_url}
                      alt="User screenshot"
                      style={{
                        maxWidth: '100%',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        cursor: 'zoom-in',
                      }}
                    />
                  </a>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

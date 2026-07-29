'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

type FeedbackType = 'bug' | 'feature' | 'general';

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug', label: 'Report Bug', icon: 'bug_report' },
  { value: 'feature', label: 'Request Feature', icon: 'lightbulb' },
  { value: 'general', label: 'General', icon: 'chat' },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Limit to 5MB before compression
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }

    try {
      // Compress client-side before converting to base64
      const { compressImage } = await import('@/lib/utils/imageCompression');
      const compressed = await compressImage(file, 0.8, 1280);

      const reader = new FileReader();
      reader.onload = () => {
        setScreenshot(reader.result as string);
        setScreenshotName(file.name);
      };
      reader.readAsDataURL(compressed);
    } catch {
      // Fallback: use original file
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshot(reader.result as string);
        setScreenshotName(file.name);
      };
      reader.readAsDataURL(file);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open via custom event (triggered from dashboard sidebar)
  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener('open-feedback-widget', handleOpenEvent);
    return () => window.removeEventListener('open-feedback-widget', handleOpenEvent);
  }, []);

  // Check auth state when widget opens
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (isOpen && !loading) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, loading]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !loading) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || null,
          page_url: window.location.href,
          screenshot: screenshot || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        // Reset after close animation
        setTimeout(() => {
          setSubmitted(false);
          setMessage('');
          setEmail('');
          setType('general');
          setScreenshot(null);
          setScreenshotName('');
        }, 300);
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const charCount = message.length;

  if (pathname?.startsWith('/messages')) {
    return null;
  }

  return (
    <div ref={panelRef} className="az-feedback-container" style={{ position: 'fixed', right: '24px', zIndex: 9990 }}>
      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Send feedback"
        style={{
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: 'var(--az-primary, #004e34)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '100px',
          cursor: 'pointer',
          fontFamily: 'var(--font-body, Inter, sans-serif)',
          fontWeight: 600,
          fontSize: '14px',
          boxShadow: '0 4px 20px rgba(0, 78, 52, 0.3)',
          transition: 'all 0.25s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 78, 52, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 78, 52, 0.3)';
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>feedback</span>
        Feedback
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            animation: 'feedbackSlideIn 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--az-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontFamily: 'var(--font-heading, Montserrat, sans-serif)',
                fontWeight: 700,
                color: 'var(--az-text-main, #0b1c30)',
                letterSpacing: '-0.02em',
              }}>
                Send Feedback
              </h3>
              <p style={{
                margin: '2px 0 0',
                fontSize: '13px',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                color: 'var(--az-text-muted, #3f4943)',
              }}>
                Help us improve MyAzaa
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              style={{
                background: 'var(--az-surface-low, #eff4ff)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--az-text-muted, #3f4943)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--az-border, #E2E8F0)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--az-surface-low, #eff4ff)'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>

          {submitted ? (
            /* Success state */
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              animation: 'feedbackFadeIn 0.3s ease-out',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--az-success, #059669)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '16px',
                fontFamily: 'var(--font-heading, Montserrat, sans-serif)',
                fontWeight: 700,
                color: 'var(--az-text-main, #0b1c30)',
              }}>
                Thank you!
              </p>
              <p style={{
                margin: '4px 0 0',
                fontSize: '14px',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                color: 'var(--az-text-muted, #3f4943)',
              }}>
                Your feedback has been received.
              </p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
              {/* Type selector chips */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {TYPE_OPTIONS.map((opt) => {
                  const isActive = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: `1.5px solid ${isActive ? 'var(--az-primary, #004e34)' : 'var(--az-border, #E2E8F0)'}`,
                        background: isActive ? 'var(--az-primary, #004e34)' : '#ffffff',
                        color: isActive ? '#ffffff' : 'var(--az-text-muted, #3f4943)',
                        fontFamily: 'var(--font-body, Inter, sans-serif)',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <div style={{ marginBottom: '14px' }}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                  placeholder="Tell us what's on your mind..."
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    fontSize: '16px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--az-border, #E2E8F0)',
                    background: 'var(--az-surface-low, #eff4ff)',
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                    color: 'var(--az-text-main, #0b1c30)',
                    resize: 'none',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--az-primary, #004e34)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--az-border, #E2E8F0)'}
                />
                <div style={{
                  textAlign: 'right',
                  fontSize: '12px',
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                  color: charCount > 1800 ? 'var(--az-error, #ba1a1a)' : 'var(--az-outline, #6f7a72)',
                  marginTop: '4px',
                }}>
                  {charCount}/2000
                </div>
              </div>

              {/* Email (optional — only shown for anonymous users) */}
              {!isLoggedIn && (
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email — so we can follow up (optional)"
                  style={{
                    width: '100%',
                    fontSize: '16px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--az-border, #E2E8F0)',
                    background: 'var(--az-surface-low, #eff4ff)',
                    fontFamily: 'var(--font-body, Inter, sans-serif)',
                    color: 'var(--az-text-main, #0b1c30)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--az-primary, #004e34)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--az-border, #E2E8F0)'}
                />
              </div>
              )}

              {/* Screenshot attachment */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {screenshot ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--az-surface-low, #eff4ff)',
                    border: '1.5px solid var(--az-border, #E2E8F0)',
                  }}>
                    <img
                      src={screenshot}
                      alt="Screenshot preview"
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--az-border, #E2E8F0)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: 'var(--az-text-main, #0b1c30)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {screenshotName}
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: 'var(--az-outline, #6f7a72)' }}>
                        Screenshot attached
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setScreenshot(null); setScreenshotName(''); }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--az-text-muted, #3f4943)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px dashed var(--az-border, #E2E8F0)',
                      background: 'transparent',
                      color: 'var(--az-text-muted, #3f4943)',
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--az-primary, #004e34)'; e.currentTarget.style.color = 'var(--az-primary, #004e34)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--az-border, #E2E8F0)'; e.currentTarget.style.color = 'var(--az-text-muted, #3f4943)'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_photo_alternate</span>
                    Attach screenshot (optional)
                  </button>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !message.trim()}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--az-primary, #004e34)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading, Montserrat, sans-serif)',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: loading || !message.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !message.trim() ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Sending...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes feedbackSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes feedbackFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .az-feedback-container {
          bottom: 24px;
        }
        @media (max-width: 768px) {
          .az-feedback-container {
            bottom: 88px;
          }
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function StreamAlertsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDonateLink, setCopiedDonateLink] = useState(false);
  const [creatorSlug, setCreatorSlug] = useState('');
  
  // Form State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsMinNgn, setTtsMinNgn] = useState('');
  const [alertDuration, setAlertDuration] = useState('8');
  const [rateUsd, setRateUsd] = useState('1600');
  const [rateGbp, setRateGbp] = useState('2050');
  const [rateEur, setRateEur] = useState('1750');

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch creator slug for donation link
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('slug')
      .eq('id', user.id)
      .single();
    if (creatorProfile?.slug) setCreatorSlug(creatorProfile.slug);

    // Fetch or create stream settings
    let { data: streamSettings, error } = await supabase
      .from('stream_settings')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Doesn't exist, create it
      const { data: newSettings } = await supabase
        .from('stream_settings')
        .insert({ creator_id: user.id })
        .select()
        .single();
      streamSettings = newSettings;
    }

    if (streamSettings) {
      setSettings(streamSettings);
      setTtsEnabled(streamSettings.tts_enabled);
      setTtsMinNgn((streamSettings.tts_min_ngn / 100).toString());
      setAlertDuration(streamSettings.alert_duration.toString());
      setRateUsd(streamSettings.rate_usd?.toString() || '1600');
      setRateGbp(streamSettings.rate_gbp?.toString() || '2050');
      setRateEur(streamSettings.rate_eur?.toString() || '1750');
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !settings) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('stream_settings')
      .update({
        tts_enabled: ttsEnabled,
        tts_min_ngn: Math.floor(parseFloat(ttsMinNgn) * 100),
        alert_duration: parseInt(alertDuration, 10),
        rate_usd: parseFloat(rateUsd),
        rate_gbp: parseFloat(rateGbp),
        rate_eur: parseFloat(rateEur),
      })
      .eq('creator_id', settings.creator_id);

    setIsSaving(false);
    if (!error) {
      alert('Settings saved successfully!');
    } else {
      alert('Failed to save settings.');
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Are you sure? This will break your current OBS browser source and you will need to update the URL.')) return;
    setIsSaving(true);
    
    // UUID v4 generation using web crypto API isn't directly available in a simple sync way for all browsers without a library, but Supabase can do it.
    // However, it's safer to just let the database generate it by calling an RPC, but we didn't make one.
    // We can just use crypto.randomUUID()
    const newToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('stream_settings')
      .update({ overlay_token: newToken })
      .eq('creator_id', settings.creator_id)
      .select()
      .single();

    if (!error && data) {
      setSettings(data);
    } else {
      alert('Failed to regenerate token.');
    }
    setIsSaving(false);
  };

  const copyOverlayUrl = () => {
    if (!settings) return;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const url = `${origin}/overlay/alerts?token=${settings.overlay_token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyDonateUrl = () => {
    if (!creatorSlug) return;
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const url = `${origin}/donate/${creatorSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedDonateLink(true);
    setTimeout(() => setCopiedDonateLink(false), 2000);
  };

  const sendTestAlert = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/stream-alerts/test', {
        method: 'POST',
      });
      if (res.ok) {
        alert('Test alert sent! Check your OBS source.');
      } else {
        alert('Failed to send test alert.');
      }
    } catch (e) {
      alert('Error sending test alert.');
    }
    setIsSendingTest(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <main style={{ maxWidth: '800px', padding: '32px 16px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Stream Alerts</h1>
        <p style={{ fontSize: '16px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', margin: '4px 0 0 0' }}>Show real-time donation alerts on your Twitch, Kick, or YouTube stream.</p>
      </header>

      {settings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Donation Page Link */}
          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, color: '#0b1c30', margin: '0 0 16px 0' }}>Your Donation Link</h2>
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', marginBottom: '16px' }}>Share this link in your Twitch, Kick, or YouTube stream description. Fans click it to donate and their message appears live on your stream.</p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                readOnly 
                value={creatorSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/donate/${creatorSlug}` : 'Loading...'} 
                className="az-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', background: '#f8f9ff', color: '#0b1c30' }}
              />
              <button 
                onClick={copyDonateUrl}
                className="az-btn-primary"
                style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: '#004e34', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{copiedDonateLink ? 'check' : 'content_copy'}</span>
                {copiedDonateLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {/* OBS Setup Section */}
          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, color: '#0b1c30', margin: '0 0 16px 0' }}>OBS Browser Source URL</h2>
            <p style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', marginBottom: '16px' }}>Add this URL as a new Browser Source in OBS Studio. Do not show this URL on stream.</p>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input 
                type="password" 
                readOnly 
                value={`https://myaaza.com/overlay/alerts?token=${settings.overlay_token}`} 
                className="az-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', background: '#f8f9ff', color: '#6f7a72' }}
              />
              <button 
                onClick={copyOverlayUrl}
                className="az-btn-primary"
                style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: '#004e34', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{copiedLink ? 'check' : 'content_copy'}</span>
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={sendTestAlert}
                disabled={isSendingTest}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'transparent', color: '#0b1c30', fontWeight: 600, cursor: isSendingTest ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>notifications_active</span>
                {isSendingTest ? 'Sending...' : 'Send Test Alert'}
              </button>
              <button 
                onClick={handleRegenerateToken}
                disabled={isSaving}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#ba1a1a', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                Reset Token
              </button>
            </div>
          </section>

          {/* Settings Section */}
          <section style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, color: '#0b1c30', margin: '0 0 24px 0' }}>Alert Settings</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff4ff', padding: '16px', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="ttsEnabled"
                  checked={ttsEnabled}
                  onChange={e => setTtsEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#004e34' }}
                />
                <div>
                  <label htmlFor="ttsEnabled" style={{ fontWeight: 600, fontSize: '14px', color: '#0b1c30', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Enable Text-To-Speech (TTS)</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Automatically read out donation messages on stream using the default computer voice.</p>
                </div>
              </div>

              {ttsEnabled && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Minimum Amount for TTS (₦)</label>
                  <input 
                    required
                    type="number" 
                    min="100"
                    value={ttsMinNgn} 
                    onChange={e => setTtsMinNgn(e.target.value)}
                    className="az-input"
                    placeholder="1500"
                    style={{ width: '100%', fontSize: '16px' }}
                  />
                  <p style={{ marginTop: '6px', fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    Donations below this amount will show on screen but will not trigger the voice reader.
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Alert Duration (Seconds)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <input 
                    type="range" 
                    min="5" 
                    max="15" 
                    value={alertDuration} 
                    onChange={e => setAlertDuration(e.target.value)}
                    style={{ flex: 1, accentColor: '#004e34' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '16px', color: '#004e34', minWidth: '40px', textAlign: 'center' }}>{alertDuration}s</span>
                </div>
              </div>

              {/* Exchange Rates */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Exchange Rates (1 unit → ₦)</label>
                <p style={{ marginTop: '0', marginBottom: '16px', fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  Used to check if foreign currency donations meet your minimum thresholds for alerts and TTS. Paystack handles the actual payouts.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#3f4943' }}>1 USD ($) =</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#3f4943', fontSize: '14px' }}>₦</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={rateUsd}
                        onChange={e => setRateUsd(e.target.value)}
                        className="az-input"
                        style={{ width: '100%', paddingLeft: '30px', fontSize: '16px' }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#3f4943' }}>1 GBP (£) =</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#3f4943', fontSize: '14px' }}>₦</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={rateGbp}
                        onChange={e => setRateGbp(e.target.value)}
                        className="az-input"
                        style={{ width: '100%', paddingLeft: '30px', fontSize: '16px' }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#3f4943' }}>1 EUR (€) =</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#3f4943', fontSize: '14px' }}>₦</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={rateEur}
                        onChange={e => setRateEur(e.target.value)}
                        className="az-input"
                        style={{ width: '100%', paddingLeft: '30px', fontSize: '16px' }}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" disabled={isSaving} className="az-btn-primary" style={{ backgroundColor: '#fed65b', color: '#745c00', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, borderRadius: '8px', padding: '10px 24px', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

            </form>
          </section>
        </div>
      )}
    </main>
  );
}

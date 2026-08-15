'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Donation {
  id: string;
  amount_display: number;
  currency: string;
  amount_ngn: number;
  donor_name: string;
  donor_note: string;
}

interface Settings {
  ttsEnabled: boolean;
  ttsMinNgn: number;
  alertDuration: number;
}

const PROFANITY_LIST = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'fag', 'faggot', 'whore', 'slut'];

function sanitizeText(text: string) {
  if (!text) return '';
  let sanitized = text;
  PROFANITY_LIST.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '***');
  });
  return sanitized;
}

function speakText(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const sanitized = sanitizeText(text);
  const utterance = new SpeechSynthesisUtterance(sanitized);
  // Optional: choose specific voice if needed, otherwise uses default
  window.speechSynthesis.speak(utterance);
}

function AlertOverlay() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [queue, setQueue] = useState<Donation[]>([]);
  const [currentAlert, setCurrentAlert] = useState<Donation | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isActive, setIsActive] = useState(false); // Controls the CSS animation state
  
  const sinceRef = useRef<string>('');
  const queueRef = useRef<Donation[]>([]); // To safely access queue in intervals
  const isProcessingRef = useRef(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (!token) return;

    const pollDonations = async () => {
      try {
        const url = `/api/stream-alerts/poll?token=${token}${sinceRef.current ? `&since=${encodeURIComponent(sinceRef.current)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        
        if (data.settings) {
          setSettings(data.settings);
        }

        if (data.nextSince) {
          sinceRef.current = data.nextSince;
        }

        if (data.donations && data.donations.length > 0) {
          setQueue(prev => [...prev, ...data.donations]);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    };

    // Initial poll
    pollDonations();

    // Poll every 5 seconds
    const interval = setInterval(pollDonations, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Queue Processor
  useEffect(() => {
    const processNext = async () => {
      if (isProcessingRef.current || queueRef.current.length === 0 || !settings) return;

      isProcessingRef.current = true;
      const nextDonation = queueRef.current[0];
      
      setCurrentAlert(nextDonation);
      setIsActive(true);

      // Trigger TTS if applicable
      if (settings.ttsEnabled && nextDonation.amount_ngn >= settings.ttsMinNgn) {
        // Simple mapping for currency words
        const currencyMap: Record<string, string> = {
          'USD': 'dollars',
          'GBP': 'pounds',
          'EUR': 'euros',
          'NGN': 'naira'
        };
        const currencyWord = currencyMap[nextDonation.currency] || nextDonation.currency;
        const msg = nextDonation.donor_note ? `and says: ${nextDonation.donor_note}` : '';
        const ttsText = `${nextDonation.donor_name || 'Anonymous'} donated ${nextDonation.amount_display} ${currencyWord} ${msg}`;
        speakText(ttsText);
      }

      // Wait for the duration to display
      await new Promise(resolve => setTimeout(resolve, settings.alertDuration * 1000));

      // Trigger fade out
      setIsActive(false);

      // Wait for fade out animation to complete before popping
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setQueue(prev => prev.slice(1));
      setCurrentAlert(null);
      isProcessingRef.current = false;
    };

    if (!isProcessingRef.current && queue.length > 0) {
      processNext();
    }
  }, [queue, settings]);

  if (!token) {
    return <div style={{ color: 'white', fontFamily: 'sans-serif', padding: '20px' }}>Missing Overlay Token</div>;
  }

  // Currency Symbols map
  const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', backgroundColor: 'transparent' }}>
      
      {currentAlert && (
        <div 
          className={`alert-container ${isActive ? 'active' : 'inactive'}`}
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            fontFamily: 'Montserrat, sans-serif'
          }}
        >
          {/* Main Alert Card */}
          <div style={{
            background: 'linear-gradient(135deg, #004e34 0%, #002d1e 100%)',
            border: '4px solid #fed65b',
            borderRadius: '24px',
            padding: '24px 48px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(254, 214, 91, 0.4)',
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            transform: 'translateY(0)',
            minWidth: '400px'
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 800 }}>
              <span style={{ color: '#fed65b' }}>{currentAlert.donor_name || 'Anonymous'}</span> donated
            </h1>
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
              {CURRENCY_SYMBOLS[currentAlert.currency] || currentAlert.currency}{currentAlert.amount_display}
            </div>
          </div>

          {/* Message Bubble */}
          {currentAlert.donor_note && (
            <div 
              className="message-bubble"
              style={{
                marginTop: '16px',
                background: '#ffffff',
                color: '#0b1c30',
                padding: '16px 24px',
                borderRadius: '16px',
                fontSize: '20px',
                fontWeight: 600,
                maxWidth: '600px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                position: 'relative'
              }}
            >
              {/* Little speech bubble triangle */}
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0',
                height: '0',
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderBottom: '10px solid #ffffff'
              }} />
              {sanitizeText(currentAlert.donor_note)}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800;900&display=swap');

        /* Default background for OBS browser source should be transparent */
        body { background-color: transparent !important; margin: 0; padding: 0; }
        
        .alert-container {
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform: translate(-50%, calc(-50% + 50px)) scale(0.9);
        }

        .alert-container.active {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }

        .alert-container.inactive {
          opacity: 0;
          transform: translate(-50%, calc(-50% - 50px)) scale(0.9);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .message-bubble {
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlertOverlay />
    </Suspense>
  );
}

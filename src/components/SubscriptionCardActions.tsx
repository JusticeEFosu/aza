'use client';
import { useRouter } from 'next/navigation';

export default function SubscriptionCardActions({ slug, subscriptionId }: { slug: string, subscriptionId: string }) {
  const router = useRouter();

  return (
    <div className="v2-sub-actions">
      <a 
        href={`/c/${slug}`}
        className="v2-sub-btn v2-sub-btn-primary" 
      >
        Manage
      </a>
      <button 
        onClick={async () => {
          if (confirm('Are you sure you want to cancel this subscription? You will lose access immediately.')) {
             try {
                // Call actual cancel endpoint
                const res = await fetch('/api/subscriptions/cancel', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ subscriptionId })
                });
                if (res.ok) {
                   router.refresh();
                } else {
                   alert('Failed to cancel subscription.');
                }
             } catch (err) {
                console.error(err);
             }
          }
        }}
        className="v2-sub-btn v2-sub-btn-secondary"
      >
        Cancel
      </button>
    </div>
  );
}

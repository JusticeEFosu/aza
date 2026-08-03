'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type UnreadCountContextType = {
  unreadCount: number;
};

const UnreadCountContext = createContext<UnreadCountContextType>({ unreadCount: 0 });

export const useUnreadCount = () => useContext(UnreadCountContext);

export default function UnreadCountProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // "Silent Check" for unread messages whenever the user navigates.
  // By placing this in a Context Provider at the Layout level, it only fires ONCE per navigation 
  // instead of once per Sidebar/MobileNav component.
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/messages/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    }
    fetchUnreadCount();
  }, [pathname]);

  return (
    <UnreadCountContext.Provider value={{ unreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

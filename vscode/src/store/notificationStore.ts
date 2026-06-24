import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  type: 'new_appt' | 'no_show' | 'rescheduled' | 'completed';
  text: string;
  sub: string;
  timestamp: string; // ISO String
  read: boolean;
  appointmentId: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  soundProfile: 'chime' | 'glass' | 'bell' | 'pop' | 'cosmic';
  addNotification: (item: {
    type: NotificationItem['type'];
    text: string;
    sub: string;
    appointmentId: string;
  }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setSoundProfile: (profile: 'chime' | 'glass' | 'bell' | 'pop' | 'cosmic') => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      soundProfile: 'chime',
      addNotification: (item) => {
        const current = get().notifications;
        const now = new Date();

        // Deduplicate: check if there is an identical notification for the same appointment and type within the last 5 seconds
        const isDuplicate = current.some(
          (n) =>
            n.appointmentId === item.appointmentId &&
            n.type === item.type &&
            (now.getTime() - new Date(n.timestamp).getTime()) < 5000
        );

        if (isDuplicate) return;

        const newNotif: NotificationItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: item.type,
          text: item.text,
          sub: item.sub,
          timestamp: now.toISOString(),
          read: false,
          appointmentId: item.appointmentId,
        };

        // Keep only the latest 30 notifications
        set({ notifications: [newNotif, ...current].slice(0, 30) });
      },
      markAsRead: (id) => {
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        });
      },
      markAllAsRead: () => {
        set({
          notifications: get().notifications.map((n) => ({ ...n, read: true })),
        });
      },
      clearAll: () => {
        set({ notifications: [] });
      },
      setSoundProfile: (profile) => {
        set({ soundProfile: profile });
      },
    }),
    {
      name: 'anadsll-notifications',
    }
  )
);

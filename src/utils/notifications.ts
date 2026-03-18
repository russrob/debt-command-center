/**
 * Notification system for Debt Command Center.
 * Handles browser Notification API + in-app toast queue.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from '../types';

export type NotifType = 'payment' | 'promo' | 'info';

export interface InAppNotif {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  color?: string;
  timestamp: number;
}

// ─── Permission request ───────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ─── Fire a browser notification ─────────────────────────────────────────────

function fireNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag, // deduplication key
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  } catch (e) {
    console.warn('Notification failed:', e);
  }
}

// ─── Build the list of due notifications ────────────────────────────────────

export interface PendingNotif {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  color?: string;
  daysUntil: number;
}

function daysUntilDay(day: number): number {
  const now = new Date();
  const t = now.getDate(), y = now.getFullYear(), m = now.getMonth();
  let d = new Date(y, m, day);
  if (t > day) d = new Date(y, m + 1, day);
  return Math.ceil((d.getTime() - now.getTime()) / 864e5);
}

function daysUntilDate(s: string): number {
  return Math.ceil((new Date(s).getTime() - new Date().getTime()) / 864e5);
}

export function buildPendingNotifications(state: AppState): PendingNotif[] {
  const list: PendingNotif[] = [];

  state.cards.forEach(card => {
    const daysBefore = card.reminderDaysBefore ?? 3;
    const days = daysUntilDay(card.dueDate);

    if (card.reminderEnabled && days >= 0 && days <= daysBefore) {
      list.push({
        id: `pay-${card.id}`,
        title: `Payment Due: ${card.name}`,
        body: days === 0
          ? `$${card.minPayment.toLocaleString()} due today!`
          : `$${card.minPayment.toLocaleString()} due in ${days} day${days > 1 ? 's' : ''}`,
        type: 'payment',
        color: card.color,
        daysUntil: days,
      });
    }

    card.promos.forEach(promo => {
      const promoDays = daysUntilDate(promo.expirationDate);
      if (promoDays >= 0 && promoDays <= 14) {
        list.push({
          id: `promo-${promo.id}`,
          title: `Promo Expiring: ${card.name}`,
          body: `"${promo.description}" expires in ${promoDays} day${promoDays !== 1 ? 's' : ''}`,
          type: 'promo',
          color: '#f59e0b',
          daysUntil: promoDays,
        });
      }
    });
  });

  (state.manualEvents || []).forEach(event => {
    if (!event.reminderEnabled) return;
    const days = daysUntilDate(event.date);
    if (days >= 0 && days <= (event.reminderDaysBefore ?? 3)) {
      list.push({
        id: `evt-${event.id}`,
        title: event.title,
        body: days === 0 ? 'Happening today' : `In ${days} day${days > 1 ? 's' : ''}`,
        type: 'info',
        color: event.color,
        daysUntil: days,
      });
    }
  });

  return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ─── Hook: fires browser notifs once per day per tag ─────────────────────────

const FIRED_KEY = 'dcc_notifs_fired';

function getFiredToday(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return new Set();
    const { date, ids } = JSON.parse(raw);
    const today = new Date().toDateString();
    if (date !== today) return new Set();
    return new Set(ids as string[]);
  } catch { return new Set(); }
}

function markFired(ids: string[]) {
  const today = new Date().toDateString();
  localStorage.setItem(FIRED_KEY, JSON.stringify({ date: today, ids }));
}

export function useNotifications(
  state: AppState,
  onInAppNotif: (n: InAppNotif) => void
) {
  const firedRef = useRef<Set<string>>(getFiredToday());
  const onInAppRef = useRef(onInAppNotif);
  onInAppRef.current = onInAppNotif;

  const checkAndFire = useCallback(() => {
    const pending = buildPendingNotifications(state);
    const newFired = new Set(firedRef.current);

    pending.forEach(n => {
      if (firedRef.current.has(n.id)) return;

      // Browser notification
      fireNotification(n.title, n.body, n.id);

      // In-app notification
      onInAppRef.current({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        color: n.color,
        timestamp: Date.now(),
      });

      newFired.add(n.id);
    });

    firedRef.current = newFired;
    markFired([...newFired] as string[]);
  }, [state]);

  // Run on mount and every 30 minutes
  useEffect(() => {
    checkAndFire();
    const interval = setInterval(checkAndFire, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAndFire]);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Zone } from './dashboardBridge';

const EVENTS_STORAGE_KEY = '@aha_timeline_events';
const MAX_EVENTS = 500; // Keep last 500 events

export type TimelineEvent = {
    id: string;
    timestamp: number; // Unix timestamp in seconds
    zone: Zone | null;
    description: string;
};

// Get all events
export async function getEvents(): Promise<TimelineEvent[]> {
    try {
        const data = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load events:', error);
        return [];
    }
}

// Get events for a specific date
export async function getEventsByDate(date: Date): Promise<TimelineEvent[]> {
    const allEvents = await getEvents();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime() / 1000;
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).getTime() / 1000;

    return allEvents.filter(event => event.timestamp >= startOfDay && event.timestamp <= endOfDay);
}

// Add a new event
export async function addEvent(zone: Zone | null, description: string): Promise<void> {
    try {
        const events = await getEvents();
        const newEvent: TimelineEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Math.floor(Date.now() / 1000),
            zone,
            description,
        };

        const updatedEvents = [newEvent, ...events].slice(0, MAX_EVENTS);
        await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
    } catch (error) {
        console.error('Failed to add event:', error);
    }
}

// Clear all events
export async function clearEvents(): Promise<void> {
    try {
        await AsyncStorage.removeItem(EVENTS_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear events:', error);
    }
}

// Format zone to Korean description
export function formatZoneDescription(zone: Zone | null, action: 'enter' | 'exit' = 'enter'): string {
    if (!zone) {
        return action === 'enter' ? '집 방문' : '외출';
    }

    const zoneNames: Record<Zone, string> = {
        bathroom: '화장실',
        living: '거실',
        bedroom: '안방',
    };

    return action === 'enter' ? `${zoneNames[zone]} 입실` : `${zoneNames[zone]} 퇴실`;
}

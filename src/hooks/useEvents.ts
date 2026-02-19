/**
 * hooks/useEvents.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { EventType, Topic } from '../types';

export function buildEventActions(
    projectId: string | null,
    getEvents: () => EventType[],
    setEvents: (events: EventType[]) => void,
    getTopics: () => Topic[],
    setTopics: (topics: Topic[]) => void
) {
    const addEvent = (name: string, description = '', schema = '{}') => {
        if (!projectId) return;
        const event: EventType = {
            id: uuid(),
            name,
            description,
            schema,
        };
        storage.createEvent(projectId, event);
        setEvents([...getEvents(), event]);
    };

    const updateEvent = (id: string, patch: Partial<EventType>) => {
        if (!projectId) return;
        storage.updateEvent(projectId, id, patch);
        setEvents(getEvents().map(e => e.id === id ? { ...e, ...patch } : e));
    };

    const deleteEvent = (id: string) => {
        if (!projectId) return;
        storage.deleteEvent(projectId, id);
        setEvents(getEvents().filter(e => e.id !== id));
        // Cascade: remove eventId from topics in local state
        setTopics(getTopics().map(t => ({
            ...t,
            eventIds: (t.eventIds || []).filter(x => x !== id),
        })));
    };

    return { addEvent, updateEvent, deleteEvent };
}

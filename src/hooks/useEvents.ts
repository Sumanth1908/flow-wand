/**
 * hooks/useEvents.ts
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';
import { EventType, Consumer } from '../types';

export const buildEventActions = (
    projectId: string | null,
    getEvents: () => EventType[],
    setEvents: (events: EventType[]) => void,
    getConsumers: () => Consumer[],
    setConsumers: (consumers: Consumer[]) => void
) => {
    const addEvent = (name: string, description = '', schema = '{}', examplePayload?: string) => {
        if (!projectId) return;
        const event: EventType = {
            id: uuid(),
            name,
            description,
            schema,
            ...(examplePayload ? { examplePayload } : {}),
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
        const data = storage.deleteEvent(projectId, id);
        setEvents(getEvents().filter(e => e.id !== id));
        setConsumers(data.consumers);
    };

    return { addEvent, updateEvent, deleteEvent };
}

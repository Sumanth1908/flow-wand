/**
 * hooks/useEvents.js — Event type CRUD actions
 * Events are named schemas that get tagged onto Topics.
 */
import { v4 as uuid } from 'uuid';
import * as storage from '../lib/storage';

export function buildEventActions(projectId, getEvents, setEvents, getTopics, setTopics) {
    const addEvent = (name, description = '', schema = '{}') => {
        if (!projectId) return null;
        const event = {
            id: uuid(),
            name,
            description,
            schema,
            createdAt: new Date().toISOString(),
        };
        storage.createEvent(projectId, event);
        setEvents([...getEvents(), event]);
        return event;
    };

    const updateEvent = (id, patch) => {
        if (!projectId) return;
        storage.updateEvent(projectId, id, patch);
        setEvents(getEvents().map(e => e.id === id ? { ...e, ...patch } : e));
    };

    const deleteEvent = (id) => {
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

// Simple in-memory store for the demo. Holds leads (caller + booking + survey
// answers) so the branded dashboard has something to show. Swap this for a real
// database (Supabase / Airtable) when you move past the demo.

import { randomUUID } from 'node:crypto';

const leads = new Map(); // id -> lead

export function createLead({ callSid, from, to }) {
  const id = randomUUID().slice(0, 8);
  const lead = {
    id,
    callSid: callSid || null,
    phone: from || null,
    calledNumber: to || null,
    createdAt: new Date().toISOString(),
    name: null,
    service: null,
    appointment: null, // { startsAt, humanTime, calBookingId }
    survey: null,       // { address, issue, urgency, notes, completedAt }
    surveySent: false,
    status: 'new',
  };
  leads.set(id, lead);
  return lead;
}

export function updateLead(id, patch) {
  const lead = leads.get(id);
  if (!lead) return null;
  Object.assign(lead, patch);
  return lead;
}

export function getLead(id) {
  return leads.get(id) || null;
}

export function allLeads() {
  return [...leads.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

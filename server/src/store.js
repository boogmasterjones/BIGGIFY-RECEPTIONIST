// Simple in-memory store for the demo. Holds leads (caller + booking + survey
// answers) so the branded dashboard has something to show. Swap this for a real
// database (Supabase / Airtable) when you move past the demo.

import { randomUUID } from 'node:crypto';

const leads = new Map(); // id -> lead, in insertion order

// Supabase is the real store; this map only backs the legacy /dashboard page and
// the survey links we text out. Without a cap it grows for the entire life of
// the process — and this server is meant to stay up for months on a 512 MB
// instance, holding a full transcript per call.
const MAX_LEADS = 500;

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
  // Map iterates in insertion order, so the first key is always the oldest.
  while (leads.size > MAX_LEADS) leads.delete(leads.keys().next().value);
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

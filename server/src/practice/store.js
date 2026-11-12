// Where practice drills live between Hubert's "Sales drilling" tab and the phone line.
//
// One row per drill (table practice_drills, supabase/migrations/014_practice_drills.sql):
//   armed     ready for the next call to 646-3030 (at most one at a time)
//   live      a call is on it right now, or it just ended and is being scored
//   done      finished and scored: Hubert shows the scorecard, transcript and the hidden traits
//   replaced  armed but swapped for another before anyone called
//
// Only this server writes the table (service role). Hubert never touches the receptionist database for this: it asks
// this server through /practice-api/* (api.js) with a shared secret. Without Supabase (local runs, tests) the rows live
// in memory and vanish on restart.

import { randomUUID } from 'node:crypto';
import { serviceDb } from '../supabase.js';

const TABLE = 'practice_drills';

export function memoryStore() {
  const rows = [];
  const now = () => new Date().toISOString();
  const copy = (r) => (r ? structuredClone(r) : null);
  return {
    kind: 'memory',
    async getArmed() {
      return copy(rows.find((r) => r.status === 'armed'));
    },
    async get(id) {
      return copy(rows.find((r) => r.id === id));
    },
    // Insert a new drill. An armed one replaces whatever was armed before.
    async insert(row) {
      if (row.status === 'armed') for (const r of rows) if (r.status === 'armed') { r.status = 'replaced'; r.updated_at = now(); }
      const full = { id: randomUUID(), created_at: now(), updated_at: now(), armed_at: now(), ...row };
      rows.push(full);
      return copy(full);
    },
    async update(id, patch) {
      const r = rows.find((x) => x.id === id);
      if (!r) return null;
      if (patch.status === 'armed') for (const o of rows) if (o.status === 'armed' && o.id !== id) { o.status = 'replaced'; o.updated_at = now(); }
      Object.assign(r, patch, { updated_at: now() });
      return copy(r);
    },
    // Only if it is still armed (two calls at once can't both take it).
    async takeArmed(id, patch) {
      const r = rows.find((x) => x.id === id && x.status === 'armed');
      if (!r) return null;
      Object.assign(r, patch, { updated_at: now() });
      return copy(r);
    },
    async recent({ statuses = ['done', 'live'], limit = 10 } = {}) {
      return rows
        .filter((r) => statuses.includes(r.status))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || rows.indexOf(b) - rows.indexOf(a))
        .slice(0, limit)
        .map(copy);
    },
    _rows: rows,
  };
}

export function supabaseStore(db) {
  const one = async (q) => {
    const { data, error } = await q;
    if (error) throw new Error(`[practice store] ${error.message}`);
    return data ?? null;
  };
  return {
    kind: 'supabase',
    async getArmed() {
      return one(db.from(TABLE).select('*').eq('status', 'armed').order('armed_at', { ascending: false }).limit(1).maybeSingle());
    },
    async get(id) {
      return one(db.from(TABLE).select('*').eq('id', id).maybeSingle());
    },
    async insert(row) {
      // The unique index on status = 'armed' allows only one armed row, so retire the old one first.
      if (row.status === 'armed') await one(db.from(TABLE).update({ status: 'replaced', updated_at: new Date().toISOString() }).eq('status', 'armed'));
      return one(db.from(TABLE).insert(row).select('*').single());
    },
    async update(id, patch) {
      if (patch.status === 'armed') await one(db.from(TABLE).update({ status: 'replaced', updated_at: new Date().toISOString() }).eq('status', 'armed').neq('id', id));
      return one(db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle());
    },
    async takeArmed(id, patch) {
      return one(db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'armed').select('*').maybeSingle());
    },
    async recent({ statuses = ['done', 'live'], limit = 10 } = {}) {
      return (await one(db.from(TABLE).select('*').in('status', statuses).order('created_at', { ascending: false }).limit(limit))) || [];
    },
  };
}

let current = null;
export function drillStore() {
  if (!current) {
    const db = serviceDb();
    current = db ? supabaseStore(db) : memoryStore();
  }
  return current;
}

// Tests swap in a fresh memory store.
export function setDrillStore(store) {
  current = store;
}

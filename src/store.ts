import fs from 'fs';
import path from 'path';
import { StoreData, Warn, TicketData } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadStore(): StoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) return { warnings: {}, tickets: {}, grades: {} };
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  } catch {
    return { warnings: {}, tickets: {}, grades: {} };
  }
}

function saveStore(data: StoreData): void {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

// === WARNINGS ===
export function getWarnings(guildId: string, userId: string): Warn[] {
  const store = loadStore();
  return store.warnings[`${guildId}:${userId}`] || [];
}

export function addWarning(guildId: string, userId: string, warn: Warn): void {
  const store = loadStore();
  const key = `${guildId}:${userId}`;
  if (!store.warnings[key]) store.warnings[key] = [];
  store.warnings[key].push(warn);
  saveStore(store);
}

export function clearWarnings(guildId: string, userId: string): void {
  const store = loadStore();
  delete store.warnings[`${guildId}:${userId}`];
  saveStore(store);
}

// === TICKETS ===
export function createTicket(ticketId: string, data: TicketData): void {
  const store = loadStore();
  store.tickets[ticketId] = data;
  saveStore(store);
}

export function getTicket(ticketId: string): TicketData | null {
  const store = loadStore();
  return store.tickets[ticketId] || null;
}

export function closeTicket(ticketId: string): void {
  const store = loadStore();
  if (store.tickets[ticketId]) {
    store.tickets[ticketId].closed = true;
    saveStore(store);
  }
}

// === GRADES ===
export function setGrade(guildId: string, userId: string, roleId: string): void {
  const store = loadStore();
  store.grades[`${guildId}:${userId}`] = roleId;
  saveStore(store);
}

export function getGrade(guildId: string, userId: string): string | null {
  const store = loadStore();
  return store.grades[`${guildId}:${userId}`] || null;
}

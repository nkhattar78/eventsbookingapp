// Centralized API helper functions for events and bookings
// Adjust BASE_URL if backend server host/port changes
const BASE_URL = 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// Events
export async function getEvents() {
  const res = await fetch(`${BASE_URL}/events`);
  return handleResponse(res);
}

export async function createEvent(data) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateEvent(id, data) {
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteEvent(id) {
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return true;
}

// Bookings (list all bookings for an event requires filter client-side if backend route returns all)
export async function getBookings(eventId) {
  const res = await fetch(`${BASE_URL}/bookings`);
  const all = await handleResponse(res);
  if (eventId) {
    return all.filter(b => String(b.event_id) === String(eventId));
  }
  return all;
}

export async function createBooking(data) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateBooking(id, data) {
  const res = await fetch(`${BASE_URL}/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteBooking(id) {
  const res = await fetch(`${BASE_URL}/bookings/${id}`, {
    method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return true;
}

export default {
  getEvents,
  createEvent,
  getBookings,
  createBooking,
  updateEvent,
  deleteEvent,
  updateBooking,
  deleteBooking
};

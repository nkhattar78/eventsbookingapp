// Centralized API helper functions for events and bookings
// Adjust BASE_URL if backend server host/port changes
const BASE_URL = "http://localhost:8000";

function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// Auth
export async function signup({ name, email, password }) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function login({ email, password }) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

// Events
export async function getEvents() {
  const res = await fetch(`${BASE_URL}/events`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function createEvent(data) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEvent(id, data) {
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEvent(id) {
  const res = await fetch(`${BASE_URL}/events/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return true;
}

// Bookings (list all bookings for an event requires filter client-side if backend route returns all)
export async function getBookings(eventId) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    headers: authHeaders(),
  });
  const all = await handleResponse(res);
  if (eventId) {
    return all.filter((b) => String(b.event_id) === String(eventId));
  }
  return all;
}

export async function createBooking(data) {
  // Ensure we have the user ID from token if not provided
  if (!data.created_by) {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        data.created_by = payload.user_id;
      } catch (e) {
        console.warn("Could not extract user ID from token");
      }
    }
  }

  const res = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateBooking(id, data) {
  const res = await fetch(`${BASE_URL}/bookings/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteBooking(id) {
  const res = await fetch(`${BASE_URL}/bookings/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return true;
}

export default {
  signup,
  login,
  getEvents,
  createEvent,
  getBookings,
  createBooking,
  updateEvent,
  deleteEvent,
  updateBooking,
  deleteBooking,
};

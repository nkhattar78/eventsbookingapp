import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEvents,
  getBookings,
  createBooking,
  deleteEvent,
  deleteBooking,
} from "../api";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Button,
  Avatar,
  Divider,
  TextField,
  Alert,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Cache management functions for event details (only for user role)
  const isCacheValid = (eventId) => {
    if (user?.role !== "user") return false; // No caching for admin

    const cacheKey = `eventDetails_${eventId}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      console.log("EventDetails: No cache found for event", eventId);
      return false;
    }

    try {
      const { timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < 5 * 60 * 1000; // 5 minutes
      console.log("EventDetails: Cache valid for event", eventId, ":", isValid);
      return isValid;
    } catch (e) {
      console.log("EventDetails: Invalid cache data for event", eventId);
      return false;
    }
  };

  const loadFromCache = (eventId) => {
    if (user?.role !== "user") return null;

    const cacheKey = `eventDetails_${eventId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data } = JSON.parse(cached);
        console.log("EventDetails: Loaded event from cache:", eventId);
        return data;
      }
    } catch (e) {
      console.log("EventDetails: Error loading cache for event", eventId, e);
    }
    return null;
  };

  const saveToCache = (eventId, eventData) => {
    if (user?.role !== "user") {
      console.log("EventDetails: Skipping cache save for admin role");
      return;
    }

    const cacheKey = `eventDetails_${eventId}`;
    try {
      const cacheData = {
        data: eventData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log("EventDetails: Saved event to cache:", eventId);
    } catch (e) {
      console.log("EventDetails: Error saving to cache for event", eventId, e);
    }
  };

  const invalidateEventCache = (eventId) => {
    const cacheKey = `eventDetails_${eventId}`;
    localStorage.removeItem(cacheKey);
    console.log("EventDetails: Invalidated cache for event:", eventId);
  };

  // Log image URL whenever event changes
  useEffect(() => {
    if (event) {
      console.log("Event image URL:", event.image_url);
    }
  }, [event]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let ev = null;
        let eventsData = null;

        // Check cache first for user role only
        if (user?.role === "user" && isCacheValid(id)) {
          ev = loadFromCache(id);
          console.log("EventDetails: Using cached event data for user");
        }

        // If no cached data or admin role, fetch from API
        if (!ev) {
          console.log("EventDetails: Fetching fresh event data from API");
          eventsData = await getEvents();
          ev = eventsData.find((e) => String(e.id) === String(id));

          // Cache the data only for user role
          if (ev && user?.role === "user") {
            saveToCache(id, ev);
          }
        }

        // Always fetch fresh bookings data (no caching for bookings on this page)
        const bookingsData = await getBookings(id);

        if (active) {
          setEvent(ev);
          setBookings(bookingsData);

          // Filter bookings for current user
          const currentUserBookings = bookingsData.filter(
            (booking) => String(booking.created_by) === String(user?.id)
          );
          setUserBookings(currentUserBookings);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user?.role]); // Added user?.role as dependency

  const remaining = useMemo(() => {
    if (!event) return 0;
    return event.available_tickets;
  }, [event]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        event_id: id,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        quantity: Number(form.quantity),
        created_by: user?.id, // Include user ID for the created_by field
      };
      const newBooking = await createBooking(payload);

      // Invalidate MyBookings cache since a new booking was created
      if (window.invalidateMyBookingsCache) {
        window.invalidateMyBookingsCache();
        console.log(
          "EventDetails: Invalidated MyBookings cache after booking creation"
        );
      }

      // Invalidate event cache since available tickets changed
      invalidateEventCache(id);

      // Refresh bookings + event available tickets (simplistic: decrement locally)
      setBookings((b) => [newBooking, ...b]);

      // Update user bookings if the new booking belongs to current user
      if (String(newBooking.created_by) === String(user?.id)) {
        setUserBookings((ub) => [newBooking, ...ub]);
      }
      setEvent((ev) =>
        ev
          ? {
              ...ev,
              available_tickets: ev.available_tickets - payload.quantity,
            }
          : ev
      );
      setForm({ customer_name: "", customer_email: "", quantity: 1 });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  if (!event)
    return (
      <Box p={3}>
        <Alert severity="warning">Event not found</Alert>
      </Box>
    );

  return (
    <Box p={3}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h4" gutterBottom>
            {event.title}
          </Typography>
          {isAuthenticated && user?.role === "admin" && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate(`/events/${id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                disabled={deleting}
                onClick={async () => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this event?"
                    )
                  ) {
                    setDeleting(true);
                    try {
                      await deleteEvent(id);

                      // Invalidate event cache since event was deleted
                      invalidateEventCache(id);

                      // Invalidate events list cache since event was deleted
                      if (window.invalidateEventsListCache) {
                        window.invalidateEventsListCache();
                        console.log(
                          "EventDetails: Invalidated events list cache after event deletion"
                        );
                      }

                      navigate("/");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setDeleting(false);
                    }
                  }
                }}
              >
                Delete
              </Button>
            </Stack>
          )}
        </Stack>
        <Box mb={2}>
          <Avatar
            variant="rounded"
            src={
              imageError || !event.image_url
                ? "/placeholder-event.svg"
                : event.image_url
            }
            alt={event.title}
            sx={{
              width: 160,
              height: 160,
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
            }}
            imgProps={{
              onError: () => {
                setImageError(true);
                console.log(
                  "Image failed to load, using placeholder:",
                  event.image_url
                );
              },
              onLoad: () => {
                if (!imageError && event.image_url) {
                  console.log("Image loaded successfully:", event.image_url);
                }
              },
            }}
          />
          {imageError && (
            <Typography variant="caption" color="error">
              Image failed to load, showing placeholder.
            </Typography>
          )}
        </Box>
        <Typography variant="body1" gutterBottom>
          {event.description}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          divider={<Divider flexItem orientation="vertical" />}
        >
          <Typography variant="body2">
            <strong>Date:</strong> {new Date(event.date_time).toLocaleString()}
          </Typography>
          <Typography variant="body2">
            <strong>Location:</strong> {event.location}
          </Typography>
          <Typography variant="body2">
            <strong>Tickets:</strong> {remaining} / {event.total_tickets}
          </Typography>
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        alignItems="flex-start"
      >
        {isAuthenticated && user?.role === "user" && (
          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Create Booking
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  name="customer_name"
                  label="Customer Name"
                  value={form.customer_name}
                  onChange={handleChange}
                  required
                />
                <TextField
                  name="customer_email"
                  label="Customer Email"
                  value={form.customer_email}
                  onChange={handleChange}
                  type="email"
                  required
                />
                <TextField
                  name="quantity"
                  label="Quantity"
                  type="number"
                  value={form.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: remaining }}
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || remaining <= 0}
                >
                  {submitting ? "Booking..." : "Book"}
                </Button>
                {remaining <= 0 && (
                  <Alert severity="info">No tickets remaining.</Alert>
                )}
              </Stack>
            </Box>
          </Paper>
        )}

        {isAuthenticated &&
          user?.role === "user" &&
          userBookings.length > 0 && (
            <Paper sx={{ p: 3, flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                My Bookings for this Event
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Booking Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.customer_name}</TableCell>
                      <TableCell>{booking.customer_email}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${booking.quantity} ticket${
                            booking.quantity > 1 ? "s" : ""
                          }`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {booking.created_at
                            ? new Date(booking.created_at).toLocaleDateString()
                            : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() =>
                              navigate(`/bookings/${booking.id}/edit`)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={async () => {
                              if (window.confirm("Cancel this booking?")) {
                                try {
                                  await deleteBooking(booking.id);

                                  // Invalidate MyBookings cache since a booking was deleted
                                  if (window.invalidateMyBookingsCache) {
                                    window.invalidateMyBookingsCache();
                                    console.log(
                                      "EventDetails: Invalidated MyBookings cache after user booking deletion"
                                    );
                                  }

                                  // Invalidate event cache since available tickets changed
                                  invalidateEventCache(id);

                                  // Update both booking lists
                                  setBookings((bookings) =>
                                    bookings.filter((x) => x.id !== booking.id)
                                  );
                                  setUserBookings((userBookings) =>
                                    userBookings.filter(
                                      (x) => x.id !== booking.id
                                    )
                                  );
                                  // Refresh event data to update available tickets
                                  const eventsData = await getEvents();
                                  const ev = eventsData.find(
                                    (e) => String(e.id) === String(id)
                                  );
                                  if (ev) setEvent(ev);
                                } catch (e) {
                                  setError(e.message);
                                }
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

        {isAuthenticated && user?.role === "admin" && (
          <Paper sx={{ p: 3, flex: 2 }}>
            <Typography variant="h6" gutterBottom>
              Bookings
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.customer_name}</TableCell>
                    <TableCell>{b.customer_email}</TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => navigate(`/bookings/${b.id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={async () => {
                            if (window.confirm("Cancel this booking?")) {
                              try {
                                await deleteBooking(b.id);

                                // Invalidate MyBookings cache since a booking was deleted
                                if (window.invalidateMyBookingsCache) {
                                  window.invalidateMyBookingsCache();
                                  console.log(
                                    "EventDetails: Invalidated MyBookings cache after booking deletion"
                                  );
                                }

                                // Invalidate event cache since available tickets changed
                                invalidateEventCache(id);

                                setBookings((bookings) =>
                                  bookings.filter((x) => x.id !== b.id)
                                );
                                // Also update user bookings if the deleted booking belongs to current user
                                if (String(b.created_by) === String(user?.id)) {
                                  setUserBookings((userBookings) =>
                                    userBookings.filter((x) => x.id !== b.id)
                                  );
                                }
                                // Refresh event data to update available tickets
                                const eventsData = await getEvents();
                                const ev = eventsData.find(
                                  (e) => String(e.id) === String(id)
                                );
                                if (ev) setEvent(ev);
                              } catch (e) {
                                setError(e.message);
                              }
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No bookings yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

export default EventDetailsPage;

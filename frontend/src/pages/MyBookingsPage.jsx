import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookings, getEvents, deleteBooking } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Avatar,
  Divider,
} from "@mui/material";

function MyBookingsPage({ search = "" }) {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cache keys
  const CACHE_KEYS = {
    bookings: `myBookings_${user?.id}`,
    events: `events_${user?.id}`,
    timestamp: `myBookings_timestamp_${user?.id}`,
  };

  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  // Function to check if cache is valid
  const isCacheValid = () => {
    const timestamp = localStorage.getItem(CACHE_KEYS.timestamp);
    if (!timestamp) {
      console.log("MyBookings: No cache timestamp found");
      return false;
    }

    const isValid = Date.now() - parseInt(timestamp) < CACHE_EXPIRY;
    console.log(
      `MyBookings: Cache ${isValid ? "valid" : "expired"} (age: ${Math.round(
        (Date.now() - parseInt(timestamp)) / 1000
      )}s)`
    );
    return isValid;
  };

  // Function to load data from cache
  const loadFromCache = () => {
    try {
      const cachedBookings = localStorage.getItem(CACHE_KEYS.bookings);
      const cachedEvents = localStorage.getItem(CACHE_KEYS.events);

      if (cachedBookings && cachedEvents) {
        const bookingsData = JSON.parse(cachedBookings);
        const eventsData = JSON.parse(cachedEvents);

        console.log(
          `MyBookings: Loaded from cache - ${bookingsData.length} bookings, ${eventsData.length} events`
        );

        setBookings(bookingsData);
        setEvents(eventsData);
        return true;
      }
    } catch (e) {
      console.error("MyBookings: Error loading from cache:", e);
      // Clear corrupted cache
      invalidateCache();
    }
    return false;
  };

  // Function to save data to cache
  const saveToCache = (bookingsData, eventsData) => {
    try {
      localStorage.setItem(CACHE_KEYS.bookings, JSON.stringify(bookingsData));
      localStorage.setItem(CACHE_KEYS.events, JSON.stringify(eventsData));
      localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString());

      console.log(
        `MyBookings: Saved to cache - ${bookingsData.length} bookings, ${eventsData.length} events`
      );
    } catch (e) {
      console.error("MyBookings: Error saving to cache:", e);
    }
  };

  // Function to invalidate cache
  const invalidateCache = () => {
    localStorage.removeItem(CACHE_KEYS.bookings);
    localStorage.removeItem(CACHE_KEYS.events);
    localStorage.removeItem(CACHE_KEYS.timestamp);
    console.log("MyBookings: Cache invalidated");
  };

  // Export cache invalidation function for use in other components
  window.invalidateMyBookingsCache = invalidateCache;

  useEffect(() => {
    let active = true;

    (async () => {
      console.log("MyBookings: Starting data load process");

      try {
        // Check if we can use cached data
        if (isCacheValid() && loadFromCache()) {
          console.log("MyBookings: Using cached data");
          if (active) setLoading(false);
          return;
        }

        console.log("MyBookings: Fetching fresh data from API");
        const [bookingsData, eventsData] = await Promise.all([
          getBookings(),
          getEvents(),
        ]);

        if (active) {
          // Filter bookings for current user by user ID
          const userBookings = bookingsData.filter(
            (booking) => String(booking.created_by) === String(user?.id)
          );

          console.log(
            `MyBookings: API returned ${bookingsData.length} total bookings, ${userBookings.length} for current user`
          );

          setBookings(userBookings);
          setEvents(eventsData);

          // Save to cache
          saveToCache(userBookings, eventsData);
        }
      } catch (e) {
        console.error("MyBookings: Error fetching data:", e);
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const getEventById = (eventId) => {
    return events.find((event) => String(event.id) === String(eventId));
  };

  const handleCancelBooking = async (bookingId, eventId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        console.log(`MyBookings: Cancelling booking ${bookingId}`);
        await deleteBooking(bookingId);

        // Update local state
        setBookings((prevBookings) =>
          prevBookings.filter((booking) => booking.id !== bookingId)
        );

        // Invalidate cache since booking was cancelled
        invalidateCache();

        // Optionally refresh events to update available tickets
        const eventsData = await getEvents();
        setEvents(eventsData);

        console.log(`MyBookings: Successfully cancelled booking ${bookingId}`);
      } catch (e) {
        console.error("MyBookings: Error cancelling booking:", e);
        setError(e.message);
      }
    }
  };

  // Filter bookings based on search
  const filteredBookings = bookings.filter((booking) => {
    if (!search) return true;

    const event = getEventById(booking.event_id);
    const query = search.toLowerCase();

    return (
      booking.customer_name?.toLowerCase().includes(query) ||
      booking.customer_email?.toLowerCase().includes(query) ||
      event?.title?.toLowerCase().includes(query) ||
      event?.location?.toLowerCase().includes(query) ||
      event?.category?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        My Bookings
      </Typography>

      {search && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing {filteredBookings.length} of {bookings.length} bookings
          matching "{search}"
        </Alert>
      )}

      {filteredBookings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {search
              ? "No bookings found matching your search"
              : "No bookings found"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {search
              ? "Try adjusting your search criteria."
              : "You haven't made any bookings yet."}
          </Typography>
          <Button variant="contained" onClick={() => navigate("/")}>
            Browse Events
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.map((booking) => {
                const event = getEventById(booking.event_id);
                const eventDate = event ? new Date(event.date_time) : null;
                const isUpcoming = eventDate ? eventDate > new Date() : false;

                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          variant="rounded"
                          src={event?.image_url || "/placeholder-event.svg"}
                          alt={event?.title || "Event"}
                          sx={{ width: 40, height: 40 }}
                        />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {event?.title || "Unknown Event"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {booking.event_id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {eventDate ? (
                        <Typography variant="body2">
                          {eventDate.toLocaleDateString()}
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {eventDate.toLocaleTimeString()}
                          </Typography>
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Date not available
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event?.location || "Location not available"}
                      </Typography>
                    </TableCell>
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
                      <Chip
                        label={isUpcoming ? "Upcoming" : "Past"}
                        size="small"
                        color={isUpcoming ? "success" : "default"}
                        variant={isUpcoming ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(`/events/${booking.event_id}`)
                          }
                        >
                          View Event
                        </Button>
                        {isUpcoming && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              handleCancelBooking(booking.id, booking.event_id)
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

export default MyBookingsPage;

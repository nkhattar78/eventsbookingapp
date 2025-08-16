import { useEffect, useState } from "react";
import { getEvents } from "../api";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Stack,
  Chip,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function EventsListPage({ search = "" }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("eventCategories");
    return saved ? JSON.parse(saved) : ["Comedy", "Drama", "Music"];
  });
  const { isAuthenticated, user } = useAuth();

  // Cache management functions for events list (only for user role)
  const isCacheValid = () => {
    if (user?.role !== "user") return false; // No caching for admin

    const cached = localStorage.getItem("eventsList");
    if (!cached) {
      console.log("EventsList: No cache found");
      return false;
    }

    try {
      const { timestamp } = JSON.parse(cached);
      const isValid = Date.now() - timestamp < 5 * 60 * 1000; // 5 minutes
      console.log("EventsList: Cache valid:", isValid);
      return isValid;
    } catch (e) {
      console.log("EventsList: Invalid cache data");
      return false;
    }
  };

  const loadFromCache = () => {
    if (user?.role !== "user") return null;

    try {
      const cached = localStorage.getItem("eventsList");
      if (cached) {
        const { data } = JSON.parse(cached);
        console.log(
          "EventsList: Loaded events from cache, count:",
          data.length
        );
        return data;
      }
    } catch (e) {
      console.log("EventsList: Error loading cache", e);
    }
    return null;
  };

  const saveToCache = (eventsData) => {
    if (user?.role !== "user") {
      console.log("EventsList: Skipping cache save for admin role");
      return;
    }

    try {
      const cacheData = {
        data: eventsData,
        timestamp: Date.now(),
      };
      localStorage.setItem("eventsList", JSON.stringify(cacheData));
      console.log(
        "EventsList: Saved events to cache, count:",
        eventsData.length
      );
    } catch (e) {
      console.log("EventsList: Error saving to cache", e);
    }
  };

  const invalidateEventsListCache = () => {
    localStorage.removeItem("eventsList");
    console.log("EventsList: Invalidated events list cache");
  };

  // Expose cache invalidation globally for other components
  useEffect(() => {
    window.invalidateEventsListCache = invalidateEventsListCache;
    return () => {
      delete window.invalidateEventsListCache;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let data = null;

        // Check cache first for user role only
        if (user?.role === "user" && isCacheValid()) {
          data = loadFromCache();
          console.log("EventsList: Using cached events data for user");
        }

        // If no cached data or admin role, fetch from API
        if (!data) {
          console.log("EventsList: Fetching fresh events data from API");
          data = await getEvents();

          // Cache the data only for user role
          if (data && user?.role === "user") {
            saveToCache(data);
          }
        }

        if (active) setEvents(data || []);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.role]); // Added user?.role as dependency

  const filteredEvents = events.filter((ev) => {
    const query = search.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(query) ||
      ev.category?.toLowerCase().includes(query)
    );
  });

  return (
    <Box p={3}>
      {search && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing {filteredEvents.length} of {events.length} events matching "
          {search}"
        </Alert>
      )}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        {isAuthenticated && user?.role === "admin" && (
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/events/new"
          >
            Add Event
          </Button>
        )}
      </Stack>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <Grid container spacing={3}>
          {filteredEvents.map((ev) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={ev.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                }}
                onClick={() => (window.location.href = `/events/${ev.id}`)}
              >
                <CardMedia
                  component="img"
                  height="160"
                  image={ev.image_url || "/placeholder-event.svg"}
                  alt={ev.title}
                  onError={(e) => {
                    e.target.src = "/placeholder-event.svg";
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Typography variant="h6" noWrap>
                      {ev.title}
                    </Typography>
                    {ev.category && (
                      <Chip label={ev.category} size="small" color="info" />
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {ev.description}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong>{" "}
                    {new Date(ev.date_time).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Location:</strong> {ev.location}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tickets:</strong> {ev.available_tickets} /{" "}
                    {ev.total_tickets}
                  </Typography>
                </CardContent>
                <CardActions>
                  {isAuthenticated && user?.role === "admin" && (
                    <>
                      <Button
                        size="small"
                        component={RouterLink}
                        to={`/events/${ev.id}/edit`}
                      >
                        Edit
                      </Button>
                      <Button size="small" color="error">
                        Delete
                      </Button>
                    </>
                  )}
                  {isAuthenticated && user?.role === "user" && (
                    <Button
                      size="small"
                      variant="contained"
                      component={RouterLink}
                      to={`/events/${ev.id}`}
                    >
                      Book
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
          {filteredEvents.length === 0 && (
            <Grid item xs={12}>
              <Typography align="center">No events yet</Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}

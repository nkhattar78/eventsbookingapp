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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getEvents();
        if (active) setEvents(data);
      } catch (e) {
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

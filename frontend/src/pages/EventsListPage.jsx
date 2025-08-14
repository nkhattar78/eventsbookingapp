import { useEffect, useState } from 'react';
import { getEvents } from '../api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function EventsListPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return () => { active = false; };
  }, []);

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Events</Typography>
        <Button variant="contained" component={RouterLink} to="/events/new">Create Event</Button>
      </Stack>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Date/Time</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Available</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(ev => (
                <TableRow key={ev.id} hover>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell>{new Date(ev.date_time).toLocaleString()}</TableCell>
                  <TableCell>{ev.location}</TableCell>
                  <TableCell>{ev.available_tickets} / {ev.total_tickets}</TableCell>
                  <TableCell>
                    <Button size="small" component={RouterLink} to={`/events/${ev.id}`}>Details</Button>
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No events yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

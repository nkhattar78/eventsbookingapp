import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import EventsListPage from './pages/EventsListPage';
import EventCreatePage from './pages/EventCreatePage';
import EventDetailsPage from './pages/EventDetailsPage';
import EventEditPage from './pages/EventEditPage';
import BookingEditPage from './pages/BookingEditPage';
import { AppBar, Toolbar, Typography, Container, Button, Stack, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import './App.css';

function App() {
  const [search, setSearch] = useState('');

  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
            Event Booking
          </Typography>
          <TextField
            placeholder="Search events by title or category"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 260, bgcolor: 'background.paper', borderRadius: 1, mr: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/">Events</Button>
            <Button color="inherit" component={Link} to="/events/new">Create Event</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        <Routes>
          <Route path="/" element={<EventsListPage search={search} />} />
          <Route path="/events/new" element={<EventCreatePage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/events/:id/edit" element={<EventEditPage />} />
          <Route path="/bookings/:id/edit" element={<BookingEditPage />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
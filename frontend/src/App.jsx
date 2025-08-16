import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useRef, useCallback, useMemo, useState } from "react";
import EventsListPage from "./pages/EventsListPage";
import EventCreatePage from "./pages/EventCreatePage";
import EventDetailsPage from "./pages/EventDetailsPage";
import EventEditPage from "./pages/EventEditPage";
import BookingEditPage from "./pages/BookingEditPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import "./App.css";

function AppContent({ searchInputRef }) {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Simple local state for search
  const [search, setSearch] = useState("");

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearch(value);
  }, []);

  // Clear search when route changes
  const currentPath = location.pathname;
  const prevPathRef = useRef(currentPath);

  if (prevPathRef.current !== currentPath) {
    prevPathRef.current = currentPath;
    setSearch("");
  }

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            style={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}
          >
            Event Booking
          </Typography>
          <TextField
            inputRef={searchInputRef}
            placeholder="Search events by title or category"
            value={search}
            onChange={handleSearchChange}
            size="small"
            autoComplete="off"
            sx={{
              minWidth: 260,
              bgcolor: "background.paper",
              borderRadius: 1,
              mr: 2,
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            {isAuthenticated && user?.role === "user" && (
              <Button color="inherit" component={Link} to="/my-bookings">
                My Bookings
              </Button>
            )}
            {isAuthenticated && user?.role === "admin" && (
              <Button color="inherit" component={Link} to="/events/new">
                Create Event
              </Button>
            )}
            {isAuthenticated && user?.name && (
              <Typography
                variant="body1"
                fontWeight={600}
                color="inherit"
                sx={{ ml: 2 }}
              >
                {user.name}
              </Typography>
            )}
            {!isAuthenticated && (
              <>
                <Button color="inherit" component={Link} to="/signup">
                  Sign Up
                </Button>
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
              </>
            )}
            {isAuthenticated && (
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 10, mb: 4 }}>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <EventsListPage search={search} />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/my-bookings"
            element={
              <PrivateRoute requiredRole="user">
                <MyBookingsPage search={search} />
              </PrivateRoute>
            }
          />
          <Route
            path="/events/new"
            element={
              <PrivateRoute requiredRole="admin">
                <EventCreatePage />
              </PrivateRoute>
            }
          />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route
            path="/events/:id/edit"
            element={
              <PrivateRoute requiredRole="admin">
                <EventEditPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/bookings/:id/edit"
            element={
              <PrivateRoute>
                <BookingEditPage />
              </PrivateRoute>
            }
          />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Container>
    </>
  );
}

function App() {
  const searchInputRef = useRef(null);

  const memoizedProps = useMemo(
    () => ({
      searchInputRef,
    }),
    []
  );

  return (
    <AuthProvider>
      <Router>
        <AppContent {...memoizedProps} />
      </Router>
    </AuthProvider>
  );
}

export default App;

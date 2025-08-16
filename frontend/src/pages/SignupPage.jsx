import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { signup } from "../api";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Avatar,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

const SignupPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await signup({ name, email, password });
      login(data.token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box
      minHeight="80vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="#f5f6fa"
    >
      <Paper
        elevation={4}
        sx={{ p: 4, maxWidth: 400, width: "100%", borderRadius: 3 }}
      >
        <Stack alignItems="center" spacing={2} mb={2}>
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
            <PersonAddIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" fontWeight={600}>
            Sign Up
          </Typography>
        </Stack>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ mt: 1 }}
            >
              Sign Up
            </Button>
          </Stack>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Typography align="center" mt={3}>
          Already have an account?{" "}
          <Button component={Link} to="/login" size="small">
            Login
          </Button>
        </Typography>
      </Paper>
    </Box>
  );
};

export default SignupPage;

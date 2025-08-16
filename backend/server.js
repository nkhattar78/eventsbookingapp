const express = require("express");
const cors = require("cors");
require("dotenv").config();
const router = express.Router();

const eventsRoutes = require("./routes/events");
const bookingsRoutes = require("./routes/bookings");
const authRoutes = require("./routes/auth");

const app = express();

// Body parsing (Express has built-in json + urlencoded)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Middleware
app.use(cors());

// Routes
app.use("/auth", authRoutes);
app.use("/events", eventsRoutes);
app.use("/bookings", bookingsRoutes);

// Hello API
app.get("/hello", async (req, res) => {
  console.log("App working on port", PORT);
  res.send("Its Event Booking App");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

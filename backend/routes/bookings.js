const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get all bookings
router.get("/", async (req, res) => {
  console.log("Get booking API called");
  try {
    const result = await pool.query(
      "SELECT * FROM bookings ORDER BY booking_time DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Create a booking (with availability check and created_by)
router.post("/", async (req, res) => {
  console.log("Create booking API called");
  const { event_id, customer_name, customer_email, quantity, created_by } =
    req.body || {};
  console.log("Booking create received:", req.body);
  if (
    !event_id ||
    !customer_name ||
    !customer_email ||
    !quantity ||
    !created_by
  ) {
    return res.status(400).json({
      error:
        "event_id, customer_name, customer_email, quantity, created_by required",
    });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: "quantity must be > 0" });
  }
  try {
    await pool.query("BEGIN");
    const eventRes = await pool.query(
      "SELECT available_tickets FROM events WHERE id=$1 FOR UPDATE",
      [event_id]
    );
    if (eventRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Event not found" });
    }
    if (eventRes.rows[0].available_tickets < quantity) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough tickets available" });
    }
    await pool.query(
      "UPDATE events SET available_tickets = available_tickets - $1 WHERE id = $2",
      [quantity, event_id]
    );
    const result = await pool.query(
      `INSERT INTO bookings (event_id, customer_name, customer_email, quantity, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_id, customer_name, customer_email, quantity, created_by]
    );
    await pool.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Update a booking (supports quantity, customer_name, customer_email)
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { quantity, customer_name, customer_email } = req.body || {};
  if (quantity !== undefined && quantity <= 0) {
    return res.status(400).json({ error: "quantity must be > 0" });
  }
  try {
    await pool.query("BEGIN");
    const bookingRes = await pool.query(
      "SELECT * FROM bookings WHERE id=$1 FOR UPDATE",
      [id]
    );
    if (bookingRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRes.rows[0];
    let newQuantity = booking.quantity;
    if (quantity !== undefined && quantity !== booking.quantity) {
      const delta = quantity - booking.quantity;
      // Lock event row
      const eventRes = await pool.query(
        "SELECT available_tickets FROM events WHERE id=$1 FOR UPDATE",
        [booking.event_id]
      );
      if (eventRes.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({ error: "Event not found for booking" });
      }
      const available = eventRes.rows[0].available_tickets;
      if (delta > 0) {
        // requesting more tickets
        if (available < delta) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            error: "Not enough tickets available for increase",
            available,
            requested_extra: delta,
          });
        }
        await pool.query(
          "UPDATE events SET available_tickets = available_tickets - $1 WHERE id=$2",
          [delta, booking.event_id]
        );
      } else if (delta < 0) {
        // releasing tickets
        await pool.query(
          "UPDATE events SET available_tickets = available_tickets + $1 WHERE id=$2",
          [-delta, booking.event_id]
        );
      }
      newQuantity = quantity;
    }
    const updated = await pool.query(
      `UPDATE bookings SET customer_name=$1, customer_email=$2, quantity=$3
       WHERE id=$4 RETURNING *`,
      [
        customer_name !== undefined ? customer_name : booking.customer_name,
        customer_email !== undefined ? customer_email : booking.customer_email,
        newQuantity,
        id,
      ]
    );
    await pool.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete (cancel) a booking
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("BEGIN");
    const bookingRes = await pool.query(
      "SELECT * FROM bookings WHERE id=$1 FOR UPDATE",
      [id]
    );
    if (bookingRes.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRes.rows[0];
    await pool.query(
      "UPDATE events SET available_tickets = available_tickets + $1 WHERE id=$2",
      [booking.quantity, booking.event_id]
    );
    await pool.query("DELETE FROM bookings WHERE id=$1", [id]);
    await pool.query("COMMIT");
    res.status(204).send();
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

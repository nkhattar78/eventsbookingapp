import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBookings, updateBooking } from "../api";
export default function BookingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const bookings = await getBookings();
        const bk = bookings.find((b) => String(b.id) === String(id));
        if (!bk) throw new Error("Booking not found");
        setForm(bk);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        quantity: Number(form.quantity),
      };
      await updateBooking(id, payload);
      navigate(-1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <Box p={3}>
        <Typography>Loading...</Typography>
      </Box>
    );
  if (error)
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  if (!form) return null;

  // Only allow users to edit their own booking, or admins to edit any booking
  if (
    !isAuthenticated ||
    (user?.role === "user" && user?.id !== form.created_by)
  ) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You are not authorized to edit this booking.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={500} mx="auto">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" mb={2}>
          Edit Booking
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Customer Name"
              name="customer_name"
              value={form.customer_name}
              onChange={handleChange}
              required
            />
            <TextField
              label="Customer Email"
              name="customer_email"
              value={form.customer_email}
              onChange={handleChange}
              type="email"
              required
            />
            <TextField
              label="Quantity"
              name="quantity"
              type="number"
              value={form.quantity}
              onChange={handleChange}
              required
            />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? "Saving..." : "Update"}
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

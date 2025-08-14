import { useState } from 'react';
import { createEvent } from '../api';
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function EventCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    date_time: '',
    location: '',
    image_url: '',
    total_tickets: 0
  });
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'file'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'image_url') {
      setPreview(value);
    }
  }

  function handleImageMode(_, val) {
    if (val) setImageMode(val);
    // reset when switching
    setFile(null);
    if (val === 'file') {
      setPreview('');
      setForm(f => ({ ...f, image_url: '' }));
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(f);
    } else {
      setFile(null);
      setPreview('');
    }
  }

  async function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let imageValue = form.image_url;
      if (imageMode === 'file' && file) {
        imageValue = await fileToBase64(file);
      }
      const payload = { ...form, image_url: imageValue, total_tickets: Number(form.total_tickets) };
      await createEvent(payload);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box p={3} maxWidth={700} mx="auto">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" mb={2}>Create Event</Typography>
        {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <TextField label="Title" name="title" value={form.title} onChange={handleChange} required />
            <TextField label="Description" name="description" value={form.description} onChange={handleChange} multiline rows={3} />
            <TextField label="Date/Time" name="date_time" type="datetime-local" value={form.date_time} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
            <TextField label="Location" name="location" value={form.location} onChange={handleChange} required />

            <Stack spacing={1}>
              <Typography variant="subtitle2">Event Image</Typography>
              <ToggleButtonGroup exclusive size="small" value={imageMode} onChange={handleImageMode}>
                <ToggleButton value="url">URL</ToggleButton>
                <ToggleButton value="file">Upload</ToggleButton>
              </ToggleButtonGroup>
              {imageMode === 'url' && (
                <TextField label="Image URL" name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
              )}
              {imageMode === 'file' && (
                <Button variant="outlined" component="label">
                  {file ? 'Change File' : 'Select Image File'}
                  <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                </Button>
              )}
              {preview && (
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar variant="rounded" src={preview} alt="preview" sx={{ width: 80, height: 80 }} />
                  <Typography variant="caption" sx={{ wordBreak:'break-all' }}>{imageMode === 'url' ? preview : file?.name}</Typography>
                </Stack>
              )}
            </Stack>

            <TextField label="Total Tickets" name="total_tickets" type="number" value={form.total_tickets} onChange={handleChange} required />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Saving...' : 'Create'}</Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

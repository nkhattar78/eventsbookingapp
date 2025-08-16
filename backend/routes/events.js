const express = require("express");
const router = express.Router();
const pool = require("../db");
const supabase = require("../supabase");
const { randomUUID } = require("crypto");
const { authRequired, adminOnly } = require("../middleware/auth");

async function uploadImagePublic(imageInput) {
  if (!imageInput) return null;
  // If already a Supabase storage URL, return as-is
  if (/^https?:\/\//i.test(imageInput) && imageInput.includes(".supabase.co"))
    return imageInput;
  // Accept data URI or base64
  let buffer;
  let ext = "png";
  if (imageInput.startsWith("data:image/")) {
    const m = imageInput.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!m) return null;
    ext = m[1].toLowerCase();
    buffer = Buffer.from(m[2], "base64");
  } else if (/^[A-Za-z0-9+/=]+$/.test(imageInput) && imageInput.length > 100) {
    buffer = Buffer.from(imageInput, "base64");
  } else {
    return null; // unsupported format (not remote fetch to avoid SSRF)
  }
  const bucket = "EventsImages";
  const fileName = `events/${randomUUID()}.${ext}`;
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, { contentType: `image/${ext}` });
    if (error) {
      console.error("supabase upload error", error.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (e) {
    console.error("supabase upload exception", e.message);
    return null;
  }
}

function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  const idx = publicUrl.indexOf("/object/public/");
  if (idx === -1) return null;
  return publicUrl.substring(idx + "/object/public/".length);
}

// Get all events (auth required)
router.get("/", authRequired, async (_req, res) => {
  console.log("Get event API called");
  try {
    const result = await pool.query(
      "SELECT * FROM events ORDER BY date_time ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Create (admin only, sets created_by)
router.post("/", authRequired, adminOnly, async (req, res) => {
  const {
    title,
    description,
    date_time,
    location,
    image_url,
    total_tickets,
    category,
  } = req.body || {};
  if (!title || !date_time || !total_tickets) {
    return res
      .status(400)
      .json({ error: "title, date_time, total_tickets required" });
  }
  const storedUrl = await uploadImagePublic(image_url);
  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, date_time, location, image_url, total_tickets, available_tickets, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING *`,
      [
        title,
        description || null,
        date_time,
        location || null,
        storedUrl,
        total_tickets,
        category || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Update (admin only)
router.put("/:id", authRequired, adminOnly, async (req, res) => {
  const id = req.params.id;
  const {
    title,
    description,
    date_time,
    location,
    image_url,
    total_tickets,
    available_tickets,
    category,
  } = req.body || {};
  try {
    const existing = await pool.query("SELECT * FROM events WHERE id=$1", [id]);
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Event not found" });
    let newImageUrl = existing.rows[0].image_url;
    if (image_url !== undefined) {
      if (image_url === null || image_url === "") {
        newImageUrl = null;
      } else if (image_url !== existing.rows[0].image_url) {
        newImageUrl =
          (await uploadImagePublic(image_url)) || existing.rows[0].image_url;
      }
    }
    const updated = await pool.query(
      `UPDATE events SET title=$1, description=$2, date_time=$3, location=$4, image_url=$5, total_tickets=$6, available_tickets=$7, category=$8
       WHERE id=$9 RETURNING *`,
      [
        title !== undefined ? title : existing.rows[0].title,
        description !== undefined ? description : existing.rows[0].description,
        date_time !== undefined ? date_time : existing.rows[0].date_time,
        location !== undefined ? location : existing.rows[0].location,
        newImageUrl,
        total_tickets !== undefined
          ? total_tickets
          : existing.rows[0].total_tickets,
        available_tickets !== undefined
          ? available_tickets
          : existing.rows[0].available_tickets,
        category !== undefined ? category : existing.rows[0].category,
        id,
      ]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete (admin only)
router.delete("/:id", authRequired, adminOnly, async (req, res) => {
  const id = req.params.id;
  try {
    const existing = await pool.query("SELECT * FROM events WHERE id=$1", [id]);
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Event not found" });
    await pool.query("DELETE FROM events WHERE id=$1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../db");
const supabase = require("../supabase");
const { randomUUID } = require("crypto");
const { authRequired, adminOnly } = require("../middleware/auth");
const { cache } = require("../redis");

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

// Get all events (auth required) - with caching
router.get("/", authRequired, async (req, res) => {
  const cacheKey = "events:all";
  console.log("🔍 Get events API called");

  try {
    // Try to get from cache first
    const cachedEvents = await cache.get(cacheKey);

    // Code to use or not use cache
    if (cachedEvents) {
      //if (!cachedEvents) {
      console.log("✅ Events served from Redis cache");
      return res.json(cachedEvents);
    }

    console.log("🔄 Cache miss - fetching events from database");
    const result = await pool.query(
      "SELECT * FROM events ORDER BY date_time ASC"
    );

    // Cache the result for 5 minutes (300 seconds)
    await cache.set(cacheKey, result.rows, 300);
    console.log("💾 Events cached in Redis for 5 minutes");

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Create (admin only, sets created_by) - invalidates cache
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

    // Invalidate events cache when new event is created
    await cache.delPattern("events:*");
    console.log("🗑️ Events cache invalidated due to new event creation");

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

    // Invalidate caches when event is updated
    await cache.delPattern("events:*");
    await cache.del(`event:${id}`);
    console.log(`🗑️ Event ${id} cache invalidated due to update`);

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete (admin only) - invalidates cache
router.delete("/:id", authRequired, adminOnly, async (req, res) => {
  const id = req.params.id;
  try {
    const existing = await pool.query("SELECT * FROM events WHERE id=$1", [id]);
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Event not found" });
    await pool.query("DELETE FROM events WHERE id=$1", [id]);

    // Invalidate caches when event is deleted
    await cache.delPattern("events:*");
    await cache.del(`event:${id}`);
    console.log("🗑️ Events cache invalidated due to event deletion");

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single event by ID with view tracking
router.get("/:id", authRequired, async (req, res) => {
  const id = req.params.id;
  const cacheKey = `event:${id}`;
  const viewCountKey = `event:views:${id}`;
  const topEventsKey = "events:top";

  console.log(`🔍 Get event ${id} details called`);

  try {
    // Try to get from cache first
    const cachedEvent = await cache.get(cacheKey);
    if (cachedEvent) {
      console.log(`✅ Event ${id} served from Redis cache`);

      // Increment view count and update top events
      const viewCount = await cache.incr(viewCountKey);
      await cache.zadd(topEventsKey, viewCount, id);
      console.log(`📊 Event ${id} view count: ${viewCount}`);

      return res.json(cachedEvent);
    }

    console.log(`🔄 Cache miss - fetching event ${id} from database`);
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = result.rows[0];

    // Cache the event for 5 minutes
    await cache.set(cacheKey, event, 300);
    console.log(`💾 Event ${id} cached in Redis for 5 minutes`);

    // Increment view count and update top events
    const viewCount = await cache.incr(viewCountKey);
    await cache.zadd(topEventsKey, viewCount, id);
    console.log(`📊 Event ${id} view count: ${viewCount}`);

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get top 5 events based on view count
router.get("/analytics/top", authRequired, async (req, res) => {
  const topEventsKey = "events:top";
  const cacheKey = "events:top5:data";

  console.log("🔍 Get top 5 events called");

  try {
    // Try to get cached top 5 events data first
    const cachedTop5 = await cache.get(cacheKey);
    if (cachedTop5) {
      console.log("✅ Top 5 events served from Redis cache");
      return res.json(cachedTop5);
    }

    console.log("🔄 Cache miss - building top 5 events from view counts");

    // Get top 5 event IDs with their view counts
    const topEventIds = await cache.zrevrange(topEventsKey, 0, 4);

    if (topEventIds.length === 0) {
      return res.json([]);
    }

    // Parse the results (Redis returns [id, score, id, score, ...])
    const eventData = [];
    for (let i = 0; i < topEventIds.length; i += 2) {
      const eventId = topEventIds[i];
      const viewCount = parseInt(topEventIds[i + 1]);

      // Get event details from database
      const result = await pool.query("SELECT * FROM events WHERE id = $1", [
        eventId,
      ]);
      if (result.rows.length > 0) {
        eventData.push({
          ...result.rows[0],
          view_count: viewCount,
        });
      }
    }

    // Cache the top 5 events data for 2 minutes
    await cache.set(cacheKey, eventData, 120);
    console.log("💾 Top 5 events cached in Redis for 2 minutes");

    res.json(eventData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

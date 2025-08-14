// test-db-connection.js
require("dotenv").config();
const { Client } = require("pg");

async function testConnection() {
  console.log("Function sarts");
  const client = new Client({
    host: process.env.PGHOST, // Hostname (for SSL verification)
    hostaddr: process.env.PGHOSTADDR || undefined, // Direct IPv4 address (optional)
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Connected to Supabase DB successfully!");

    const res = await client.query("SELECT NOW()");
    console.log("📅 Database time:", res.rows[0].now);
  } catch (err) {
    if (err.code === "ENOTFOUND") {
      console.error(
        "❌ DNS lookup failed! Try setting PGHOSTADDR to IPv4 in .env"
      );
    } else if (err.code === "ECONNREFUSED") {
      console.error(
        "❌ Connection refused — check if your network blocks port 5432"
      );
    } else {
      console.error("❌ Connection failed:", err);
    }
  } finally {
    await client.end();
  }
}

testConnection();

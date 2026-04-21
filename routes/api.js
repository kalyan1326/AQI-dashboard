const express = require("express");
const axios = require("axios");
const router = express.Router();

// 🌫️ AQI LOGIC
function getAQI(pm) {
  if (pm <= 50) return { level: "Good", color: "#22c55e" };
  if (pm <= 100) return { level: "Moderate", color: "#facc15" };
  if (pm <= 150) return { level: "Unhealthy", color: "#f97316" };
  return { level: "Hazardous", color: "#ef4444" };
}

const CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID;
const READ_API_KEY = process.env.THINGSPEAK_API_KEY;

// 📊 DATA ROUTE
router.get("/data", async (req, res) => {
  try {

    const url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=30`;

    const response = await axios.get(url);
    const feeds = response.data.feeds;

    if (!feeds || feeds.length === 0) {
      return res.status(400).json({ error: "No data from ThingSpeak" });
    }

    const latest = feeds[feeds.length - 1];

    const data = {
      pm25: Number(latest.field1) || 0,
      gas: Number(latest.field2) || 0,
      temp: Number(latest.field3) || 0,
      hum: Number(latest.field4) || 0
    };

    const aqi = getAQI(data.pm25);

    res.json({
      data,
      feeds,
      aqi
    });

  } catch (err) {
    console.log("ERROR:", err.message);
    res.status(500).json({ error: "API failed" });
  }
});

module.exports = router;
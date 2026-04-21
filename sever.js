
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// VIEW ENGINE
app.set('view engine', 'ejs');
app.use(express.static('public'));

// ✅ CONNECT API ROUTES (IMPORTANT)
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// 🔐 TWILIO
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ⏱️ Prevent spam
let lastAlertTime = 0;
let lastAQI = null;

// 📩 SEND SMS
async function sendSMS(message) {
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: process.env.MY_PHONE
    });
    console.log("✅ SMS sent");
  } catch (err) {
    console.log("❌ SMS error:", err.message);
  }
}

// 🌫️ AQI LOGIC
function getAQI(pm) {
  if (pm <= 50) return { level: "Good", color: "#22c55e" };
  if (pm <= 100) return { level: "Moderate", color: "#facc15" };
  if (pm <= 150) return { level: "Unhealthy", color: "#f97316" };
  return { level: "Hazardous", color: "#ef4444" };
}



// 🔥 FETCH DATA
async function getData() {
  const url = `https://api.thingspeak.com/channels/${process.env.THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${process.env.THINGSPEAK_API_KEY}&results=20`;

  const response = await axios.get(url);
  const feeds = response.data.feeds;
  const latest = feeds[feeds.length - 1];

  return {
    data: {
      pm25: Number(latest.field1) || 0,
      gas: Number(latest.field2) || 0,
      temp: Number(latest.field3) || 0,
      humidity: Number(latest.field4) || 0
    },
    chartData: feeds.map(f => Number(f.field1) || 0)
  };
}

// 🌐 DASHBOARD ROUTE
app.get('/', async (req, res) => {
  try {
    const result = await getData();
    const pm = result.data.pm25;
    const aqi = getAQI(pm);
    const now = Date.now();

    // 🚨 SMS ALERT
    if (
      pm > 150 &&
      (now - lastAlertTime > 5 * 60 * 1000) &&
      pm !== lastAQI
    ) {
      await sendSMS(
        `🚨 ALERT!\nAQI: ${pm} (${aqi.level})\nTemp: ${result.data.temp}°C\nHumidity: ${result.data.humidity}%`
      );

      lastAlertTime = now;
      lastAQI = pm;
    }

    res.render('index', {
      ...result,
      aqi
    });

  } catch (err) {
    console.log(err);
    res.send("Error fetching data");
  }
});

setInterval(async () => {
  try {
    await axios.get("http://localhost:3000/");
  } catch (err) {
    console.log("Auto check failed");
  }
}, 20000);

// 🔁 OPTIONAL BACKGROUND ALERT (AUTO WITHOUT REFRESH)
setInterval(async () => {
  try {
    const result = await getData();
    const pm = result.data.pm25;
    const aqi = getAQI(pm);
    const now = Date.now();

    if (
      pm > 200 &&
      (now - lastAlertTime > 5 * 60 * 1000) &&
      pm !== lastAQI
    ) {
      await sendSMS(
        `🚨 ALERT!\nAQI: ${pm} (${aqi.level})\nStay safe!`
      );

      lastAlertTime = now;
      lastAQI = pm;
    }

  } catch (err) {
    console.log("Background alert error");
  }
}, 20000);

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
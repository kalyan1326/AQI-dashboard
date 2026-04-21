async function loadData() {
  try {
    const res = await fetch("/api/data");
    const json = await res.json();

    if (!json || !json.data) {
      document.getElementById("aqiLevel").innerText = "No Data";
      return;
    }

    const { data, feeds, aqi } = json;

    // ✅ SAFE VALUES
    const pm25 = Number(data.pm25) || 0;
    const gas = Number(data.gas) || 0;
    const temp = Number(data.temp) || 0;
    const hum = Number(data.hum) || 0;

    // 🔥 AQI VALUE + LEVEL
    document.getElementById("aqiValue").innerText = pm25.toFixed(1);
    document.getElementById("aqiLevel").innerText = aqi?.level || "Unknown";

    // 🎨 DYNAMIC CARD COLOR (smooth)
    const card = document.getElementById("aqiCard");
    if (card) {
      card.style.transition = "0.5s";
      card.style.background = aqi?.color || "#999";
    }

    // 🌫️ POLLUTANTS
    document.getElementById("pm").innerText = pm25.toFixed(1);
    document.getElementById("gas").innerText = gas;
    document.getElementById("temp").innerText = temp.toFixed(1) + "°C";
    document.getElementById("hum").innerText = hum.toFixed(1) + "%";

    // 📏 INDICATOR (REAL AQI SCALE 0–500)
    const indicator = document.getElementById("indicator");
    if (indicator) {
      let percent = (pm25 / 500) * 100;   // real AQI scale
      percent = Math.max(0, Math.min(percent, 100)); // clamp

      indicator.style.transition = "0.5s";
      indicator.style.left = percent + "%";
    }

    // 📊 OPTIONAL: UPDATE CHART LIVE
    if (window.aqiChart && feeds) {
      const values = feeds.map(f => Number(f.field1) || 0);

      window.aqiChart.data.labels = values.map((_, i) => i);
      window.aqiChart.data.datasets[0].data = values;
      window.aqiChart.update();
    }

  } catch (err) {
    console.log("Frontend error:", err);
    document.getElementById("aqiLevel").innerText = "Error loading data";
  }
}

// 🔄 AUTO REFRESH (smooth interval)
loadData();
setInterval(loadData, 15000);

new Chart(document.getElementById('aqiChart'), {
  type: 'bar',
  data: {
    labels: chartData.map((_, i) => i),
    datasets: [{
      label: 'PM2.5',
      data: chartData,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,  // 🔥 REQUIRED
    plugins: {
      legend: {
        display: true
      }
    }
  }
});


const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "portal-resmiyet",
    gasConfigured: Boolean(GAS_API_URL && GAS_API_KEY)
  });
});

app.post("/api/gas", async (req, res) => {
  if (!GAS_API_URL || !GAS_API_KEY) {
    return res.status(500).json({
      success: false,
      __transportError: true,
      message: "GAS_API_URL atau GAS_API_KEY belum diatur di Environment Variables Render."
    });
  }

  try {
    const url = new URL(GAS_API_URL);
    url.searchParams.set("key", GAS_API_KEY);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        success: false,
        __transportError: true,
        message: "Apps Script mengembalikan respons bukan JSON."
      };
    }

    res.status(response.ok ? 200 : 502).json(data);
  } catch (err) {
    res.status(502).json({
      success: false,
      __transportError: true,
      message: "Gagal menghubungi Apps Script: " + err.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Portal Resmiyet berjalan pada port ${PORT}`);
});

const express = require("express");
const router = express.Router();

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

/**
 * Proxy for FPL bootstrap-static endpoint
 * Provides general info, players, teams, and gameweeks.
 *
 * A server-side proxy is required because fantasy.premierleague.com does
 * not send Access-Control-Allow-Origin headers, so direct browser fetches
 * from the app's own origin are blocked by CORS.
 */
router.get("/bootstrap-static", async (req, res) => {
  try {
    const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`, {
      headers: {
        "User-Agent": "FPL2025-Team-Manager-Proxy",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch data from FPL API",
        status: response.status,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error proxying FPL data:", error);
    res
      .status(500)
      .json({ error: "Internal server error while fetching FPL data" });
  }
});

/**
 * Proxy for FPL entry picks endpoint
 * Provides a manager's picks (including captain/vice-captain) for a gameweek.
 * Proxied server-side for the same CORS reason as bootstrap-static above.
 */
router.get("/entry/:entryId/event/:gameweek/picks", async (req, res) => {
  const { entryId, gameweek } = req.params;

  if (!/^\d+$/.test(entryId) || !/^\d+$/.test(gameweek)) {
    return res.status(400).json({ error: "entryId and gameweek must be positive integers" });
  }

  try {
    const response = await fetch(
      `${FPL_BASE_URL}/entry/${entryId}/event/${gameweek}/picks/`,
      {
        headers: {
          "User-Agent": "FPL2025-Team-Manager-Proxy",
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch entry picks from FPL API",
        status: response.status,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error proxying FPL entry picks:", error);
    res
      .status(500)
      .json({ error: "Internal server error while fetching FPL entry picks" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

/**
 * Proxy for FPL bootstrap-static endpoint
 * Provides general info, players, teams, and gameweeks.
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

module.exports = router;

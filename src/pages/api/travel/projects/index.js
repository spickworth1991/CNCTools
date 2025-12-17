// src/pages/api/travel/projects/index.js

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // TODO: return your stored projects
      // Example shape:
      return res.status(200).json({ projects: [] });
    }

    if (req.method === "POST") {
      const { serviceReportNumber, customerName, travelStart, travelEnd } = req.body || {};

      if (!serviceReportNumber || !customerName || !travelStart || !travelEnd) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      // TODO: create + persist project (wherever you’re storing them)
      // Return { projectId } because your UI expects that.
      const projectId = crypto.randomUUID?.() || String(Date.now());

      return res.status(200).json({ projectId });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

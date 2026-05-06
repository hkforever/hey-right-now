import express from "express";
import fs from "fs";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API to save dumped data
  app.post("/api/save-dump", (req, res) => {
    const { filename, data } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: "Missing filename or data" });
    }

    try {
      const safeFilename = filename.replace(/[^a-z0-9_\-\.]/gi, '_');
      const filePath = path.join(process.cwd(), safeFilename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[Server] Data saved to ${filePath}`);
      res.json({ success: true, path: filePath });
    } catch (err: any) {
      console.error("[Server] Save error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === "production";

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

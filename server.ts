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

  // Exercise API
  const SOURCE_FILE = 'exercises.json'; 

  app.get("/api/exercises", (req, res) => {
    try {
      const sourcePath = path.join(process.cwd(), SOURCE_FILE);
      const aliasesPath = path.join(process.cwd(), 'aliases.json');
      
      let aliasesMap: Record<string, string[]> = {};
      if (fs.existsSync(aliasesPath)) {
        aliasesMap = JSON.parse(fs.readFileSync(aliasesPath, 'utf8'));
      }

      if (!fs.existsSync(sourcePath)) {
        return res.json([]);
      }
      const exercises = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      
      const mergedExercises = exercises.map((ex: any) => {
        const fileAliases = Array.isArray(ex.aliases) ? ex.aliases : [];
        const extraAliases = aliasesMap[ex.id] || [];
        return {
          ...ex,
          aliases: Array.from(new Set([...fileAliases, ...extraAliases]))
        };
      });
      
      res.json(mergedExercises);
    } catch (err: any) {
      console.error("[Server] Exercises fetch error:", err);
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

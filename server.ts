import express from "express";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId: projectId
      });
      db = admin.firestore();
      console.log("Firebase Admin initialized successfully for project:", projectId);
    } else {
      console.warn("Firebase environment variables missing:", {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
} else {
  db = admin.firestore();
}

const app = express();
app.use(express.json());

// API Routes
app.get("/api/summary", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const assessmentsSnapshot = await db.collection("assessments").get();
    const groupsSnapshot = await db.collection("groups").get();
    
    const assessments = assessmentsSnapshot.docs.map(doc => doc.data());
    const totalGroups = groupsSnapshot.size;
    const totalAssessments = assessmentsSnapshot.size;
    
    let totalScore = 0;
    const subjectScores: Record<string, { total: number; count: number }> = {};

    assessments.forEach(a => {
      totalScore += Number(a.score);
      if (!subjectScores[a.subject]) {
        subjectScores[a.subject] = { total: 0, count: 0 };
      }
      subjectScores[a.subject].total += Number(a.score);
      subjectScores[a.subject].count += 1;
    });

    const averageScore = totalAssessments > 0 ? totalScore / totalAssessments : 0;
    const subjectStats = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      avgScore: data.total / data.count
    }));

    res.json({ 
      stats: { totalGroups, averageScore, totalAssessments }, 
      subjectStats 
    });
  } catch (error: any) {
    console.error("Summary error:", error);
    res.status(500).json({ 
      error: "Failed to fetch summary", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get("/api/groups", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const groupsSnapshot = await db.collection("groups").get();
    const assessmentsSnapshot = await db.collection("assessments").get();
    
    const assessments = assessmentsSnapshot.docs.map(doc => doc.data());
    
    const groups = groupsSnapshot.docs.map(doc => {
      const data = doc.data();
      const groupAssessments = assessments.filter(a => a.group_id === doc.id);
      const avgScore = groupAssessments.length > 0 
        ? groupAssessments.reduce((sum, a) => sum + Number(a.score), 0) / groupAssessments.length 
        : null;
      
      return { id: doc.id, ...data, avgScore };
    });
    
    res.json(groups);
  } catch (error: any) {
    console.error("Groups error:", error);
    res.status(500).json({ 
      error: "Failed to fetch groups", 
      message: error.message 
    });
  }
});

app.get("/api/assessments", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const assessmentsSnapshot = await db.collection("assessments").orderBy("date", "desc").get();
    const groupsSnapshot = await db.collection("groups").get();
    
    const groupsMap: Record<string, any> = {};
    groupsSnapshot.docs.forEach(doc => {
      groupsMap[doc.id] = doc.data();
    });

    const assessments = assessmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const group = groupsMap[data.group_id] || {};
      return { 
        id: doc.id, 
        ...data, 
        groupName: group.name || "Unknown", 
        groupCategory: group.category || "N/A" 
      };
    });
    
    res.json(assessments);
  } catch (error: any) {
    console.error("Assessments error:", error);
    res.status(500).json({ 
      error: "Failed to fetch assessments", 
      message: error.message 
    });
  }
});

app.post("/api/assessments", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const { group_id, subject, score, notes } = req.body;
    const docRef = await db.collection("assessments").add({
      group_id,
      subject,
      score: Number(score),
      notes,
      date: new Date().toISOString()
    });
    res.json({ id: docRef.id });
  } catch (error: any) {
    console.error("Assessments POST error:", error);
    res.status(500).json({ 
      error: "Failed to add assessment", 
      message: error.message 
    });
  }
});

app.post("/api/groups", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const { name, category } = req.body;
    const docRef = await db.collection("groups").add({
      name,
      category
    });
    res.json({ id: docRef.id });
  } catch (error: any) {
    console.error("Groups POST error:", error);
    res.status(500).json({ 
      error: "Failed to add group", 
      message: error.message 
    });
  }
});

// Seed Groups Function
async function seedGroups() {
  if (!db) return;
  const groupsToSeed = [
    "KETUPAT", "OPOR", "MUDIK", "THR", 
    "NYEPI", "HENING", "BALI", "CATUR"
  ];
  
  try {
    const groupsSnapshot = await db.collection("groups").get();
    const existingNames = groupsSnapshot.docs.map(doc => doc.data().name);
    
    for (const name of groupsToSeed) {
      if (!existingNames.includes(name)) {
        await db.collection("groups").add({
          name,
          category: "Kategori A"
        });
        console.log(`Seeded group: ${name}`);
      }
    }
  } catch (error) {
    console.error("Error seeding groups:", error);
  }
}

// Manual Seed Endpoint
app.post("/api/seed", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  await seedGroups();
  res.json({ message: "Seeding triggered" });
});

// Debug endpoint
app.get("/api/debug", (req, res) => {
  res.json({
    dbInitialized: !!db,
    env: {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    },
    adminApps: admin.apps.length
  });
});

async function startServer() {
  const PORT = 3000;
  
  console.log("Starting server...");
  
  // Seed initial data
  if (db) {
    await seedGroups();
  } else {
    console.error("Database not available for seeding");
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start server if not in production (Vercel)
// In AI Studio, we usually want to start the server
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;

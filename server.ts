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
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      // Handle both literal newlines and escaped \n strings
      privateKey = privateKey.replace(/\\n/g, '\n');
      // Remove any surrounding quotes that might have been pasted
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
    }

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
    
    // Calculate criteria averages for Fashion Show
    const fashionShowCriteria: Record<string, { total: number; count: number }> = {
      'Kesesuaian dengan tema': { total: 0, count: 0 },
      'Kreativitas': { total: 0, count: 0 },
      'Kelengkapan Kelompok': { total: 0, count: 0 },
      'Ekspresi/Gaya': { total: 0, count: 0 }
    };

    assessments.forEach(a => {
      if (a.subject === 'Fashion Show' && a.criteria) {
        Object.entries(a.criteria).forEach(([key, val]) => {
          if (fashionShowCriteria[key]) {
            fashionShowCriteria[key].total += Number(val);
            fashionShowCriteria[key].count += 1;
          }
        });
      }
    });

    const fashionShowStats = Object.entries(fashionShowCriteria).map(([name, data]) => ({
      name,
      avg: data.count > 0 ? data.total / data.count : 0
    }));

    const subjectStats = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      avgScore: data.total / data.count
    }));

    res.json({ 
      stats: { totalGroups, averageScore, totalAssessments }, 
      subjectStats,
      fashionShowStats
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
        groupName: group.name || "Unknown"
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
    const { group_id, subject, score, notes, criteria, role } = req.body;
    const docRef = await db.collection("assessments").add({
      group_id,
      subject,
      score: Number(score),
      notes,
      criteria: criteria || null,
      role: role || 'Juri', // Default to Juri if not provided
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

app.put("/api/assessments/:id", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    const { group_id, subject, score, notes, criteria } = req.body;
    
    const updateData: any = {
      score: Number(score),
      notes: notes || "",
    };
    
    if (group_id) updateData.group_id = group_id;
    if (subject) updateData.subject = subject;
    if (criteria !== undefined) updateData.criteria = criteria;

    await db.collection("assessments").doc(req.params.id).update(updateData);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Update assessment error:", error);
    res.status(500).json({ 
      error: "Failed to update assessment", 
      message: error.message 
    });
  }
});

app.delete("/api/assessments/:id", async (req, res) => {
  if (!db) return res.status(500).json({ 
    error: "Database not initialized", 
    details: "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel Settings" 
  });
  try {
    await db.collection("assessments").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete assessment error:", error);
    res.status(500).json({ 
      error: "Failed to delete assessment", 
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
    const { name } = req.body;
    const docRef = await db.collection("groups").add({
      name
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

app.delete("/api/groups/:id", async (req, res) => {
  console.log("DELETE request for group ID:", req.params.id);
  if (!db) {
    console.error("Database not initialized during DELETE");
    return res.status(500).json({ error: "Database not initialized" });
  }
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    
    await db.collection("groups").doc(id).delete();
    console.log("Group deleted from Firestore:", id);
    
    // Also delete assessments associated with this group
    const assessmentsSnapshot = await db.collection("assessments").where("group_id", "==", id).get();
    console.log(`Found ${assessmentsSnapshot.size} assessments to delete for group ${id}`);
    
    const batch = db.batch();
    assessmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("Assessments batch delete completed");
    
    res.json({ message: "Group and associated assessments deleted" });
  } catch (error: any) {
    console.error("Failed to delete group:", error);
    res.status(500).json({ error: "Failed to delete group", message: error.message });
  }
});

// Settings Endpoints
app.get("/api/settings/qr-status", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const doc = await db.collection("settings").doc("qr_status").get();
    if (!doc.exists) {
      // Default to true if not set
      const defaultStatus = { juri: true, peserta: true };
      await db.collection("settings").doc("qr_status").set(defaultStatus);
      return res.json(defaultStatus);
    }
    res.json(doc.data());
  } catch (error: any) {
    console.error("Get QR status error:", error);
    res.status(500).json({ error: "Failed to get QR status" });
  }
});

app.post("/api/settings/qr-status", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const { juri, peserta } = req.body;
    await db.collection("settings").doc("qr_status").set({ juri, peserta }, { merge: true });
    res.json({ success: true, juri, peserta });
  } catch (error: any) {
    console.error("Update QR status error:", error);
    res.status(500).json({ error: "Failed to update QR status" });
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
          name
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

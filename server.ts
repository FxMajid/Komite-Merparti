import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log("Firebase Admin initialized successfully");
    } else {
      console.warn("Firebase environment variables missing. API will fail.");
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

const app = express();
app.use(express.json());

// API Routes
app.get("/api/summary", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const assessmentsSnapshot = await db.collection("assessments").get();
    const studentsSnapshot = await db.collection("students").get();
    
    const assessments = assessmentsSnapshot.docs.map(doc => doc.data());
    const totalStudents = studentsSnapshot.size;
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
      stats: { totalStudents, averageScore, totalAssessments }, 
      subjectStats 
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

app.get("/api/students", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const studentsSnapshot = await db.collection("students").get();
    const assessmentsSnapshot = await db.collection("assessments").get();
    
    const assessments = assessmentsSnapshot.docs.map(doc => doc.data());
    
    const students = studentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const studentAssessments = assessments.filter(a => a.student_id === doc.id);
      const avgScore = studentAssessments.length > 0 
        ? studentAssessments.reduce((sum, a) => sum + Number(a.score), 0) / studentAssessments.length 
        : null;
      
      return { id: doc.id, ...data, avgScore };
    });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.get("/api/assessments", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const assessmentsSnapshot = await db.collection("assessments").orderBy("date", "desc").get();
    const studentsSnapshot = await db.collection("students").get();
    
    const studentsMap: Record<string, any> = {};
    studentsSnapshot.docs.forEach(doc => {
      studentsMap[doc.id] = doc.data();
    });

    const assessments = assessmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const student = studentsMap[data.student_id] || {};
      return { 
        id: doc.id, 
        ...data, 
        studentName: student.name || "Unknown", 
        studentClass: student.class || "N/A" 
      };
    });
    
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

app.post("/api/assessments", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const { student_id, subject, score, notes } = req.body;
    const docRef = await db.collection("assessments").add({
      student_id,
      subject,
      score: Number(score),
      notes,
      date: new Date().toISOString()
    });
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to add assessment" });
  }
});

app.post("/api/students", async (req, res) => {
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  try {
    const { name, class: className } = req.body;
    const docRef = await db.collection("students").add({
      name,
      class: className
    });
    res.json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: "Failed to add student" });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default app;

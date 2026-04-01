import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import JudgeView from './JudgeView';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/judge/fashion-show" element={<JudgeView />} />
        
        <Route path="/april" element={<AdminDashboard month="april" />} />
        <Route path="/april/judge/fashion-show" element={<JudgeView month="april" />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus,
  Plus,
  GraduationCap, 
  PlusCircle, 
  TrendingUp, 
  Search,
  MoreVertical,
  ChevronRight,
  Filter,
  Download,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  LogOut,
  Trash2,
  Edit2,
  QrCode,
  Trophy,
  Medal,
  Crown,
  Settings,
  Save,
  ListChecks,
  Star
} from 'lucide-react';
import QRCode from "react-qr-code";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Group {
  id: string;
  name: string;
  avgScore: number | null;
}

interface Assessment {
  id: string;
  group_id: string;
  groupName: string;
  subject: string;
  score: number;
  date: string;
  notes: string;
  criteria?: Record<string, number>;
  role?: 'Juri' | 'Peserta';
}

interface Summary {
  stats: {
    totalGroups: number;
    averageScore: number;
    totalAssessments: number;
  };
  subjectStats: {
    subject: string;
    avgScore: number;
  }[];
  criteriaStats?: {
    subject: string;
    criteria: {
      name: string;
      avg: number;
    }[];
  }[];
}

interface Subject {
  id: string;
  name: string;
}

interface AdminDashboardProps {
  month?: string;
}

const getAbbreviation = (name: string) => {
  if (!name) return '';
  return name.split(' ').map(word => word[0].toUpperCase()).join('');
};

export default function AdminDashboard({ month }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'assessments' | 'ranking' | 'subjects' | 'formula' | 'criteria'>('overview');
  const [qrData, setQrData] = useState<{url: string, title: string, desc: string} | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [criteriaList, setCriteriaList] = useState<{id: string, name: string, subject: string}[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'loading'>('loading');
  const [dbError, setDbError] = useState<string>('');
  const [isAddingAssessment, setIsAddingAssessment] = useState(false);
  const [formula, setFormula] = useState({
    juriWeight: 35,
    pesertaWeight: 30,
    merpatiWeight: 30,
    bonusWeight: 5
  });
  const [isSavingFormula, setIsSavingFormula] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  
  // QR Generation State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrRole, setQrRole] = useState<'Juri' | 'Peserta'>('Juri');
  const [selectedQrGroups, setSelectedQrGroups] = useState<string[]>([]);
  const [selectedQrCriteria, setSelectedQrCriteria] = useState<string[]>([]);
  const [selectedQrSubject, setSelectedQrSubject] = useState<string>('Fashion Show');

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [alertModal, setAlertModal] = useState<{isOpen: boolean, title: string, message: string} | null>(null);

  const [qrStatus, setQrStatus] = useState({ juri: true, peserta: true });
  const [assessmentDetailsModal, setAssessmentDetailsModal] = useState<{groupId: string, groupName: string, role: 'Juri' | 'Peserta'} | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      if (userRole === 'user' && month !== 'april') {
        navigate('/april');
      } else {
        fetchQrStatus();
      }
    }
  }, [isLoggedIn, userRole, month, navigate]);

  const fetchQrStatus = async () => {
    try {
      const res = await fetch(`/api/settings/qr-status${month ? `?month=${month}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch QR status", err);
    }
  };

  const toggleQrStatus = async (role: 'juri' | 'peserta') => {
    const newStatus = { ...qrStatus, [role]: !qrStatus[role] };
    setQrStatus(newStatus);
    try {
      await fetch(`/api/settings/qr-status${month ? `?month=${month}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus)
      });
    } catch (err) {
      console.error("Failed to update QR status", err);
      // Revert on error
      setQrStatus(qrStatus);
    }
  };

  // Form states
  const [newAssessment, setNewAssessment] = useState<{
    group_id: string;
    subject: string;
    score: number;
    notes: string;
    criteria: Record<string, number>;
  }>({
    group_id: '',
    subject: 'Merpati Ekor Kata',
    score: 80,
    notes: '',
    criteria: {}
  });

  // Update criteria when subject changes
  useEffect(() => {
    if (newAssessment.subject) {
      const subjectCriteria = criteriaList.filter(c => c.subject === newAssessment.subject);
      if (subjectCriteria.length > 0) {
        const initialCriteria: Record<string, number> = {};
        subjectCriteria.forEach(c => {
          initialCriteria[c.name] = 0;
        });
        setNewAssessment(prev => ({ ...prev, criteria: initialCriteria }));
      } else {
        setNewAssessment(prev => ({ ...prev, criteria: {} }));
      }
    }
  }, [newAssessment.subject, criteriaList]);

  const [newGroup, setNewGroup] = useState({
    name: ''
  });

  const [newSubject, setNewSubject] = useState({
    name: ''
  });

  const rankings = useMemo(() => {
    const fashionSubjectName = subjects[0]?.name || 'Fashion Show';
    const merpatiSubjectName = subjects[1]?.name || 'Merpati Ekor Kata';
    const bonusSubjectName = subjects[2]?.name || 'Bonus';

    const groupStats = groups.map(group => {
      const groupAssessments = assessments.filter(a => a.group_id === group.id);
      
      // 1. Pisahkan berdasarkan kategori
      const fashionAssessments = groupAssessments.filter(a => a.subject === fashionSubjectName);
      const merpatiAssessments = groupAssessments.filter(a => a.subject === merpatiSubjectName);
      const bonusAssessments = groupAssessments.filter(a => a.subject === bonusSubjectName);

      // 2. Hitung rata-rata per kategori utama
      const fashionAvg = fashionAssessments.length > 0 
        ? fashionAssessments.reduce((sum, a) => sum + a.score, 0) / fashionAssessments.length 
        : 0;
        
      const merpatiAvg = merpatiAssessments.length > 0 
        ? merpatiAssessments.reduce((sum, a) => sum + a.score, 0) / merpatiAssessments.length 
        : 0;

      // Bonus diakumulasi (dijumlahkan), bukan dirata-rata
      const totalBonus = bonusAssessments.reduce((sum, a) => sum + a.score, 0);

      // 3. Pisahkan Juri dan Peserta HANYA untuk Fashion Show (karena Merpati punya bobot sendiri 30%)
      const juriAssessments = fashionAssessments.filter(a => !a.role || a.role === 'Juri');
      const pesertaAssessments = fashionAssessments.filter(a => a.role === 'Peserta');

      const juriAvg = juriAssessments.length > 0 
        ? juriAssessments.reduce((sum, a) => sum + a.score, 0) / juriAssessments.length 
        : 0;
        
      const pesertaAvg = pesertaAssessments.length > 0 
        ? pesertaAssessments.reduce((sum, a) => sum + a.score, 0) / pesertaAssessments.length 
        : 0;

      // 4. Hitung Nilai dengan Bobot dari formula
      const jWeight = formula.juriWeight / 100;
      const pWeight = formula.pesertaWeight / 100;
      const mWeight = formula.merpatiWeight / 100;
      const bWeight = formula.bonusWeight / 100;
      const fashionTotalWeight = jWeight + pWeight;

      let fashionScore = 0;
      if (juriAssessments.length > 0 && pesertaAssessments.length > 0) {
        fashionScore = (juriAvg * jWeight) + (pesertaAvg * pWeight);
      } else if (juriAssessments.length > 0) {
        fashionScore = juriAvg * fashionTotalWeight; 
      } else if (pesertaAssessments.length > 0) {
        fashionScore = pesertaAvg * fashionTotalWeight; 
      }

      const merpatiScore = merpatiAvg * mWeight;

      // 5. Nilai Akhir = Fashion Score + Merpati Score + (Total Bonus * bonusWeight)
      const avgScore = fashionScore + merpatiScore + (totalBonus * bWeight);

      return {
        ...group,
        avgScore,
        juriAvg,
        pesertaAvg,
        fashionAvg,
        merpatiAvg,
        bonusAvg: totalBonus, // Menyimpan total bonus di property ini
        totalVotes: groupAssessments.length,
        juriVotes: juriAssessments.length,
        pesertaVotes: pesertaAssessments.length
      };
    });

    return groupStats.sort((a, b) => b.avgScore - a.avgScore);
  }, [groups, assessments, formula]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'kerja') {
      setIsLoggedIn(true);
      setUserRole('admin');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'admin');
      setLoginError('');
    } else if (loginForm.username === 'user' && loginForm.password === 'user') {
      setIsLoggedIn(true);
      setUserRole('user');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'user');
      setLoginError('');
    } else {
      setLoginError('Username atau password salah');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, assessmentsRes, summaryRes, subjectsRes, formulaRes, criteriaRes] = await Promise.all([
        fetch(`/api/groups${month ? `?month=${month}` : ''}`),
        fetch(`/api/assessments${month ? `?month=${month}` : ''}`),
        fetch(`/api/summary${month ? `?month=${month}` : ''}`),
        fetch(`/api/subjects${month ? `?month=${month}` : ''}`),
        fetch(`/api/settings/formula${month ? `?month=${month}` : ''}`),
        fetch(`/api/criteria${month ? `?month=${month}` : ''}`)
      ]);
      
      if (groupsRes.ok && assessmentsRes.ok && summaryRes.ok && subjectsRes.ok && formulaRes.ok && criteriaRes.ok) {
        const groupsData = await groupsRes.json();
        const assessmentsData = await assessmentsRes.json();
        const summaryData = await summaryRes.json();
        const subjectsData = await subjectsRes.json();
        const formulaData = await formulaRes.json();
        const criteriaData = await criteriaRes.json();
        
        setGroups(groupsData);
        setAssessments(assessmentsData);
        setSummary(summaryData);
        setSubjects(subjectsData);
        setFormula(formulaData);
        setCriteriaList(criteriaData);
        setDbStatus('connected');
        setDbError('');
      } else {
        const errorData = await groupsRes.json().catch(() => ({}));
        setDbStatus('error');
        setDbError(errorData.details || errorData.message || 'Gagal terhubung ke server');
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setDbStatus('error');
      setDbError(error.message || 'Koneksi gagal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (userRole === 'user' && month !== 'april') {
        // Do not fetch data, wait for redirect
        return;
      }
      fetchData();
    }
  }, [isLoggedIn, month, userRole]);

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalScore = parseInt(newAssessment.score.toString());
      let criteriaData = null;

      if (Object.keys(newAssessment.criteria).length > 0) {
        const scores = Object.values(newAssessment.criteria) as number[];
        const sum = scores.reduce((a, b) => a + b, 0);
        finalScore = Math.round(sum / scores.length);
        criteriaData = newAssessment.criteria;
      }

      const res = await fetch(`/api/assessments${month ? `?month=${month}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAssessment,
          score: finalScore,
          criteria: criteriaData
        })
      });
      if (res.ok) {
        setIsAddingAssessment(false);
        setNewAssessment({ 
          group_id: '', 
          subject: 'Merpati Ekor Kata', 
          score: 80, 
          notes: '',
          criteria: {}
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding assessment:", error);
    }
  };

  const handleUpdateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssessment) return;
    try {
      let finalScore = parseInt(editingAssessment.score.toString());
      let criteriaData = null;

      if (editingAssessment.criteria && Object.keys(editingAssessment.criteria).length > 0) {
        const scores = Object.values(editingAssessment.criteria) as number[];
        const sum = scores.reduce((a, b) => a + b, 0);
        finalScore = Math.round(sum / scores.length);
        criteriaData = editingAssessment.criteria;
      }

      const res = await fetch(`/api/assessments/${editingAssessment.id}${month ? `?month=${month}` : ''}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingAssessment,
          score: finalScore,
          criteria: criteriaData
        })
      });
      if (res.ok) {
        setEditingAssessment(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating assessment:", error);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus penilaian ini?')) return;
    try {
      const res = await fetch(`/api/assessments/${id}${month ? `?month=${month}` : ''}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting assessment:", error);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/groups${month ? `?month=${month}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      });
      if (res.ok) {
        setIsAddingGroup(false);
        setNewGroup({ name: '' });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding group:", error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    console.log("Attempting to delete group with ID:", id);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Kelompok',
      message: 'Apakah Anda yakin ingin menghapus kelompok ini? Semua data penilaian terkait juga akan dihapus.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${id}${month ? `?month=${month}` : ''}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            console.log("Group deleted successfully:", id);
            fetchData();
          } else {
            const errorData = await res.json().catch(() => ({}));
            console.error("Failed to delete group:", errorData);
            setAlertModal({ isOpen: true, title: 'Gagal', message: `Gagal menghapus kelompok: ${errorData.message || 'Error tidak diketahui'}` });
          }
        } catch (error) {
          console.error("Error deleting group:", error);
          setAlertModal({ isOpen: true, title: 'Error', message: "Terjadi kesalahan saat menghapus kelompok." });
        }
      }
    });
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFormula(true);
    try {
      const res = await fetch(`/api/settings/formula${month ? `?month=${month}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formula)
      });
      if (res.ok) {
        setAlertModal({ isOpen: true, title: 'Sukses', message: 'Formula penilaian berhasil disimpan!' });
        fetchData();
      } else {
        setAlertModal({ isOpen: true, title: 'Gagal', message: 'Gagal menyimpan formula penilaian.' });
      }
    } catch (error) {
      console.error("Error saving formula:", error);
      setAlertModal({ isOpen: true, title: 'Error', message: 'Terjadi kesalahan saat menyimpan formula.' });
    } finally {
      setIsSavingFormula(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/subjects${month ? `?month=${month}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject)
      });
      if (res.ok) {
        setIsAddingSubject(false);
        setNewSubject({ name: '' });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding subject:", error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Perlombaan',
      message: 'Apakah Anda yakin ingin menghapus perlombaan ini?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/subjects/${id}${month ? `?month=${month}` : ''}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchData();
          } else {
            const errorData = await res.json().catch(() => ({}));
            setAlertModal({ isOpen: true, title: 'Gagal', message: `Gagal menghapus perlombaan: ${errorData.message || 'Error tidak diketahui'}` });
          }
        } catch (error) {
          console.error("Error deleting subject:", error);
          setAlertModal({ isOpen: true, title: 'Error', message: "Terjadi kesalahan saat menghapus perlombaan." });
        }
      }
    });
  };

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="p-8">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Admin Login</h2>
            <p className="text-slate-500 text-center mb-8">Masukkan kredensial untuk mengakses dashboard</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    placeholder="Username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle size={14} />
                  {loginError}
                </motion.div>
              )}

              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
              >
                Masuk ke Dashboard
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (userRole === 'user' && month !== 'april') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-bottom border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">EduScore</h1>
              <p className="text-xs text-slate-500 font-medium">Sistem Penilaian {month === 'april' ? '(April)' : ''}</p>
            </div>
          </div>
          <div className="mt-4 flex bg-slate-100 p-1 rounded-lg">
            {userRole !== 'user' && (
              <button 
                onClick={() => window.location.href = '/'}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                  !month ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Utama
              </button>
            )}
            <button 
              onClick={() => window.location.href = '/april'}
              className={cn(
                "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                month === 'april' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              April
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'overview' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'groups' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Users size={20} />
            <span>Data Kelompok</span>
          </button>
          <button 
            onClick={() => setActiveTab('assessments')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'assessments' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <BookOpen size={20} />
            <span>Riwayat Nilai</span>
          </button>
          <button 
            onClick={() => setActiveTab('ranking')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'ranking' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Trophy size={20} />
            <span>Ranking</span>
          </button>
          <button 
            onClick={() => setActiveTab('subjects')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'subjects' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Medal size={20} />
            <span>Data Perlombaan</span>
          </button>
          <button 
            onClick={() => setActiveTab('formula')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'formula' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Settings size={20} />
            <span>Formula Penilaian</span>
          </button>
          <button 
            onClick={() => setActiveTab('criteria')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === 'criteria' 
                ? "bg-brand-50 text-brand-700 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ListChecks size={20} />
            <span>Master Kriteria</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all duration-200 group">
              <button 
                onClick={() => {
                  setQrRole('Juri');
                  setSelectedQrGroups([]);
                  setSelectedQrSubject(subjects[0]?.name || 'Fashion Show');
                  setIsQrModalOpen(true);
                }}
                className="flex-1 flex items-center gap-3 text-slate-500 group-hover:text-slate-900 text-left"
              >
                <QrCode size={20} />
                <span>QR Code Juri</span>
              </button>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQrStatus('juri');
                }}
                title={qrStatus.juri ? "Nonaktifkan Link Juri" : "Aktifkan Link Juri"}
                className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors shrink-0 ${qrStatus.juri ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${qrStatus.juri ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl transition-all duration-200 group">
              <button 
                onClick={() => {
                  setQrRole('Peserta');
                  setSelectedQrGroups([]);
                  setSelectedQrSubject(subjects[0]?.name || 'Fashion Show');
                  setIsQrModalOpen(true);
                }}
                className="flex-1 flex items-center gap-3 text-slate-500 group-hover:text-slate-900 text-left"
              >
                <Users size={20} />
                <span>QR Code Peserta</span>
              </button>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQrStatus('peserta');
                }}
                title={qrStatus.peserta ? "Nonaktifkan Link Peserta" : "Aktifkan Link Peserta"}
                className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors shrink-0 ${qrStatus.peserta ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${qrStatus.peserta ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-xs text-slate-400 font-medium mb-1">Status Sistem</p>
              <p className="text-sm font-semibold">
                {dbStatus === 'connected' ? 'Database Terhubung' : dbStatus === 'loading' ? 'Menghubungkan...' : 'Database Terputus'}
              </p>
              {dbError && dbStatus === 'error' && (
                <p className="text-[10px] text-red-300 mt-1 leading-tight opacity-80">
                  {dbError}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  dbStatus === 'connected' ? "bg-emerald-400 animate-pulse" : dbStatus === 'loading' ? "bg-amber-400 animate-pulse" : "bg-red-400"
                )} />
                <span className={cn(
                  "text-[10px] uppercase tracking-wider font-bold",
                  dbStatus === 'connected' ? "text-emerald-400" : dbStatus === 'loading' ? "text-amber-400" : "text-red-400"
                )}>
                  {dbStatus === 'connected' ? 'Online' : dbStatus === 'loading' ? 'Loading' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 size={80} />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-amber-50 hover:text-amber-700 transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'groups' && 'Manajemen Data Kelompok'}
              {activeTab === 'subjects' && 'Manajemen Data Perlombaan'}
              {activeTab === 'assessments' && 'Riwayat Penilaian'}
              {activeTab === 'ranking' && 'Ranking & Klasemen'}
              {activeTab === 'formula' && 'Formula Penilaian'}
              {activeTab === 'criteria' && 'Master Kriteria Penilaian'}
            </h2>
            <p className="text-sm text-slate-500">Selamat datang kembali, Admin</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl text-sm transition-all w-64"
              />
            </div>
            {['groups', 'subjects', 'assessments'].includes(activeTab) && (
              <button 
                onClick={() => {
                  if (activeTab === 'groups') setIsAddingGroup(true);
                  else if (activeTab === 'subjects') setIsAddingSubject(true);
                  else setIsAddingAssessment(true);
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-brand-600/20 active:scale-95"
              >
                <PlusCircle size={18} />
                <span>
                  {activeTab === 'groups' ? 'Tambah Kelompok' : 
                   activeTab === 'subjects' ? 'Tambah Perlombaan' : 
                   'Input Nilai'}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat data...</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                          <Users size={24} />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+2 Baru</span>
                      </div>
                      <p className="text-slate-500 text-sm font-medium">Total Kelompok</p>
                      <h3 className="text-3xl font-bold text-slate-900 mt-1">{summary?.stats?.totalGroups || 0}</h3>
                      {groups.length === 0 && !loading && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/seed${month ? `?month=${month}` : ''}`, { method: 'POST' });
                              if (res.ok) {
                                fetchData();
                                setAlertModal({ isOpen: true, title: 'Sukses', message: 'Data kelompok berhasil di-seed!' });
                              } else {
                                setAlertModal({ isOpen: true, title: 'Gagal', message: 'Gagal seeding data. Pastikan Firebase sudah dikonfigurasi.' });
                              }
                            } catch (e) {
                              setAlertModal({ isOpen: true, title: 'Error', message: 'Error saat seeding data.' });
                            }
                          }}
                          className="mt-4 text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> Seed Data Kelompok
                        </button>
                      )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
                          <TrendingUp size={24} />
                        </div>
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Stabil</span>
                      </div>
                      <p className="text-slate-500 text-sm font-medium">Rata-rata Nilai</p>
                      <h3 className="text-3xl font-bold text-slate-900 mt-1">
                        {summary?.stats?.averageScore ? summary.stats.averageScore.toFixed(1) : '0'}
                      </h3>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                          <BookOpen size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">Bulan Ini</span>
                      </div>
                      <p className="text-slate-500 text-sm font-medium">Total Penilaian</p>
                      <h3 className="text-3xl font-bold text-slate-900 mt-1">{summary?.stats?.totalAssessments || 0}</h3>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {summary?.criteriaStats?.map((stat, idx) => (
                      <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Star size={18} className="text-brand-500" />
                          Rata-rata Kriteria: {stat.subject}
                        </h4>
                        <div className="space-y-4">
                          {stat.criteria.map((c, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-600">{c.name}</span>
                                <span className="font-bold text-slate-900">{c.avg.toFixed(1)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-brand-500 h-2 rounded-full transition-all duration-1000"
                                  style={{ width: `${(c.avg / 100) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          {stat.criteria.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">Belum ada data penilaian kriteria.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">Penilaian Terbaru</h4>
                      <button 
                        onClick={() => setActiveTab('assessments')}
                        className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        Lihat Semua <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-4">Kelompok</th>
                            <th className="px-6 py-4">Perlombaan</th>
                            <th className="px-6 py-4">Nilai</th>
                            <th className="px-6 py-4">Penilai</th>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(Array.isArray(assessments) ? assessments : []).slice(0, 5).map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                    {a.groupName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{a.groupName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm text-slate-600 font-medium">{a.subject}</span>
                                  {a.criteria && (
                                    <div className="flex gap-2 mt-0.5">
                                      {Object.entries(a.criteria).map(([key, val]) => (
                                        <span key={key} className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                          {key}: {val}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "text-sm font-bold",
                                  a.score >= 75 ? "text-emerald-600" : "text-amber-600"
                                )}>
                                  {a.score}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                  a.role === 'Peserta' ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                                )}>
                                  {a.role || 'Juri'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {new Date(a.date).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setEditingAssessment(a)}
                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="Edit Penilaian"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAssessment(a.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Hapus Penilaian"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'groups' && (
                <motion.div 
                  key="groups"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Cari kelompok..." 
                          className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all w-full sm:w-64"
                        />
                      </div>
                      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                        <Filter size={20} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setIsAddingGroup(true)}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-200"
                    >
                      <UserPlus size={20} />
                      Tambah Kelompok
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Nama Kelompok</th>
                          <th className="px-6 py-4">Rata-rata Nilai</th>
                          <th className="px-6 py-4">Status Performa</th>
                          <th className="px-6 py-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(groups) ? groups : []).map((g) => (
                          <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-mono text-slate-400">#{g.id.toString().slice(-4)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                                  {g.name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{g.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-1000",
                                      (g.avgScore || 0) >= 75 ? "bg-emerald-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${g.avgScore || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-slate-700">
                                  {g.avgScore ? g.avgScore.toFixed(1) : 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                (g.avgScore || 0) >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              )}>
                                {(g.avgScore || 0) >= 75 ? 'Sangat Baik' : 'Perlu Bimbingan'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQrRole('Juri');
                                    setSelectedQrGroups([g.id]);
                                    setSelectedQrSubject(subjects[0]?.name || 'Fashion Show');
                                    setIsQrModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all cursor-pointer z-30"
                                  title="QR Code Kelompok"
                                >
                                  <QrCode size={18} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGroup(g.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer z-30"
                                  title="Hapus Kelompok"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <button 
                                  type="button"
                                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                >
                                  <MoreVertical size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'subjects' && (
                <motion.div 
                  key="subjects"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Cari perlombaan..." 
                          className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all w-full sm:w-64"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAddingSubject(true)}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-200"
                    >
                      <Plus size={20} />
                      Tambah Perlombaan
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">ID</th>
                          <th className="px-6 py-4">Nama Perlombaan</th>
                          <th className="px-6 py-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(subjects) ? subjects : []).map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-mono text-slate-400">#{s.id.toString().slice(-4)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                                  {s.name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSubject(s.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer z-30"
                                  title="Hapus Perlombaan"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'criteria' && (
                <motion.div 
                  key="criteria"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Master Kriteria Penilaian</h3>
                      <p className="text-sm text-slate-500">Atur kriteria apa saja yang akan dinilai pada saat generate QR.</p>
                    </div>
                    <button 
                      onClick={() => {
                        const name = prompt('Masukkan nama kriteria baru:');
                        if (name) {
                          const subject = prompt('Masukkan nama perlombaan untuk kriteria ini (misal: Fashion Show):', 'Fashion Show');
                          if (subject) {
                            fetch(`/api/criteria${month ? `?month=${month}` : ''}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name, subject })
                            }).then(() => fetchData());
                          }
                        }
                      }}
                      className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-200"
                    >
                      <Plus size={20} />
                      Tambah Kriteria
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">Perlombaan</th>
                          <th className="px-6 py-4">Nama Kriteria</th>
                          <th className="px-6 py-4">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {criteriaList.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{c.subject}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{c.name}</td>
                            <td className="px-6 py-4">
                              <button 
                                type="button"
                                onClick={() => {
                                  if (confirm('Hapus kriteria ini?')) {
                                    fetch(`/api/criteria/${c.id}${month ? `?month=${month}` : ''}`, { method: 'DELETE' })
                                      .then(() => fetchData());
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {criteriaList.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                              Belum ada kriteria. Silakan tambahkan kriteria baru.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'formula' && (
                <motion.div 
                  key="formula"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-2xl"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Formula Penilaian</h2>
                    <p className="text-slate-500">Atur bobot persentase untuk setiap aspek penilaian. Total bobot sebaiknya 100%.</p>
                  </div>

                  <form onSubmit={handleSaveFormula} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Bobot {subjects[0]?.name || 'Fashion Show'} (Juri)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={formula.juriWeight}
                            onChange={(e) => setFormula({...formula, juriWeight: Number(e.target.value)})}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-slate-500">Nilai rata-rata dari Juri untuk {subjects[0]?.name || 'Fashion Show'}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Bobot {subjects[0]?.name || 'Fashion Show'} (Peserta)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={formula.pesertaWeight}
                            onChange={(e) => setFormula({...formula, pesertaWeight: Number(e.target.value)})}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-slate-500">Nilai rata-rata dari Peserta untuk {subjects[0]?.name || 'Fashion Show'}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Bobot {subjects[1]?.name || 'Merpati Ekor Kata'}</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={formula.merpatiWeight}
                            onChange={(e) => setFormula({...formula, merpatiWeight: Number(e.target.value)})}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-slate-500">Nilai rata-rata untuk {subjects[1]?.name || 'Merpati Ekor Kata'}</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Bobot {subjects[2]?.name || 'Bonus'}</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={formula.bonusWeight}
                            onChange={(e) => setFormula({...formula, bonusWeight: Number(e.target.value)})}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-slate-500">Pengali untuk total nilai {subjects[2]?.name || 'Bonus'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Informasi Formula</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          Total bobot saat ini: <strong className="font-bold">{formula.juriWeight + formula.pesertaWeight + formula.merpatiWeight}%</strong> (tidak termasuk bonus).<br/>
                          Jika salah satu penilai (Juri/Peserta) tidak ada, bobot {subjects[0]?.name || 'Fashion Show'} akan digabungkan secara otomatis ({formula.juriWeight + formula.pesertaWeight}%).
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button 
                        type="submit"
                        disabled={isSavingFormula}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-200 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSavingFormula ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Save size={20} />
                            <span>Simpan Formula</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === 'ranking' && (
                <motion.div 
                  key="ranking"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  {/* Top 3 Podium */}
                  <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pb-8 border-b border-slate-200 min-h-[300px]">
                    {/* 2nd Place */}
                    {rankings[1] && (
                      <div className="flex flex-col items-center order-2 md:order-1">
                        <div className="mb-4 text-center">
                          <h3 className="font-bold text-slate-900 text-lg">{rankings[1].name}</h3>
                          <p className="text-slate-500 font-medium text-xl">{rankings[1].avgScore.toFixed(1)}</p>
                          <div className="flex gap-2 text-[10px] mt-1 justify-center flex-wrap">
                            <span className="text-pink-600 font-bold bg-pink-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[0]?.name || 'Fashion Show')}: {rankings[1].fashionAvg.toFixed(1)}</span>
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[1]?.name || 'Merpati Ekor Kata')}: {rankings[1].merpatiAvg.toFixed(1)}</span>
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[2]?.name || 'Bonus')}: {rankings[1].bonusAvg.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="w-24 md:w-32 h-32 md:h-40 bg-slate-200 rounded-t-2xl flex items-end justify-center pb-4 relative">
                          <div className="absolute -top-6 w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center text-slate-600 font-bold border-4 border-white shadow-lg">
                            2
                          </div>
                          <Medal size={32} className="text-slate-400 mb-2" />
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {rankings[0] && (
                      <div className="flex flex-col items-center order-1 md:order-2 z-10">
                        <div className="mb-4 text-center">
                          <Crown size={32} className="text-amber-400 mx-auto mb-2 fill-amber-400 animate-bounce" />
                          <h3 className="font-bold text-slate-900 text-xl">{rankings[0].name}</h3>
                          <p className="text-brand-600 font-bold text-2xl">{rankings[0].avgScore.toFixed(1)}</p>
                          <div className="flex gap-2 text-xs mt-1 justify-center flex-wrap">
                            <span className="text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded">{getAbbreviation(subjects[0]?.name || 'Fashion Show')}: {rankings[0].fashionAvg.toFixed(1)}</span>
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">{getAbbreviation(subjects[1]?.name || 'Merpati Ekor Kata')}: {rankings[0].merpatiAvg.toFixed(1)}</span>
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">{getAbbreviation(subjects[2]?.name || 'Bonus')}: {rankings[0].bonusAvg.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="w-28 md:w-40 h-40 md:h-56 bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-2xl flex items-end justify-center pb-6 relative shadow-xl shadow-amber-200">
                          <div className="absolute -top-6 w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold border-4 border-white shadow-lg text-xl">
                            1
                          </div>
                          <Trophy size={48} className="text-white mb-2" />
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {rankings[2] && (
                      <div className="flex flex-col items-center order-3">
                        <div className="mb-4 text-center">
                          <h3 className="font-bold text-slate-900 text-lg">{rankings[2].name}</h3>
                          <p className="text-slate-500 font-medium text-xl">{rankings[2].avgScore.toFixed(1)}</p>
                          <div className="flex gap-2 text-[10px] mt-1 justify-center flex-wrap">
                            <span className="text-pink-600 font-bold bg-pink-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[0]?.name || 'Fashion Show')}: {rankings[2].fashionAvg.toFixed(1)}</span>
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[1]?.name || 'Merpati Ekor Kata')}: {rankings[2].merpatiAvg.toFixed(1)}</span>
                            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{getAbbreviation(subjects[2]?.name || 'Bonus')}: {rankings[2].bonusAvg.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="w-24 md:w-32 h-24 md:h-32 bg-orange-200 rounded-t-2xl flex items-end justify-center pb-4 relative">
                          <div className="absolute -top-6 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold border-4 border-white shadow-lg">
                            3
                          </div>
                          <Medal size={32} className="text-orange-400 mb-2" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Ranking Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Trophy size={20} className="text-brand-600" />
                        Klasemen Lengkap
                      </h4>
                      <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700">Formula:</span> Juri 35% + Peserta 30% + Merpati 30% + Bonus 5%
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-4 text-center w-16">Rank</th>
                            <th className="px-6 py-4">Kelompok</th>
                            <th className="px-6 py-4 text-center">Total Nilai</th>
                            <th className="px-6 py-4 text-center">{subjects[0]?.name || 'Fashion Show'}</th>
                            <th className="px-6 py-4 text-center">{subjects[1]?.name || 'Merpati Ekor Kata'}</th>
                            <th className="px-6 py-4 text-center">{subjects[2]?.name || 'Bonus'}</th>
                            <th className="px-6 py-4 text-center">Rata-rata Juri</th>
                            <th className="px-6 py-4 text-center">Rata-rata Peserta</th>
                            <th className="px-6 py-4 text-center">Total Vote</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rankings.map((group, index) => (
                            <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto",
                                  index === 0 ? "bg-amber-100 text-amber-600" :
                                  index === 1 ? "bg-slate-100 text-slate-600" :
                                  index === 2 ? "bg-orange-100 text-orange-600" :
                                  "text-slate-400"
                                )}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                    {group.name.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-900">{group.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-lg font-black text-slate-900">{group.avgScore.toFixed(1)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-pink-600">{group.fashionAvg.toFixed(1)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-indigo-600">{group.merpatiAvg.toFixed(1)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-emerald-600">{group.bonusAvg.toFixed(1)}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div 
                                  className="inline-flex flex-col items-center cursor-pointer hover:bg-purple-50 p-2 rounded-lg transition-colors"
                                  onClick={() => setAssessmentDetailsModal({ groupId: group.id, groupName: group.name, role: 'Juri' })}
                                >
                                  <span className="font-bold text-purple-600">{group.juriAvg.toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400">{group.juriVotes} suara</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div 
                                  className="inline-flex flex-col items-center cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                  onClick={() => setAssessmentDetailsModal({ groupId: group.id, groupName: group.name, role: 'Peserta' })}
                                >
                                  <span className="font-bold text-blue-600">{group.pesertaAvg.toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400">{group.pesertaVotes} suara</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-slate-600">{group.totalVotes}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'assessments' && (
                <motion.div 
                  key="assessments"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-slate-400" size={20} />
                      <h4 className="font-bold text-slate-900">Riwayat Penilaian Lengkap</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Urutkan:</span>
                      <select className="text-xs font-bold text-slate-900 bg-slate-50 border-none rounded-lg focus:ring-0 cursor-pointer">
                        <option>Terbaru</option>
                        <option>Terlama</option>
                        <option>Nilai Tertinggi</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">Kelompok</th>
                          <th className="px-6 py-4">Perlombaan</th>
                          <th className="px-6 py-4">Nilai</th>
                          <th className="px-6 py-4">Penilai</th>
                          <th className="px-6 py-4">Keterangan</th>
                          <th className="px-6 py-4">Tanggal Input</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(assessments) ? assessments : []).map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{a.groupName}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                                  <span className="text-sm text-slate-600 font-medium">{a.subject}</span>
                                </div>
                                {a.criteria && (
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                    {Object.entries(a.criteria).map(([key, val]) => (
                                      <span key={key} className="text-[10px] text-slate-400">
                                        <span className="font-semibold">{key}:</span> {val}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-bold px-2 py-0.5 rounded-lg",
                                  a.score >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                )}>
                                  {a.score}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                a.role === 'Peserta' ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                              )}>
                                {a.role || 'Juri'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-500 italic max-w-xs truncate">
                                "{a.notes || 'Tidak ada catatan'}"
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                              {new Date(a.date).toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingAssessment(a)}
                                  className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                  title="Edit Penilaian"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAssessment(a.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus Penilaian"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingAssessment(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Input Nilai Baru</h3>
                  <button 
                    onClick={() => setIsAddingAssessment(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <PlusCircle className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddAssessment} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Kelompok</label>
                    <select 
                      required
                      value={newAssessment.group_id}
                      onChange={(e) => setNewAssessment({...newAssessment, group_id: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                    >
                      <option value="">Pilih Kelompok...</option>
                      {(Array.isArray(groups) ? groups : []).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Perlombaan</label>
                      <select 
                        required
                        value={newAssessment.subject}
                        onChange={(e) => setNewAssessment({...newAssessment, subject: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                      >
                        <option value="">Pilih Perlombaan...</option>
                        {(Array.isArray(subjects) ? subjects : []).map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {Object.keys(newAssessment.criteria).length === 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nilai (0-100)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          required
                          value={newAssessment.score}
                          onChange={(e) => setNewAssessment({...newAssessment, score: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {Object.keys(newAssessment.criteria).length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kriteria Penilaian {newAssessment.subject}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.keys(newAssessment.criteria).map((criterion) => (
                          <div key={criterion}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{criterion}</label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={newAssessment.criteria[criterion as keyof typeof newAssessment.criteria]}
                              onChange={(e) => setNewAssessment({
                                ...newAssessment,
                                criteria: {
                                  ...newAssessment.criteria,
                                  [criterion]: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-top border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Rata-rata Nilai:</span>
                        <span className="text-lg font-black text-brand-600">
                          {Math.round((Object.values(newAssessment.criteria) as number[]).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(newAssessment.criteria).length))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan / Keterangan</label>
                    <textarea 
                      placeholder="Contoh: Ujian Tengah Semester..."
                      value={newAssessment.notes}
                      onChange={(e) => setNewAssessment({...newAssessment, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-95 mt-4"
                  >
                    Simpan Penilaian
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {editingAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAssessment(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Edit Penilaian</h3>
                  <button 
                    onClick={() => setEditingAssessment(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <PlusCircle className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdateAssessment} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kelompok</label>
                    <input 
                      type="text"
                      disabled
                      value={editingAssessment.groupName}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Perlombaan</label>
                      <input 
                        type="text"
                        disabled
                        value={editingAssessment.subject}
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 outline-none cursor-not-allowed"
                      />
                    </div>
                    {(!editingAssessment.criteria || Object.keys(editingAssessment.criteria).length === 0) && (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nilai (0-100)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          required
                          value={editingAssessment.score}
                          onChange={(e) => setEditingAssessment({...editingAssessment, score: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {editingAssessment.criteria && Object.keys(editingAssessment.criteria).length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kriteria Penilaian {editingAssessment.subject}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.keys(editingAssessment.criteria).map((criterion) => (
                          <div key={criterion}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{criterion}</label>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              required
                              value={editingAssessment.criteria?.[criterion]}
                              onChange={(e) => setEditingAssessment({
                                ...editingAssessment,
                                criteria: {
                                  ...editingAssessment.criteria!,
                                  [criterion]: parseInt(e.target.value) || 0
                                }
                              })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-top border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Rata-rata Nilai:</span>
                        <span className="text-lg font-black text-brand-600">
                          {Math.round((Object.values(editingAssessment.criteria) as number[]).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(editingAssessment.criteria).length))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan / Keterangan</label>
                    <textarea 
                      placeholder="Contoh: Ujian Tengah Semester..."
                      value={editingAssessment.notes}
                      onChange={(e) => setEditingAssessment({...editingAssessment, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-95 mt-4"
                  >
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingGroup(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Tambah Kelompok Baru</h3>
                  <button 
                    onClick={() => setIsAddingGroup(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <PlusCircle className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddGroup} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Kelompok</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama kelompok..."
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95 mt-4"
                  >
                    Daftarkan Kelompok
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingSubject(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Tambah Perlombaan Baru</h3>
                  <button 
                    onClick={() => setIsAddingSubject(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <PlusCircle className="rotate-45" size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddSubject} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Perlombaan</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama perlombaan..."
                      value={newSubject.name}
                      onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95 mt-4"
                  >
                    Tambahkan Perlombaan
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQrModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900">Pilih Kelompok ({qrRole})</h3>
                <button 
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-900 mb-2">1. Pilih Perlombaan</p>
                  <select 
                    value={selectedQrSubject}
                    onChange={(e) => {
                      setSelectedQrSubject(e.target.value);
                      setSelectedQrCriteria([]); // Reset criteria when subject changes
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                  >
                    {(Array.isArray(subjects) ? subjects : []).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-900 mb-2">2. Pilih Kelompok</p>
                  <p className="text-xs text-slate-500 mb-3">
                    Pilih maksimal 2 kelompok untuk dinilai sekaligus.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {groups.map((g) => (
                      <label 
                        key={g.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          selectedQrGroups.includes(g.id) 
                            ? "bg-brand-50 border-brand-500 ring-1 ring-brand-500" 
                            : "bg-white border-slate-200 hover:border-brand-300"
                        )}
                      >
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                          checked={selectedQrGroups.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selectedQrGroups.length < 2) {
                                setSelectedQrGroups([...selectedQrGroups, g.id]);
                              }
                            } else {
                              setSelectedQrGroups(selectedQrGroups.filter(id => id !== g.id));
                            }
                          }}
                        />
                        <span className="font-medium text-slate-900">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900 mb-2">3. Pilih Kriteria Penilaian</p>
                  <p className="text-xs text-slate-500 mb-3">
                    Pilih kriteria apa saja yang akan dinilai oleh {qrRole}.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {criteriaList.filter(c => c.subject === selectedQrSubject).map((c) => (
                      <label 
                        key={c.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          selectedQrCriteria.includes(c.name) 
                            ? "bg-brand-50 border-brand-500 ring-1 ring-brand-500" 
                            : "bg-white border-slate-200 hover:border-brand-300"
                        )}
                      >
                        <input 
                          type="checkbox"
                          className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                          checked={selectedQrCriteria.includes(c.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQrCriteria([...selectedQrCriteria, c.name]);
                            } else {
                              setSelectedQrCriteria(selectedQrCriteria.filter(name => name !== c.name));
                            }
                          }}
                        />
                        <div>
                          <span className="font-medium text-slate-900 block">{c.name}</span>
                        </div>
                      </label>
                    ))}
                    {criteriaList.filter(c => c.subject === selectedQrSubject).length === 0 && (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500">
                        Belum ada kriteria untuk perlombaan ini. Tambahkan di Master Kriteria.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
                <button 
                  disabled={selectedQrGroups.length === 0 || selectedQrCriteria.length === 0}
                  onClick={() => {
                    const criteriaParam = encodeURIComponent(selectedQrCriteria.join(','));
                    const subjectParam = encodeURIComponent(selectedQrSubject);
                    const url = `${window.location.origin}${month ? `/${month}` : ''}/judge/${subjectParam}?role=${qrRole}&group_id=${selectedQrGroups.join(',')}&criteria=${criteriaParam}`;
                    setQrData({
                      url,
                      title: `QR Code ${qrRole}`,
                      desc: `Scan untuk menilai kelompok: ${groups.filter(g => selectedQrGroups.includes(g.id)).map(g => g.name).join(', ')}`
                    });
                    setIsQrModalOpen(false);
                  }}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <QrCode size={20} />
                  Generate QR Code
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {qrData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrData(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden text-center"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <QrCode size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{qrData.title}</h3>
                <p className="text-slate-500 text-sm mb-8">{qrData.desc}</p>
                
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block mb-6">
                  <QRCode 
                    value={qrData.url}
                    size={200}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                  />
                </div>

                <button 
                  onClick={() => setQrData(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-xl font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {assessmentDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssessmentDetailsModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900">
                  Detail Penilaian {assessmentDetailsModal.role} - {assessmentDetailsModal.groupName}
                </h3>
                <button
                  onClick={() => setAssessmentDetailsModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {(() => {
                  const fashionSubjectName = subjects[0]?.name || 'Fashion Show';
                  const filteredAssessments = assessments.filter(
                    a => a.group_id === assessmentDetailsModal.groupId &&
                         a.subject === fashionSubjectName &&
                         (assessmentDetailsModal.role === 'Juri' ? (!a.role || a.role === 'Juri') : a.role === 'Peserta')
                  );

                  if (filteredAssessments.length === 0) {
                    return <p className="text-center text-slate-500 py-8">Belum ada penilaian dari {assessmentDetailsModal.role}.</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {filteredAssessments.map(a => (
                        <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {a.notes.replace(new RegExp(`^Dinilai oleh (Juri|Peserta):\\s*`), '') || 'Anonim'}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{a.subject}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(a.date).toLocaleString('id-ID')}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-xl font-black",
                              a.score >= 75 ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {a.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900">{confirmModal.title}</h3>
                <button
                  onClick={() => setConfirmModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600">{confirmModal.message}</p>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {alertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900">{alertModal.title}</h3>
                <button
                  onClick={() => setAlertModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <PlusCircle className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600">{alertModal.message}</p>
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setAlertModal(null)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

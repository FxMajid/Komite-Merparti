import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';
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
  fashionShowStats?: {
    name: string;
    avg: number;
  }[];
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'assessments'>('overview');
  const [groups, setGroups] = useState<Group[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'loading'>('loading');
  const [dbError, setDbError] = useState<string>('');
  const [isAddingAssessment, setIsAddingAssessment] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [loading, setLoading] = useState(true);

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
    criteria: {
      'Kesesuaian dengan tema': 0,
      'Kreativitas': 0,
      'Kelengkapan Kelompok': 0,
      'Ekspresi/Gaya': 0
    }
  });

  const [newGroup, setNewGroup] = useState({
    name: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'kerja') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
      setLoginError('');
    } else {
      setLoginError('Username atau password salah');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, assessmentsRes, summaryRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/assessments'),
        fetch('/api/summary')
      ]);
      
      if (groupsRes.ok && assessmentsRes.ok && summaryRes.ok) {
        const groupsData = await groupsRes.json();
        const assessmentsData = await assessmentsRes.json();
        const summaryData = await summaryRes.json();
        
        setGroups(groupsData);
        setAssessments(assessmentsData);
        setSummary(summaryData);
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
    fetchData();
  }, []);

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalScore = parseInt(newAssessment.score.toString());
      let criteriaData = null;

      if (newAssessment.subject === 'Fashion Show') {
        const scores = Object.values(newAssessment.criteria) as number[];
        const sum = scores.reduce((a, b) => a + b, 0);
        finalScore = Math.round(sum / scores.length);
        criteriaData = newAssessment.criteria;
      }

      const res = await fetch('/api/assessments', {
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
          criteria: {
            'Kesesuaian dengan tema': 0,
            'Kreativitas': 0,
            'Kelengkapan Kelompok': 0,
            'Ekspresi/Gaya': 0
          }
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding assessment:", error);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
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
    if (window.confirm('Apakah Anda yakin ingin menghapus kelompok ini? Semua data penilaian terkait juga akan dihapus.')) {
      try {
        const res = await fetch(`/api/groups/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          console.log("Group deleted successfully:", id);
          fetchData();
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Failed to delete group:", errorData);
          alert(`Gagal menghapus kelompok: ${errorData.message || 'Error tidak diketahui'}`);
        }
      } catch (error) {
        console.error("Error deleting group:", error);
        alert("Terjadi kesalahan saat menghapus kelompok.");
      }
    }
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
              <p className="text-xs text-slate-500 font-medium">Sistem Penilaian</p>
            </div>
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
              {activeTab === 'assessments' && 'Riwayat Penilaian'}
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
              <button 
                onClick={() => activeTab === 'groups' ? setIsAddingGroup(true) : setIsAddingAssessment(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-brand-600/20 active:scale-95"
              >
                <PlusCircle size={18} />
                <span>{activeTab === 'groups' ? 'Tambah Kelompok' : 'Input Nilai'}</span>
              </button>
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
                              const res = await fetch('/api/seed', { method: 'POST' });
                              if (res.ok) {
                                fetchData();
                                alert('Data kelompok berhasil di-seed!');
                              } else {
                                alert('Gagal seeding data. Pastikan Firebase sudah dikonfigurasi.');
                              }
                            } catch (e) {
                              alert('Error saat seeding data.');
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
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="font-bold text-slate-900">Rata-rata per Perlombaan</h4>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={20} /></button>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={summary?.subjectStats || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="avgScore" radius={[6, 6, 0, 0]} barSize={40}>
                              {(summary?.subjectStats || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="font-bold text-slate-900">Distribusi Nilai</h4>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <div className="w-3 h-3 rounded-full bg-brand-500" />
                          <span>Aktif</span>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Array.isArray(assessments) ? assessments.slice(0, 10).reverse() : []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="groupName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#16a34a" 
                              strokeWidth={3} 
                              dot={{ r: 6, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 8, strokeWidth: 0 }}
                              animationDuration={1000}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="font-bold text-slate-900">Analisis Kriteria Fashion Show</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">Rata-rata poin dari seluruh penilaian Fashion Show</p>
                        </div>
                        <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                          <TrendingUp size={20} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={summary?.fashionShowStats || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={8}
                                dataKey="avg"
                                animationBegin={0}
                                animationDuration={1500}
                              >
                                {(summary?.fashionShowStats || []).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {(summary?.fashionShowStats || []).map((s, i) => (
                            <div key={s.name} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-brand-200 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-slate-900">{s.avg.toFixed(1)}</span>
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-500 transition-all duration-1000" 
                                    style={{ width: `${s.avg}%`, backgroundColor: COLORS[i % COLORS.length] }} 
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Status</th>
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
                                          {key.split(' ').map(w => w[0]).join('')}: {val}
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
                              <td className="px-6 py-4 text-sm text-slate-500">
                                {new Date(a.date).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-6 py-4">
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  a.score >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                )}>
                                  {a.score >= 75 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                  {a.score >= 75 ? 'Lulus' : 'Remedial'}
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
                          <th className="px-6 py-4">Keterangan</th>
                          <th className="px-6 py-4">Tanggal Input</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(assessments) ? assessments : []).map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
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
                                        <span className="font-semibold">{key.split(' ').map(w => w[0]).join('')}:</span> {val}
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
                              <p className="text-sm text-slate-500 italic max-w-xs truncate">
                                "{a.notes || 'Tidak ada catatan'}"
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-medium">
                              {new Date(a.date).toLocaleString('id-ID')}
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
                        value={newAssessment.subject}
                        onChange={(e) => setNewAssessment({...newAssessment, subject: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                      >
                        <option>Merpati Ekor Kata</option>
                        <option>Fashion Show</option>
                      </select>
                    </div>
                    {newAssessment.subject !== 'Fashion Show' && (
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

                  {newAssessment.subject === 'Fashion Show' && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Kriteria Penilaian Fashion Show</h5>
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
                          {Math.round((Object.values(newAssessment.criteria) as number[]).reduce((a, b) => a + b, 0) / 4)}
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
      </AnimatePresence>
    </div>
  );
}

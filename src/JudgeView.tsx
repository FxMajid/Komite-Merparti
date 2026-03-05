import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Send, User, Users, Star, Trophy, UserCircle2 } from 'lucide-react';

interface Group {
  id: string;
  name: string;
}

export default function JudgeView() {
  const [searchParams] = useSearchParams();
  const [judgeName, setJudgeName] = useState('');
  // Get role from URL, default to 'Juri' if not present or invalid
  const roleParam = searchParams.get('role');
  const [role, setRole] = useState<'Juri' | 'Peserta'>(
    (roleParam === 'Peserta' || roleParam === 'Juri') ? roleParam : 'Juri'
  );
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group_id') || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [criteria, setCriteria] = useState<Record<string, number>>({
    'Kesesuaian dengan tema': 0,
    'Kreativitas': 0,
    'Kelengkapan Kelompok': 0,
    'Ekspresi/Gaya': 0
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = () => {
    const scores = Object.values(criteria) as number[];
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !judgeName) {
      setError('Mohon lengkapi semua data');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const finalScore = calculateAverage();
      const group = groups.find(g => g.id === selectedGroup);

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          subject: 'Fashion Show',
          score: finalScore,
          notes: `Dinilai oleh ${role}: ${judgeName}`,
          criteria: criteria,
          role: role
        })
      });

      if (res.ok) {
        setSuccess(true);
        setJudgeName('');
        setSelectedGroup('');
        setCriteria({
          'Kesesuaian dengan tema': 0,
          'Kreativitas': 0,
          'Kelengkapan Kelompok': 0,
          'Ekspresi/Gaya': 0
        });
      } else {
        setError('Gagal menyimpan penilaian');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Penilaian Terkirim!</h2>
          <p className="text-slate-500 mb-8">Terima kasih atas penilaian Anda untuk Fashion Show ini.</p>
          <button 
            onClick={() => setSuccess(false)}
            className="text-brand-600 font-bold hover:underline"
          >
            Kirim Penilaian Lain
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200"
      >
        <div className="bg-slate-900 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <Trophy size={24} />
            </div>
            <h1 className="text-xl font-bold">Penilaian Fashion Show</h1>
          </div>
          <p className="text-slate-400 text-sm">Silakan berikan penilaian objektif untuk setiap kelompok.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Role Selection Removed - Role is determined by URL parameter */}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nama {role}
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                required
                placeholder={`Masukkan nama ${role}...`}
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Kelompok</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                required
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all appearance-none"
              >
                <option value="">Pilih Kelompok...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Star className="text-amber-400 fill-amber-400" size={18} />
              Kriteria Penilaian
            </h3>
            
            {Object.keys(criteria).map((criterion) => (
              <div key={criterion} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">{criterion}</label>
                  <span className="text-sm font-bold text-brand-600">{criteria[criterion]}</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={criteria[criterion]}
                  onChange={(e) => setCriteria({
                    ...criteria,
                    [criterion]: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">Total Nilai Rata-rata:</span>
            <span className="text-2xl font-black text-slate-900">{calculateAverage()}</span>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-brand-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="animate-pulse">Menyimpan...</span>
            ) : (
              <>
                <Send size={18} />
                Kirim Penilaian
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

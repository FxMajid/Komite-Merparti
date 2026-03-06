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
  
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [criteria, setCriteria] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    fetchGroups();
    const groupParam = searchParams.get('group_id');
    if (groupParam) {
      const ids = groupParam.split(',').filter(id => id.trim() !== '');
      setSelectedGroupIds(ids);
      
      // Initialize criteria for these groups
      const initialCriteria: Record<string, Record<string, number>> = {};
      ids.forEach(id => {
        initialCriteria[id] = {
          'Kesesuaian dengan tema': 0,
          'Kreativitas': 0,
          'Kelengkapan Kelompok': 0,
          'Ekspresi/Gaya': 0
        };
      });
      setCriteria(initialCriteria);
    }
  }, [searchParams]);

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

  const calculateAverage = (groupId: string) => {
    const groupCriteria = criteria[groupId];
    if (!groupCriteria) return 0;
    const scores = Object.values(groupCriteria) as number[];
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  };

  const handleCriteriaChange = (groupId: string, criterion: string, value: number) => {
    setCriteria(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [criterion]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0 || !judgeName) {
      setError('Mohon lengkapi semua data');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Submit assessments for all selected groups
      const promises = selectedGroupIds.map(async (groupId) => {
        const finalScore = calculateAverage(groupId);
        
        return fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            subject: 'Fashion Show',
            score: finalScore,
            notes: `Dinilai oleh ${role}: ${judgeName}`,
            criteria: criteria[groupId],
            role: role
          })
        });
      });

      const results = await Promise.all(promises);
      const allOk = results.every(res => res.ok);

      if (allOk) {
        setSuccess(true);
        setJudgeName('');
        // Reset criteria
        const resetCriteria: Record<string, Record<string, number>> = {};
        selectedGroupIds.forEach(id => {
          resetCriteria[id] = {
            'Kesesuaian dengan tema': 0,
            'Kreativitas': 0,
            'Kelengkapan Kelompok': 0,
            'Ekspresi/Gaya': 0
          };
        });
        setCriteria(resetCriteria);
      } else {
        setError('Gagal menyimpan sebagian penilaian');
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
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-bold">Memuat data...</div>
      </div>
    );
  }

  if (selectedGroupIds.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Kelompok Tidak Ditemukan</h2>
          <p className="text-slate-500">Scan QR Code yang valid untuk memberikan penilaian.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-xl">
                <Trophy size={24} />
              </div>
              <h1 className="text-xl font-bold">Penilaian Fashion Show</h1>
            </div>
            <p className="text-slate-400 text-sm">Silakan berikan penilaian objektif untuk kelompok yang terpilih.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
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

          {selectedGroupIds.map((groupId, index) => {
            const group = groups.find(g => g.id === groupId);
            if (!group) return null;
            
            return (
              <motion.div 
                key={groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
                      {group.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kelompok</p>
                      <h3 className="font-bold text-slate-900">{group.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata</p>
                    <p className="text-xl font-black text-brand-600">{calculateAverage(groupId)}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {Object.keys(criteria[groupId] || {}).map((criterion) => (
                    <div key={criterion}>
                      <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">{criterion}</label>
                        <span className="text-sm font-bold text-brand-600">{criteria[groupId]?.[criterion] || 0}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={criteria[groupId]?.[criterion] || 0}
                        onChange={(e) => handleCriteriaChange(groupId, criterion, parseInt(e.target.value))}
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
              </motion.div>
            );
          })}

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
                Kirim Semua Penilaian
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

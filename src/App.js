import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Truck, Shield, Phone, Users, MapPin, 
  Plus, AlertCircle, LayoutDashboard, List, Trash2, Download, Car, Droplets, Lightbulb, FileSpreadsheet, ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';

// --- CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'emergency-vehicle-app';

// Define Vehicle Types and their styles
const VEHICLE_TYPES_MAP = {
  'รถตำรวจ': { icon: <ShieldCheck size={16} />, color: 'text-indigo-400', border: 'border-indigo-600', bg: 'bg-indigo-600/10', chartColor: '#6366f1', order: 1 },
  'รถดับเพลิง': { icon: <Truck size={16} />, color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/10', chartColor: '#f87171', order: 2 },
  'รถพยาบาล': { icon: <Shield size={16} />, color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10', chartColor: '#60a5fa', order: 3 },
  'รถกู้ภัย': { icon: <AlertCircle size={16} />, color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-500/10', chartColor: '#fbbf24', order: 4 },
  'รถบรรทุกน้ำ': { icon: <Droplets size={16} />, color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-500/10', chartColor: '#22d3ee', order: 5 },
  'รถตรวจการณ์': { icon: <Car size={16} />, color: 'text-slate-400', border: 'border-slate-500', bg: 'bg-slate-500/10', chartColor: '#94a3b8', order: 6 },
  'รถส่องสว่าง': { icon: <Lightbulb size={16} />, color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/10', chartColor: '#facc15', order: 7 },
};

const VEHICLE_TYPES_LIST = Object.entries(VEHICLE_TYPES_MAP).map(([label, details]) => ({
  label, ...details
})).sort((a, b) => a.order - b.order);

const App = () => {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'รถตำรวจ',
    owner: '',
    staffCount: 1,
    phone: '',
    status: 'อยู่จุดเช็คอิน'
  });

  // Auth Logic
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Data Logic
  useEffect(() => {
    if (!user) return;
    const vCol = collection(db, 'artifacts', appId, 'public', 'data', 'vehicles');
    const unsubscribe = onSnapshot(vCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVehicles(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Unified Sorting Logic
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const orderA = VEHICLE_TYPES_MAP[a.type]?.order || 99;
      const orderB = VEHICLE_TYPES_MAP[b.type]?.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.createdAt.localeCompare(a.createdAt); // If same type, sort by date
    });
  }, [vehicles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const vCol = collection(db, 'artifacts', appId, 'public', 'data', 'vehicles');
      await addDoc(vCol, { 
        ...formData, 
        createdAt: new Date().toISOString(), 
        userId: user.uid 
      });
      setShowForm(false);
      setFormData({ type: 'รถตำรวจ', owner: '', staffCount: 1, phone: '', status: 'อยู่จุดเช็คอิน' });
    } catch (err) { console.error(err); }
  };

  const toggleStatus = async (id, currentStatus) => {
    const vDoc = doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id);
    await updateDoc(vDoc, { status: currentStatus === 'อยู่จุดเช็คอิน' ? 'ออกไปหน้างาน' : 'อยู่จุดเช็คอิน' });
  };

  const deleteVehicle = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id));
  };

  const exportToSheets = () => {
    if (vehicles.length === 0) return;
    const headers = ["ลำดับ", "ประเภทพาหนะ", "หน่วยงาน/เจ้าของ", "จำนวนกำลังพล", "เบอร์โทรศัพท์", "สถานะ", "วันที่บันทึก"];
    const rows = sortedVehicles.map((v, index) => [
      index + 1,
      v.type,
      v.owner,
      v.staffCount,
      v.phone,
      v.status,
      new Date(v.createdAt).toLocaleString('th-TH')
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `emergency_vehicles_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const typeCount = {};
    const statusCount = { 'อยู่จุดเช็คอิน': 0, 'ออกไปหน้างาน': 0 };
    vehicles.forEach(v => {
      typeCount[v.type] = (typeCount[v.type] || 0) + 1;
      statusCount[v.status] = (statusCount[v.status] || 0) + 1;
    });
    return {
      typeData: VEHICLE_TYPES_LIST.map(t => ({ 
        name: t.label, 
        value: typeCount[t.label] || 0, 
        fill: t.chartColor 
      })),
      statusData: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
      totalStaff: vehicles.reduce((acc, curr) => acc + parseInt(curr.staffCount || 0), 0)
    };
  }, [vehicles]);

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-bold uppercase tracking-widest">กำลังเชื่อมต่อฐานข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto z-10 relative">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="animate-in slide-in-from-left duration-700">
            <h1 className="text-xl md:text-2xl font-black text-emerald-400 tracking-tight leading-tight mb-1">
              EMERGENCY TRACKER
            </h1>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20">
                <Truck size={24} className="text-slate-950" />
              </div>
              ระบบบริหารจัดการพาหนะฉุกเฉิน
            </h2>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="group bg-white hover:bg-emerald-400 text-slate-950 px-6 py-4 rounded-xl font-black transition-all shadow-xl shadow-emerald-500/10 flex items-center gap-3 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} /> ลงทะเบียนรถใหม่
          </button>
        </header>

        {/* Navigation & Utilities */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800 backdrop-blur-md w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black transition-all text-xs uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              แดชบอร์ด
            </button>
            <button 
              onClick={() => setActiveTab('list')} 
              className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-black transition-all text-xs uppercase tracking-wider ${activeTab === 'list' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              รายการรถ ({vehicles.length})
            </button>
          </div>

          {activeTab === 'list' && (
            <button 
              onClick={exportToSheets}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700 shadow-lg active:scale-95"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" /> ส่งออกข้อมูล
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          /* Dashboard Content */
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard label="พาหนะทั้งหมด" value={vehicles.length} suffix="คัน" color="border-blue-500" />
              <MetricCard label="กำลังพลรวม" value={stats.totalStaff} suffix="นาย" color="border-emerald-500" />
              <MetricCard label="กำลังปฏิบัติงาน" value={vehicles.filter(v => v.status === 'ออกไปหน้างาน').length} suffix="คัน" color="border-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-6 italic">สถานะรถแต่ละประเภท</h3>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.typeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px'}}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        <LabelList dataKey="value" position="top" fill="#f8fafc" fontSize={12} fontWeight="900" offset={10} />
                        {stats.typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-3 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-sm">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-6 italic text-center">ภาพรวมความพร้อม</h3>
                <div className="h-[320px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.statusData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}>
                        <Cell fill="#10b981" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Unified List View */
          <div className="animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                      <th className="px-6 py-5">#</th>
                      <th className="px-6 py-5">ประเภท / วันที่</th>
                      <th className="px-6 py-5">หน่วยงาน / เจ้าของ</th>
                      <th className="px-6 py-5 text-center">กำลังพล</th>
                      <th className="px-6 py-5 text-center">สถานะปัจจุบัน</th>
                      <th className="px-6 py-5 text-right">เครื่องมือ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {sortedVehicles.map((v, idx) => {
                      const typeStyles = VEHICLE_TYPES_MAP[v.type] || {};
                      return (
                        <tr key={v.id} className="hover:bg-white/[0.02] transition-colors group relative">
                          <td className="px-6 py-5 border-l-4" style={{ borderColor: typeStyles.chartColor || 'transparent' }}>
                            <span className="text-slate-700 font-black tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${typeStyles.bg} ${typeStyles.color} border border-white/5`}>
                                {typeStyles.icon}
                              </div>
                              <div>
                                <div className="font-black text-white text-md tracking-tight">{v.type}</div>
                                <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                  {new Date(v.createdAt).toLocaleDateString('th-TH')} <span className="text-slate-800">•</span> {new Date(v.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-black text-slate-300 leading-tight">{v.owner}</div>
                            <div className="text-[10px] text-emerald-400/80 font-bold flex items-center gap-1 mt-1">
                              <Phone size={10} strokeWidth={3} /> {v.phone}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="inline-flex items-center gap-1.5 font-black text-slate-300 px-3 py-1 bg-slate-800/80 rounded-lg border border-slate-700/50">
                              <Users size={12} className="text-emerald-500" />
                              {v.staffCount}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button 
                              onClick={() => toggleStatus(v.id, v.status)} 
                              className={`min-w-[130px] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all active:scale-95 ${v.status === 'อยู่จุดเช็คอิน' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10' : 'text-orange-400 border-orange-400/30 bg-orange-400/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]'}`}
                            >
                              {v.status === 'ออกไปหน้างาน' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse mr-2" />}
                              {v.status}
                            </button>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => deleteVehicle(v.id)} className="p-2 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {vehicles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="p-6 bg-slate-800/30 rounded-full mb-4">
                    <LayoutDashboard size={48} className="text-slate-800" />
                  </div>
                  <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-xs italic">ไม่มีข้อมูลพาหนะในระบบ</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter">REGISTER</h2>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">เพิ่มข้อมูลพาหนะฉุกเฉิน</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic px-1">ชนิดพาหนะ</label>
                  <div className="relative">
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 appearance-none transition-all">
                      {VEHICLE_TYPES_LIST.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic px-1">หน่วยงาน / สังกัด</label>
                  <input required type="text" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-800 transition-all" placeholder="ระบุสังกัดหรือหน่วยงาน" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic px-1">จำนวนกำลังพล</label>
                    <input required type="number" min="1" value={formData.staffCount} onChange={e => setFormData({...formData, staffCount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic px-1">เบอร์ติดต่อ</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-emerald-500" placeholder="0XX-XXXXXXX" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 py-5 rounded-2xl font-black text-slate-950 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all mt-6 uppercase tracking-widest text-sm">
                  บันทึกข้อมูล
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, suffix, color }) => (
  <div className={`bg-slate-900/60 p-6 rounded-3xl border border-slate-800 border-l-4 ${color} shadow-lg hover:bg-slate-900/80 transition-all flex flex-col justify-center min-h-[120px]`}>
    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 italic">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-5xl font-black text-white tracking-tighter leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{suffix}</span>
    </div>
  </div>
);

export default App;

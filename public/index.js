import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Truck, Shield, Phone, Users, MapPin, 
  Plus, AlertCircle, LayoutDashboard, List, Trash2, Download, Car, Droplets, Lightbulb
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

const VEHICLE_TYPES = [
  { id: 'fire', label: 'รถดับเพลิง', icon: <Truck size={18} />, color: 'text-red-400', bg: 'bg-red-500/20', chartColor: '#f87171' },
  { id: 'ambulance', label: 'รถพยาบาล', icon: <Shield size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/20', chartColor: '#60a5fa' },
  { id: 'rescue', label: 'รถกู้ภัย', icon: <AlertCircle size={18} />, color: 'text-amber-400', bg: 'bg-amber-500/20', chartColor: '#fbbf24' },
  { id: 'water', label: 'รถบรรทุกน้ำ', icon: <Droplets size={18} />, color: 'text-cyan-400', bg: 'bg-cyan-500/20', chartColor: '#22d3ee' },
  { id: 'patrol', label: 'รถตรวจการณ์', icon: <Car size={18} />, color: 'text-indigo-400', bg: 'bg-indigo-500/20', chartColor: '#818cf8' },
  { id: 'light', label: 'รถส่องสว่าง', icon: <Lightbulb size={18} />, color: 'text-yellow-400', bg: 'bg-yellow-500/20', chartColor: '#facc15' },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'รถดับเพลิง',
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
      setFormData({ type: 'รถดับเพลิง', owner: '', staffCount: 1, phone: '', status: 'อยู่จุดเช็คอิน' });
    } catch (err) { console.error(err); }
  };

  const toggleStatus = async (id, currentStatus) => {
    const vDoc = doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id);
    await updateDoc(vDoc, { status: currentStatus === 'อยู่จุดเช็คอิน' ? 'ออกไปหน้างาน' : 'อยู่จุดเช็คอิน' });
  };

  const deleteVehicle = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vehicles', id));
  };

  const stats = useMemo(() => {
    const typeCount = {};
    const statusCount = { 'อยู่จุดเช็คอิน': 0, 'ออกไปหน้างาน': 0 };
    vehicles.forEach(v => {
      typeCount[v.type] = (typeCount[v.type] || 0) + 1;
      statusCount[v.status] = (statusCount[v.status] || 0) + 1;
    });
    return {
      typeData: Object.entries(typeCount).map(([name, value]) => ({ 
        name, value, fill: VEHICLE_TYPES.find(t => t.label === name)?.chartColor || '#10b981' 
      })),
      statusData: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
      totalStaff: vehicles.reduce((acc, curr) => acc + parseInt(curr.staffCount || 0), 0)
    };
  }, [vehicles]);

  // Label for Pie Chart with Numbers
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return value > 0 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-black">
        {value}
      </text>
    ) : null;
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-bold uppercase tracking-widest">กำลังเชื่อมต่อฐานข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto z-10 relative">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="animate-in slide-in-from-left duration-700">
            <h1 className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight leading-tight mb-2 drop-shadow-sm">
              EMERGENCY TRACKER
            </h1>
            <h2 className="text-4xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-xl">
                <Truck size={36} className="text-slate-950" />
              </div>
              ระบบบริหารจัดการพาหนะฉุกเฉินระดับปฏิบัติการ
            </h2>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="group bg-white hover:bg-emerald-400 text-slate-950 px-8 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-emerald-500/10 flex items-center gap-3 active:scale-95"
          >
            <Plus size={24} strokeWidth={3} /> ลงทะเบียนรถใหม่
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-10 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-8 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider ${activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
          >
            แดชบอร์ด
          </button>
          <button 
            onClick={() => setActiveTab('list')} 
            className={`px-8 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-wider ${activeTab === 'list' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
          >
            รายการรถ ({vehicles.length})
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Metric Cards - Enhanced Sizes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <MetricCard label="พาหนะทั้งหมด" value={vehicles.length} suffix="คัน" color="border-blue-500" />
              <MetricCard label="กำลังพลรวม" value={stats.totalStaff} suffix="นาย" color="border-emerald-500" />
              <MetricCard label="กำลังออกปฏิบัติงาน" value={vehicles.filter(v => v.status === 'ออกไปหน้างาน').length} suffix="จุด" color="border-orange-500" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Type Chart */}
              <div className="lg:col-span-7 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-8 italic">สถิติประเภทพาหนะ</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.typeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px'}}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={45}>
                        <LabelList dataKey="value" position="top" fill="#f8fafc" fontSize={13} fontWeight="900" offset={12} />
                        {stats.typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Chart */}
              <div className="lg:col-span-5 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-8 italic text-center">สถานะความพร้อม</h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={stats.statusData} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={100} 
                        paddingAngle={10} 
                        label={renderCustomLabel} 
                        labelLine={false}
                        stroke="none"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{paddingTop: '30px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                    <th className="px-8 py-7 text-emerald-500/80">ข้อมูลพาหนะ</th>
                    <th className="px-8 py-7">กำลังพล</th>
                    <th className="px-8 py-7 text-center">สถานะความพร้อม</th>
                    <th className="px-8 py-7 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {vehicles.length === 0 ? (
                    <tr><td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-bold italic tracking-wide">ยังไม่มีข้อมูลในฐานข้อมูล</td></tr>
                  ) : vehicles.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(v => (
                    <tr key={v.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="font-black text-white text-lg tracking-tight mb-1">{v.type}</div>
                        <div className="text-xs text-slate-500 font-black uppercase tracking-wider">{v.owner}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 font-black text-slate-300">
                          <Users size={16} className="text-emerald-500" />
                          {v.staffCount} <span className="text-[10px] text-slate-600 font-normal">นาย</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button 
                          onClick={() => toggleStatus(v.id, v.status)} 
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all active:scale-90 ${v.status === 'อยู่จุดเช็คอิน' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5 hover:bg-emerald-400/10' : 'text-orange-400 border-orange-400/20 bg-orange-400/5 animate-pulse'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                             <MapPin size={12} /> {v.status}
                          </div>
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => deleteVehicle(v.id)} className="p-3 text-slate-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-red-500/0 hover:bg-red-500/10 rounded-xl">
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 overflow-hidden relative">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter">REGISTER VEHICLE</h2>
                  <div className="h-1 w-12 bg-emerald-500 mt-1"></div>
                </div>
                <button onClick={() => setShowForm(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-500 hover:text-white transition-all">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">ชนิดรถฉุกเฉิน</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none transition-all appearance-none">
                      {VEHICLE_TYPES.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">หน่วยงานเจ้าของ</label>
                    <input required type="text" placeholder="ระบุชื่อหน่วยงาน..." value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">กำลังพล (นาย)</label>
                      <input required type="number" min="1" value={formData.staffCount} onChange={e => setFormData({...formData, staffCount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">เบอร์ติดต่อ</label>
                      <input required type="tel" placeholder="0XX-XXXXXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 py-5 rounded-2xl font-black text-slate-950 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-6 uppercase tracking-widest italic">
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

// Sub-component for Dashboard Metrics with Enlarged Sizes
const MetricCard = ({ label, value, suffix, color }) => (
  <div className={`bg-slate-900/60 p-10 rounded-[2.5rem] border border-slate-800 border-l-[12px] ${color} shadow-2xl hover:translate-y-[-8px] transition-all flex flex-col justify-center min-h-[220px]`}>
    <p className="text-sm font-black text-emerald-400/80 uppercase tracking-[0.25em] mb-6 italic">{label}</p>
    <div className="flex items-baseline gap-5">
      <span className="text-8xl font-black text-white tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
        {value}
      </span>
      <span className="text-2xl font-black text-slate-500 uppercase tracking-widest">{suffix}</span>
    </div>
  </div>
);
export default App;

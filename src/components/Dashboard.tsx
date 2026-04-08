import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { Activity, Zap, Heart, ShieldCheck, History, Trash2, Calendar, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, collection, query, where, onSnapshot, orderBy, limit, deleteDoc, doc, handleFirestoreError, OperationType, Timestamp } from '../firebase';

const data = [
  { name: 'Mon', intake: 1800, metabolic: 1600 },
  { name: 'Tue', intake: 2100, metabolic: 1750 },
  { name: 'Wed', intake: 1950, metabolic: 1800 },
  { name: 'Thu', intake: 2400, metabolic: 1900 },
  { name: 'Fri', intake: 2200, metabolic: 1850 },
  { name: 'Sat', intake: 2600, metabolic: 2100 },
  { name: 'Sun', intake: 2000, metabolic: 1700 },
];

const micronutrients = [
  { name: 'Vit A', value: 85, color: '#5A5A40' },
  { name: 'Iron', value: 62, color: '#8E8D8A' },
  { name: 'Zinc', value: 92, color: '#D4AF37' },
  { name: 'Calcium', value: 74, color: '#1A1A1A' },
];

interface DashboardProps {
  searchQuery?: string;
  onIntervention?: (title: string, type: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ searchQuery = '', onIntervention }) => {
  const [meals, setMeals] = useState<any[]>([]);
  const [biometrics, setBiometrics] = useState<any>(null);
  const [biometricHistory, setBiometricHistory] = useState<Array<{ heartRate: number; metabolicRate: number }>>([]);
  const [recentInterventions, setRecentInterventions] = useState<any[]>([]);
  const [interventionTypes, setInterventionTypes] = useState<any[]>([]);
  
  // Date filtering state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch Interventions
    const intQuery = query(
      collection(db, 'interventions'),
      where('uid', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(5)
    );

    const unsubscribeInt = onSnapshot(intQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentInterventions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interventions');
    });

    // Fetch Intervention Types
    const unsubscribeTypes = onSnapshot(collection(db, 'intervention_types'), (snapshot) => {
      setInterventionTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'intervention_types');
    });

    return () => {
      unsubscribeInt();
      unsubscribeTypes();
    };
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch Meals
    let constraints: any[] = [
      where('uid', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(50)
    ];

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      constraints.push(where('created_at', '>=', Timestamp.fromDate(start)));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      constraints.push(where('created_at', '<=', Timestamp.fromDate(end)));
    }

    const mealsQuery = query(
      collection(db, 'meals'),
      ...constraints
    );

    const unsubscribeMeals = onSnapshot(mealsQuery, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        created_at: (doc.data() as any).created_at?.toDate()?.toISOString() || new Date().toISOString()
      })) as any[];

      if (searchQuery) {
        data = data.filter(m => 
          m.foodName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.predictiveRisk?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setMeals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meals');
    });

    return () => unsubscribeMeals();
  }, [searchQuery, startDate, endDate]);

  const deleteMeal = async (id: string) => {
    if (!confirm("Are you sure you want to remove this record?")) return;
    try {
      await deleteDoc(doc(db, 'meals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `meals/${id}`);
    }
  };

  useEffect(() => {
    // Keep biometrics as mock for now or fetch from a service
    const fetchBiometrics = async () => {
      const nextBiometrics = {
        heartRate: 68 + Math.floor(Math.random() * 10),
        metabolicRate: 1400 + Math.floor(Math.random() * 200)
      };
      setBiometrics(nextBiometrics);
      setBiometricHistory((history) => [
        nextBiometrics,
        ...history.slice(0, 11)
      ]);
    };
    fetchBiometrics();
    const interval = setInterval(fetchBiometrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const averageHeartRate = biometricHistory.length > 0
    ? Math.round(biometricHistory.reduce((sum, item) => sum + item.heartRate, 0) / biometricHistory.length)
    : biometrics?.heartRate ?? 72;

  const averageIntake = meals.length > 0
    ? meals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / meals.length
    : 1800;

  const averageRisk = meals.length > 0
    ? meals.reduce((sum, meal) => {
        const risk = (meal.predictiveRisk || '').toString().toLowerCase();
        if (risk.includes('deficiency')) return sum + 32;
        if (risk.includes('high')) return sum + 24;
        if (risk.includes('moderate')) return sum + 14;
        if (risk.includes('low')) return sum + 6;
        return sum + 16;
      }, 0) / meals.length
    : 12;

  const averageNutrientBreadth = meals.length > 0
    ? meals.reduce((sum, meal) => sum + (meal.nutrients ? Object.keys(meal.nutrients).length : 0), 0) / meals.length
    : 5;

  const averageProteinRatio = meals.length > 0
    ? meals.reduce((sum, meal) => {
        const proteinValue = meal.macronutrients?.protein ?? meal.nutrients?.protein;
        const proteinGrams = typeof proteinValue === 'number'
          ? proteinValue
          : typeof proteinValue === 'string'
            ? parseFloat(proteinValue.replace(/[^\d.]/g, '')) || 0
            : 0;
        return sum + proteinGrams / Math.max(1, meal.calories || 1);
      }, 0) / meals.length
    : 0.12;

  const energyBalance = averageIntake / Math.max(1, biometrics?.metabolicRate ?? 1500);
  const demandAlignment = 1 - Math.min(1, Math.abs(1 - energyBalance));
  const rawMetabolicEfficiency = 70 + demandAlignment * 16 - averageRisk * 0.35 + averageNutrientBreadth * 1.5;
  const metabolicEfficiency = Math.round(Math.min(98, Math.max(56, rawMetabolicEfficiency)));

  const rawNutrientDensity = 70 + averageNutrientBreadth * 2.4 + averageProteinRatio * 120 - averageRisk * 0.4 + (averageRisk <= 10 ? 6 : 0);
  const nutrientDensityScore = Math.round(Math.min(98, Math.max(56, rawNutrientDensity)));
  const nutrientDensityGrade = nutrientDensityScore >= 92 ? 'A'
    : nutrientDensityScore >= 86 ? 'A-'
    : nutrientDensityScore >= 80 ? 'B+'
    : nutrientDensityScore >= 72 ? 'B'
    : 'C';

  const activeBurn = (() => {
    const base = biometrics?.metabolicRate ?? 1450;
    const adjustment = Math.round((averageIntake - base) * 0.12);
    return Math.round(Math.min(base + 140, Math.max(base - 90, base + adjustment)));
  })();

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Metabolic Efficiency', value: `${metabolicEfficiency}%`, icon: Zap, color: 'text-emerald-600' },
          { label: 'Nutrient Density', value: nutrientDensityGrade, icon: ShieldCheck, color: 'text-aura-accent' },
          { label: 'Heart Rate (Avg)', value: `${averageHeartRate} bpm`, icon: Heart, color: 'text-rose-500' },
          { label: 'Active Burn', value: `${activeBurn} kcal`, icon: Activity, color: 'text-blue-500' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="luxury-card flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <stat.icon className={stat.color} size={24} />
              <span className="text-[10px] uppercase tracking-widest text-aura-muted font-bold">Live Sync</span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-serif">{stat.value}</h3>
              <p className="text-xs text-aura-muted uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="luxury-card">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-serif">Metabolic Correlation</h2>
            <div className="flex space-x-4 text-[10px] uppercase tracking-widest font-bold">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-aura-accent mr-2"></span> Intake</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-aura-muted mr-2"></span> Demand</span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#8E8D8A'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141718', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                  itemStyle={{ color: '#F5F2ED' }}
                />
                <Area type="monotone" dataKey="intake" stroke="#C5A059" fillOpacity={1} fill="url(#colorIntake)" strokeWidth={2} />
                <Area type="monotone" dataKey="metabolic" stroke="#8E8D8A" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="luxury-card">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <History className="text-aura-accent" size={20} />
              <h2 className="text-2xl font-serif">Meal History</h2>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-all ${showFilters ? 'bg-aura-gold text-aura-bg' : 'text-aura-muted hover:bg-aura-ink/5'}`}
            >
              <Filter size={18} />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-aura-bg/50 border border-aura-ink/5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted flex items-center">
                      <Calendar size={10} className="mr-1" /> Start Date
                    </label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-transparent border-none text-xs focus:ring-0 p-0 text-aura-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted flex items-center">
                      <Calendar size={10} className="mr-1" /> End Date
                    </label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-transparent border-none text-xs focus:ring-0 p-0 text-aura-ink"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="col-span-2 text-[10px] uppercase tracking-widest font-bold text-rose-500 hover:text-rose-600 text-center mt-2"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {meals.length > 0 ? meals.map((meal, i) => (
              <div key={meal.id} className="flex items-center justify-between p-4 rounded-2xl bg-aura-bg/30 border border-white/5">
                <div>
                  <p className="font-serif text-lg">{meal.foodName}</p>
                  <p className="text-[10px] uppercase tracking-widest text-aura-muted">{new Date(meal.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center">
                  <div className="text-right">
                    <p className="text-sm font-bold">{meal.calories} kcal</p>
                    <p className="text-[10px] uppercase tracking-widest text-aura-gold font-bold">{meal.predictiveRisk}</p>
                  </div>
                  <button 
                    onClick={() => deleteMeal(meal.id)}
                    className="ml-4 p-2 text-aura-muted hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-aura-muted py-12">
                <History size={48} strokeWidth={1} className="mb-2 opacity-20" />
                <p className="text-sm italic">No ingestion history recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="luxury-card bg-aura-accent text-white border-aura-gold/20">
        <div className="flex items-start justify-between">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase tracking-widest font-bold text-aura-gold">AI Predictive Engine</div>
            <h2 className="text-4xl font-serif">Latent Deficiency Alert</h2>
            <p className="text-white/60 leading-relaxed italic">
              {interventionTypes.length > 0 
                ? `"${interventionTypes[0].description}"`
                : `"Current metabolic trends suggest a potential sub-clinical Vitamin D deficiency within the next 14 days if intake patterns persist. Recommended micro-intervention: Increase fatty fish or fortified dairy intake by 15%."`
              }
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              {interventionTypes.length > 0 ? (
                interventionTypes.slice(0, 2).map(type => (
                  <button 
                    key={type.id}
                    onClick={() => onIntervention?.(type.name, type.name)}
                    className="px-8 py-3 rounded-full bg-aura-gold text-aura-bg text-xs uppercase tracking-widest font-bold hover:bg-aura-ink hover:text-aura-bg transition-all duration-500 shadow-xl shadow-aura-gold/20"
                  >
                    Apply {type.name}
                  </button>
                ))
              ) : (
                <button 
                  onClick={() => onIntervention?.("Vitamin D Optimization", "Nutritional")}
                  className="px-8 py-3 rounded-full bg-aura-gold text-aura-bg text-xs uppercase tracking-widest font-bold hover:bg-aura-ink hover:text-aura-bg transition-all duration-500 shadow-xl shadow-aura-gold/20"
                >
                  Apply Micro-Intervention
                </button>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-32 h-32 rounded-full border border-white/20 flex items-center justify-center relative">
              <div className="absolute inset-0 animate-pulse bg-aura-gold/20 rounded-full blur-xl"></div>
              <ShieldCheck size={48} className="text-aura-gold" />
            </div>
          </div>
        </div>
      </div>
      {/* Recent Interventions */}
      {recentInterventions.length > 0 && (
        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-aura-accent" size={24} />
            <h2 className="text-2xl font-serif">Active Interventions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentInterventions.map(item => (
              <div key={item.id} className="p-4 rounded-xl bg-aura-bg border border-aura-ink/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{item.title}</p>
                  <p className="text-[10px] uppercase tracking-widest text-aura-muted">{item.type}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[8px] uppercase font-bold">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

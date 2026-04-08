import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, BarChart3, Database, ShieldAlert, AlertTriangle, Database as DatabaseIcon, Loader2, Plus, Trash2, Activity, Info } from 'lucide-react';
import { auth, db, collection, onSnapshot, query, setDoc, doc, handleFirestoreError, OperationType, deleteDoc, serverTimestamp } from '../firebase';

interface AdminCenterProps {
  onExport?: () => void;
}

export const AdminCenter: React.FC<AdminCenterProps> = ({ onExport }) => {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [rda, setRda] = useState<any[]>([]);
  const [interventionTypes, setInterventionTypes] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // New Intervention Type Form
  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [newType, setNewType] = useState({
    name: '',
    description: '',
    target_metrics: ''
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Check if admin
    const profileRef = doc(db, 'user_profiles', user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsAdmin(data.role === 'admin' || user.email === 'charanchowdary342@gmail.com');
      }
    });

    // Fetch Cohorts
    const unsubscribeCohorts = onSnapshot(collection(db, 'cohorts'), (snapshot) => {
      setCohorts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cohorts');
    });

    // Fetch RDA Standards
    const unsubscribeRda = onSnapshot(collection(db, 'rda_standards'), (snapshot) => {
      setRda(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rda_standards');
    });

    // Fetch Intervention Types
    const unsubscribeInterventionTypes = onSnapshot(collection(db, 'intervention_types'), (snapshot) => {
      setInterventionTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'intervention_types');
    });

    return () => {
      unsubscribeProfile();
      unsubscribeCohorts();
      unsubscribeRda();
      unsubscribeInterventionTypes();
    };
  }, []);

  const seedData = async () => {
    setIsSeeding(true);
    try {
      const initialCohorts = [
        { name: 'Pediatric (0-12)', deficiency_risk: 12, metabolic_efficiency: 98 },
        { name: 'Adolescent (13-19)', deficiency_risk: 24, metabolic_efficiency: 92 },
        { name: 'Adult (20-60)', deficiency_risk: 18, metabolic_efficiency: 88 },
        { name: 'Geriatric (60+)', deficiency_risk: 35, metabolic_efficiency: 76 },
      ];

      const initialRda = [
        { age_group: 'Adult', nutrient: 'Vitamin D', value: 400, rda: 600, unit: 'IU' },
        { age_group: 'Adult', nutrient: 'Magnesium', value: 310, rda: 400, unit: 'mg' },
        { age_group: 'Adult', nutrient: 'Zinc', value: 8, rda: 11, unit: 'mg' },
      ];

      const initialInterventionTypes = [
        { name: 'Nutritional', description: 'Precision dietary adjustments based on metabolic demand.', target_metrics: ['Calories', 'Vitamin D', 'Iron'], created_at: serverTimestamp() },
        { name: 'Exercise', description: 'Targeted physical activity to optimize metabolic rate.', target_metrics: ['Heart Rate', 'Active Burn'], created_at: serverTimestamp() },
      ];

      for (const c of initialCohorts) {
        await setDoc(doc(collection(db, 'cohorts')), c);
      }
      for (const r of initialRda) {
        await setDoc(doc(collection(db, 'rda_standards')), r);
      }
      for (const t of initialInterventionTypes) {
        await setDoc(doc(collection(db, 'intervention_types')), t);
      }
      alert("Initial data seeded successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'admin_seed');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddInterventionType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.name || !newType.description) return;

    try {
      const typeData = {
        name: newType.name,
        description: newType.description,
        target_metrics: newType.target_metrics.split(',').map(m => m.trim()).filter(m => m),
        created_at: serverTimestamp()
      };
      await setDoc(doc(collection(db, 'intervention_types')), typeData);
      setNewType({ name: '', description: '', target_metrics: '' });
      setShowNewTypeModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'intervention_types');
    }
  };

  const deleteInterventionType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this intervention type?")) return;
    try {
      await deleteDoc(doc(db, 'intervention_types', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `intervention_types/${id}`);
    }
  };

  const handleExport = async () => {
    try {
      const data = JSON.stringify({ cohorts, rda, interventionTypes }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auranutrics_export_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      onExport?.();
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 luxury-card">
        <AlertTriangle className="text-rose-500 mb-4" size={48} />
        <h2 className="text-2xl font-serif mb-2">Access Restricted</h2>
        <p className="text-aura-muted text-sm">Administrative privileges required for this terminal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-serif mb-2">Command Center</h1>
          <p className="text-aura-muted uppercase tracking-[0.2em] text-xs">Global RDA Benchmarking & Cohort Analytics</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={seedData}
            disabled={isSeeding}
            className="px-6 py-3 rounded-full border border-aura-ink/10 flex items-center space-x-2 hover:bg-aura-ink/5 transition-all disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="animate-spin" size={16} /> : <DatabaseIcon size={16} />}
            <span className="text-[10px] uppercase tracking-widest font-bold">Seed Data</span>
          </button>
          <div className="px-6 py-3 rounded-full border border-aura-ink/10 flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-bold">System Nominal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cohort Analytics */}
        <div className="lg:col-span-2 space-y-8">
          <div className="luxury-card">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <Users className="text-aura-accent" size={20} />
                <h2 className="text-2xl font-serif">Cohort Performance</h2>
              </div>
              <button 
                onClick={handleExport}
                className="text-[10px] uppercase tracking-widest font-bold text-aura-muted hover:text-aura-gold transition-colors"
              >
                Export Dataset
              </button>
            </div>
            
            <div className="space-y-6">
              {cohorts.map((cohort, i) => (
                <motion.div 
                  key={cohort.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-aura-bg/30 border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-serif text-xl">{cohort.name}</h4>
                    <p className="text-xs text-aura-muted uppercase tracking-wider">Metabolic Efficiency: {cohort.metabolic_efficiency}%</p>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-aura-muted font-bold">Deficiency Risk</p>
                      <p className={`text-lg font-serif ${cohort.deficiency_risk > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {cohort.deficiency_risk}%
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-aura-gold" 
                        style={{ width: `${cohort.metabolic_efficiency}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Intervention Types Management */}
          <div className="luxury-card">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <Activity className="text-aura-accent" size={20} />
                <h2 className="text-2xl font-serif">Intervention Protocols</h2>
              </div>
              <button 
                onClick={() => setShowNewTypeModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-aura-gold text-aura-bg text-[10px] uppercase tracking-widest font-bold hover:bg-aura-ink hover:text-aura-bg transition-all"
              >
                <Plus size={14} />
                <span>New Protocol</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interventionTypes.map((type, i) => (
                <motion.div 
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 rounded-2xl bg-aura-bg/30 border border-white/5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-serif text-xl">{type.name}</h4>
                      <button 
                        onClick={() => deleteInterventionType(type.id)}
                        className="p-2 text-aura-muted hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-aura-muted leading-relaxed mb-4">{type.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {type.target_metrics?.map((metric: string) => (
                        <span key={metric} className="px-2 py-1 rounded-md bg-white/5 text-[8px] uppercase tracking-widest font-bold text-aura-gold">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* RDA Benchmarks */}
        <div className="luxury-card h-fit">
          <div className="flex items-center space-x-3 mb-8">
            <BarChart3 className="text-aura-accent" size={20} />
            <h2 className="text-2xl font-serif">RDA Benchmarks</h2>
          </div>
          
          <div className="space-y-8">
            {rda.map((item, i) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs uppercase tracking-widest font-bold text-aura-muted">{item.nutrient} ({item.age_group})</span>
                  <span className="text-sm font-serif">{item.value} / {item.rda} {item.unit}</span>
                </div>
                <div className="h-1 w-full bg-aura-ink/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / item.rda) * 100}%` }}
                    className="h-full bg-aura-gold"
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-aura-accent text-aura-ink space-y-4">
            <div className="flex items-center space-x-2 text-aura-gold">
              <ShieldAlert size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Security Protocol</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              All cohort data is AES-256 encrypted at rest. Predictive models are validated against clinical RDA standards.
            </p>
          </div>
        </div>
      </div>

      {/* New Intervention Type Modal */}
      <AnimatePresence>
        {showNewTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTypeModal(false)}
              className="absolute inset-0 bg-aura-bg/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg luxury-card bg-aura-bg border-aura-gold/20 p-8"
            >
              <h2 className="text-3xl font-serif mb-6">New Intervention Protocol</h2>
              <form onSubmit={handleAddInterventionType} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Protocol Name</label>
                  <input 
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                    placeholder="e.g. Circadian Optimization"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-aura-gold transition-colors"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Description</label>
                  <textarea 
                    value={newType.description}
                    onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                    placeholder="Describe the clinical objective..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-aura-gold transition-colors h-24 resize-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Target Metrics (comma separated)</label>
                  <input 
                    type="text"
                    value={newType.target_metrics}
                    onChange={(e) => setNewType({ ...newType, target_metrics: e.target.value })}
                    placeholder="e.g. Sleep Quality, Cortisol, Heart Rate"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-aura-gold transition-colors"
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewTypeModal(false)}
                    className="flex-1 py-4 rounded-full border border-aura-ink/10 text-[10px] uppercase tracking-widest font-bold hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-full bg-aura-gold text-aura-bg text-[10px] uppercase tracking-widest font-bold hover:bg-aura-ink hover:text-aura-bg transition-all shadow-xl shadow-aura-gold/20"
                  >
                    Deploy Protocol
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

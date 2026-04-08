import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Camera, Sparkles, ShieldCheck, Settings, Bell, Search, User, X, CheckCircle, LogOut, Menu } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { VisionIngestion } from './components/VisionIngestion';
import { AdminCenter } from './components/AdminCenter';
import { LoginPage } from './components/LoginPage';
import { UserProfile } from './components/UserProfile';
import { AuraAI } from './components/AuraAI';
import { NutritionalAnalysis } from './services/geminiService';
import { auth, db, onAuthStateChanged, signOut, collection, query, where, onSnapshot, FirebaseUser, handleFirestoreError, OperationType, setDoc, doc, serverTimestamp } from './firebase';

type View = 'dashboard' | 'vision' | 'ai' | 'admin' | 'profile';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [lastAnalysis, setLastAnalysis] = useState<NutritionalAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ age_group: 'pediatric' });
  const [toast, setToast] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (firebaseUser) {
        showToast(`Welcome back, ${firebaseUser.displayName || 'User'}`);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isAuthReady) {
      // Fetch Notifications
      const q = query(collection(db, 'notifications'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      });

      // Fetch Settings (from user profile or a settings collection)
      const settingsRef = doc(db, 'user_profiles', user.uid);
      const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSettings({ age_group: data.age_group || 'pediatric' });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `user_profiles/${user.uid}`);
      });

      return () => {
        unsubscribe();
        unsubscribeSettings();
      };
    }
  }, [user, isAuthReady]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast("Session terminated.");
    } catch (error) {
      showToast("Logout failed.");
    }
  };

  const handleUpdateSettings = async (key: string, value: string) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(profileRef, { [key]: value, updated_at: serverTimestamp() }, { merge: true });
      showToast(`Settings updated: ${key} set to ${value}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `user_profiles/${user.uid}`);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const markNotificationsRead = async () => {
    if (!user) return;
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const n of unreadNotifications) {
        const nRef = doc(db, 'notifications', n.id);
        await setDoc(nRef, { is_read: true }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleAnalysisComplete = async (analysis: NutritionalAnalysis) => {
    if (!user) return;
    setLastAnalysis(analysis);
    setActiveView('dashboard');
    
    try {
      const mealRef = doc(collection(db, 'meals'));
      await setDoc(mealRef, {
        ...analysis,
        uid: user.uid,
        created_at: serverTimestamp()
      });

      // Auto-generate notification for high risk
      if (analysis.predictiveRisk.toLowerCase().includes("high") || analysis.predictiveRisk.toLowerCase().includes("deficiency")) {
        const nRef = doc(collection(db, 'notifications'));
        await setDoc(nRef, {
          uid: user.uid,
          title: "Nutritional Risk",
          message: `High risk detected in recent ingestion: ${analysis.foodName}`,
          type: "warning",
          is_read: false,
          created_at: serverTimestamp()
        });
      }

      showToast("Meal analysis saved successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'meals');
      showToast("Error saving meal analysis.");
    }
  };

  const handleIntervention = async (title: string, type: string) => {
    if (!user) return;
    try {
      const intRef = doc(collection(db, 'interventions'));
      await setDoc(intRef, {
        uid: user.uid,
        title,
        type,
        status: "Active",
        created_at: serverTimestamp()
      });
      showToast(`Applied: ${title}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interventions');
      showToast("Failed to apply intervention.");
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-aura-bg flex items-center justify-center"><Sparkles className="animate-pulse text-aura-gold" size={48} /></div>;
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={() => {}} />
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 bg-aura-ink text-white rounded-full shadow-2xl z-[200] flex items-center space-x-3"
            >
              <CheckCircle size={18} className="text-aura-gold" />
              <span className="text-xs font-bold tracking-wider">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-aura-bg">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="md:hidden fixed top-6 left-6 z-[51] p-2 bg-aura-card rounded-xl text-aura-gold border border-aura-ink/10"
      >
        <Menu size={24} strokeWidth={1.5} />
      </button>

      {/* Sidebar Navigation - Desktop */}
      <nav className="hidden md:flex w-24 border-r border-aura-ink/5 flex-col items-center py-12 space-y-12 fixed h-full bg-aura-card z-50">
        <div className="w-12 h-12 rounded-2xl bg-aura-ink flex items-center justify-center text-aura-bg font-serif text-2xl shadow-xl shadow-black/40">
          A
        </div>
        
        <div className="flex-1 flex flex-col space-y-8">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'vision', icon: Camera },
            { id: 'ai', icon: Sparkles },
            { id: 'admin', icon: ShieldCheck },
            { id: 'profile', icon: User },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`p-4 rounded-2xl transition-all duration-500 ${
                activeView === item.id 
                  ? 'bg-aura-bg text-aura-gold shadow-inner' 
                  : 'text-aura-muted hover:text-aura-gold hover:bg-aura-bg/50'
              }`}
            >
              <item.icon size={24} strokeWidth={1.5} />
            </button>
          ))}
        </div>

        <button 
          onClick={handleLogout}
          className="p-4 text-aura-muted hover:text-rose-500 transition-colors mt-auto mb-8"
          title="Logout"
        >
          <LogOut size={24} strokeWidth={1.5} />
        </button>
      </nav>

      {/* Mobile Sidebar Navigation */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-[49]"
            />
            <motion.nav 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="md:hidden fixed left-0 top-0 h-full w-64 bg-aura-card border-r border-aura-ink/5 flex flex-col py-6 px-6 z-[50]"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="w-10 h-10 rounded-2xl bg-aura-ink flex items-center justify-center text-aura-bg font-serif text-lg shadow-xl shadow-black/40">
                  A
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 hover:bg-aura-bg rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col space-y-2">
                {[
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                  { id: 'vision', icon: Camera, label: 'Vision' },
                  { id: 'ai', icon: Sparkles, label: 'AI Assistant' },
                  { id: 'admin', icon: ShieldCheck, label: 'Admin' },
                  { id: 'profile', icon: User, label: 'Profile' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as View);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                      activeView === item.id 
                        ? 'bg-aura-bg text-aura-gold' 
                        : 'text-aura-muted hover:text-aura-gold hover:bg-aura-bg/30'
                    }`}
                  >
                    <item.icon size={20} strokeWidth={1.5} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-4 p-4 text-aura-muted hover:text-rose-500 transition-colors rounded-xl hover:bg-aura-bg/30"
              >
                <LogOut size={20} strokeWidth={1.5} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-24 p-6 md:p-12 max-w-7xl mx-auto w-full mt-16 md:mt-0">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between gap-6 md:gap-0 md:items-center mb-8 md:mb-16">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-aura-muted group-focus-within:text-aura-ink transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search health metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-80 pl-12 pr-6 py-3 rounded-full bg-aura-card border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm text-aura-ink"
            />
          </div>

          <div className="flex items-center justify-between md:justify-end md:space-x-6 gap-4 md:gap-6">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markNotificationsRead();
                }}
                className="relative p-2 text-aura-muted hover:text-aura-ink transition-colors"
              >
                <Bell size={22} strokeWidth={1.5} />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-aura-gold rounded-full border-2 border-aura-bg"></span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-4 w-80 max-w-[90vw] luxury-card z-50 p-4 bg-aura-card"
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-aura-ink/5 pb-2">
                      <h4 className="font-serif text-lg">Notifications</h4>
                      <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} className={`p-3 rounded-xl text-xs ${n.is_read ? 'bg-aura-bg/30 opacity-60' : 'bg-aura-bg/70 border-l-2 border-aura-gold'}`}>
                          <p className="font-bold mb-1">{n.title}</p>
                          <p className="text-aura-muted">{n.message}</p>
                        </div>
                      )) : (
                        <p className="text-center text-aura-muted py-4 italic text-xs">No notifications</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div 
              onClick={() => setActiveView('profile')}
              className="hidden sm:flex items-center space-x-4 pl-4 md:pl-6 border-l border-aura-ink/10 cursor-pointer group"
            >
              <div className="text-right">
                <p className="text-sm font-semibold group-hover:text-aura-gold transition-colors">{user.displayName || 'User'}</p>
                <p className="text-[10px] uppercase tracking-widest text-aura-muted font-bold">Premium Tier</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-aura-accent/20 flex items-center justify-center text-aura-gold group-hover:bg-aura-gold group-hover:text-aura-bg transition-all">
                <User size={20} />
              </div>
            </div>
            <button 
              onClick={() => setActiveView('profile')}
              className="sm:hidden p-2 text-aura-gold hover:bg-aura-bg rounded-lg transition-colors"
            >
              <User size={24} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* View Transition Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeView === 'dashboard' && <Dashboard searchQuery={searchQuery} onIntervention={handleIntervention} />}
            {activeView === 'vision' && <VisionIngestion onAnalysisComplete={handleAnalysisComplete} />}
            {activeView === 'ai' && <AuraAI />}
            {activeView === 'admin' && <AdminCenter onExport={() => showToast("Dataset exported to secure cloud storage.")} />}
            {activeView === 'profile' && <UserProfile onUpdate={() => {}} showToast={showToast} />}
          </motion.div>
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md luxury-card"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-serif">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-aura-bg rounded-full transition-colors">
                    <X size={24} strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">RDA Age Group</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['pediatric', 'adolescent'].map(group => (
                        <button
                          key={group}
                          onClick={() => handleUpdateSettings('age_group', group)}
                          className={`py-3 rounded-xl text-xs uppercase tracking-widest font-bold border transition-all ${
                            settings.age_group === group 
                              ? 'bg-aura-gold text-aura-bg border-aura-gold shadow-lg shadow-aura-gold/20' 
                              : 'bg-aura-bg text-aura-muted border-aura-ink/10 hover:border-aura-gold/30'
                          }`}
                        >
                          {group}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-aura-ink/5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Security</label>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-aura-bg/50">
                      <span className="text-xs">AES-256 Encryption</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">Active</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full mt-12 py-4 rounded-full bg-aura-gold text-aura-bg text-xs uppercase tracking-widest font-bold hover:bg-aura-ink hover:text-aura-gold transition-all duration-500 shadow-xl shadow-aura-gold/10"
                >
                  Save & Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 bg-aura-ink text-white rounded-full shadow-2xl z-[200] flex items-center space-x-3"
            >
              <CheckCircle size={18} className="text-aura-gold" />
              <span className="text-xs font-bold tracking-wider">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Result Modal (Simplified for demo) */}
        <AnimatePresence>
          {lastAnalysis && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bottom-12 right-12 w-96 luxury-card bg-aura-ink text-white z-50 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-serif">New Ingestion: {lastAnalysis.foodName}</h3>
                <button onClick={() => setLastAnalysis(null)} className="text-white/40 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Protein</p>
                    <p className="text-sm font-serif">{lastAnalysis.macronutrients.protein}g</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Carbs</p>
                    <p className="text-sm font-serif">{lastAnalysis.macronutrients.carbs}g</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Fat</p>
                    <p className="text-sm font-serif">{lastAnalysis.macronutrients.fat}g</p>
                  </div>
                </div>
                <p className="text-xs text-white/60 italic leading-relaxed">
                  {lastAnalysis.healthInsights}
                </p>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-aura-gold">Predictive Risk: {lastAnalysis.predictiveRisk}</span>
                  <button className="text-[10px] uppercase tracking-widest font-bold hover:underline">View Full Report</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
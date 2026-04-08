import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Scale, Ruler, Activity, Target, Save, Loader2, Utensils, AlertTriangle, Zap, Heart, Brain, Edit3 } from 'lucide-react';
import { auth, db, doc, onSnapshot, setDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';

interface ProfileData {
  name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  activity_level: string;
  diet_type: string;
  allergies: string;
  goal: string;
  updated_at: string;
  role?: string;
}

interface UserProfileProps {
  onUpdate: (name: string) => void;
  showToast: (msg: string) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onUpdate, showToast }) => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const profileRef = doc(db, 'user_profiles', user.uid);
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileData;
        setProfile(data);
        onUpdate(data.name);
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile: ProfileData = {
          name: user.displayName || 'User',
          age: 28,
          gender: 'Male',
          weight: 72,
          height: 178,
          activity_level: 'Moderate',
          diet_type: 'Balanced',
          allergies: 'None',
          goal: 'Optimize metabolic efficiency and longevity',
          updated_at: new Date().toISOString(),
          role: 'user'
        };
        setDoc(profileRef, {
          ...initialProfile,
          uid: user.uid,
          updated_at: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `user_profiles/${user.uid}`));
        setProfile(initialProfile);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_profiles/${user.uid}`);
    });

    return () => unsubscribe();
  }, []);

  const calculateBMI = () => {
    if (!profile?.weight || !profile?.height) return "0.0";
    const heightInMeters = profile.height / 100;
    return (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const estimateBMR = () => {
    if (!profile) return 0;
    // Mifflin-St Jeor Equation
    let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
    if (profile.gender === 'Male') bmr += 5;
    else bmr -= 161;
    return Math.round(bmr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);

    const user = auth.currentUser;
    if (!user) return;

    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(profileRef, {
        ...profile,
        updated_at: serverTimestamp()
      }, { merge: true });
      setIsEditingName(false);
      onUpdate(profile.name);
      showToast("Profile updated successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `user_profiles/${user.uid}`);
      showToast("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-aura-muted" size={40} /></div>;

  const bmi = calculateBMI();
  const bmr = estimateBMR();

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-serif mb-3">User Intelligence</h1>
          <p className="text-aura-muted uppercase tracking-[0.3em] text-[10px] font-bold">Comprehensive Biometric & Metabolic Ecosystem</p>
        </div>
      </div>

      {/* Metabolic Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Body Mass Index', value: bmi, unit: 'kg/m²', icon: Scale, color: 'text-aura-accent' },
          { label: 'Basal Metabolic Rate', value: bmr, unit: 'kcal/day', icon: Zap, color: 'text-aura-gold' },
          { label: 'Growth Percentile', value: '84th', unit: 'est.', icon: Heart, color: 'text-rose-500' },
          { label: 'Cognitive Load', value: 'Optimal', unit: 'status', icon: Brain, color: 'text-indigo-500' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="luxury-card p-6 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <stat.icon className={stat.color} size={20} />
              <span className="text-[8px] uppercase tracking-widest font-bold text-aura-muted">{stat.unit}</span>
            </div>
            <div>
              <p className="text-3xl font-serif mb-1">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Identity & Biometrics */}
        <div className="space-y-8 md:col-span-2">
          <div className="luxury-card space-y-8">
            <div className="flex items-center space-x-3 mb-2">
              <User className="text-aura-accent" size={20} />
              <h2 className="text-2xl font-serif">Core Identity & Biometrics</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Full Name</label>
                  <button 
                    type="button"
                    onClick={() => setIsEditingName(!isEditingName)}
                    className="text-aura-gold hover:text-aura-ink transition-colors"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={profile.name}
                    disabled={!isEditingName}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm ${!isEditingName ? 'opacity-70 cursor-not-allowed' : 'ring-1 ring-aura-gold/30'}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Age</label>
                  <input 
                    type="number" 
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Gender</label>
                  <select 
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm appearance-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Weight (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-aura-muted" size={14} />
                    <input 
                      type="number" 
                      step="0.1"
                      value={profile.weight}
                      onChange={(e) => setProfile({ ...profile, weight: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Height (cm)</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-aura-muted" size={14} />
                    <input 
                      type="number" 
                      value={profile.height}
                      onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Activity Level</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-aura-muted" size={14} />
                  <select 
                    value={profile.activity_level}
                    onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm appearance-none"
                  >
                    <option>Sedentary</option>
                    <option>Light</option>
                    <option>Moderate</option>
                    <option>Active</option>
                    <option>Very Active</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="luxury-card space-y-8">
            <div className="flex items-center space-x-3 mb-2">
              <Utensils className="text-aura-accent" size={20} />
              <h2 className="text-2xl font-serif">Dietary Intelligence</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Dietary Preference</label>
                <select 
                  value={profile.diet_type}
                  onChange={(e) => setProfile({ ...profile, diet_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm appearance-none"
                >
                  <option>Balanced</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Ketogenic</option>
                  <option>Paleo</option>
                  <option>Mediterranean</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Allergies & Restrictions</label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-aura-muted" size={14} />
                  <input 
                    type="text" 
                    value={profile.allergies}
                    onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm"
                    placeholder="e.g. Peanuts, Dairy, None"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goals & Actions */}
        <div className="space-y-8">
          <div className="luxury-card space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <Target className="text-aura-accent" size={20} />
              <h2 className="text-2xl font-serif">Strategic Goals</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-aura-muted ml-2">Primary Health Goal</label>
                <textarea 
                  rows={4}
                  value={profile.goal}
                  onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-aura-bg/50 border border-aura-ink/5 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm resize-none"
                  placeholder="Describe your primary health objectives..."
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 rounded-full bg-aura-gold text-aura-bg text-xs uppercase tracking-widest font-bold hover:bg-aura-accent hover:text-aura-ink transition-all duration-500 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Synchronize Profile</span>
              </button>
            </div>
          </div>

          <div className="luxury-card bg-aura-accent text-aura-ink space-y-4">
            <h3 className="text-lg font-serif">Clinical Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Data Integrity</span>
                <span className="text-aura-gold">Verified</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Last Sync</span>
                <span>{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/60 leading-relaxed italic">
                  "Metabolic demand is currently aligned with intake parameters. Predictive risk remains sub-clinical."
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

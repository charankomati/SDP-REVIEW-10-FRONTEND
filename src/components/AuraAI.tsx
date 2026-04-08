import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Loader2, Brain, Activity, Heart, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getHealthTrackingAdvice } from '../services/healthAiService';
import { auth, db, collection, query, where, getDocs, orderBy, limit, handleFirestoreError, OperationType, doc, getDoc } from '../firebase';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const AuraAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Greetings. I am Aura AI. I have analyzed your metabolic data and nutritional history. How can I assist your health journey today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealthSummary();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHealthSummary = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch profile
      const profileSnap = await getDoc(doc(db, 'user_profiles', user.uid));
      const profile = profileSnap.exists() ? profileSnap.data() : {};

      // Fetch recent meals
      const mealsQuery = query(
        collection(db, 'meals'),
        where('uid', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const mealsSnap = await getDocs(mealsQuery);
      const meals = mealsSnap.docs.map(doc => doc.data());

      // Mock biometrics
      const biometrics = { heartRate: 72, metabolicRate: 1450 };

      setHealthData({ profile, meals, biometrics });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'health_summary');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const advice = await getHealthTrackingAdvice(
        healthData?.meals || [],
        healthData?.profile || {},
        healthData?.biometrics || {},
        userMsg
      );
      setMessages(prev => [...prev, { role: 'model', text: advice || "I apologize, I encountered a processing error." }]);
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => [...prev, { role: 'model', text: "System error: AI core unreachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-serif mb-3 flex items-center gap-4">
            Aura AI <Sparkles className="text-aura-accent animate-pulse" size={40} />
          </h1>
          <p className="text-aura-muted uppercase tracking-[0.3em] text-[10px] font-bold">Predictive Health Intelligence Agent</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
        {/* Chat Interface */}
        <div className="lg:col-span-2 flex flex-col luxury-card p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-6 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-aura-ink text-white rounded-tr-none' 
                      : 'bg-aura-bg border border-aura-ink/5 rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 border-t border-aura-ink/5 bg-aura-card/50 backdrop-blur-sm">
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Query Aura AI for health insights..."
                className="flex-1 px-6 py-4 rounded-full bg-aura-bg border border-aura-ink/10 focus:outline-none focus:ring-2 focus:ring-aura-accent/20 transition-all text-sm text-aura-ink"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-14 h-14 rounded-full bg-aura-gold text-aura-bg flex items-center justify-center hover:bg-aura-accent hover:text-aura-ink transition-all duration-500 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="space-y-6 overflow-y-auto pr-2">
          <div className="luxury-card p-8 space-y-6 bg-aura-ink text-white">
            <div className="flex items-center gap-3">
              <Brain className="text-aura-accent" size={24} />
              <h2 className="text-xl font-serif">AI Core Status</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Neural Sync</span>
                <span className="text-aura-gold">Active</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Data Points</span>
                <span>{healthData?.meals?.length || 0} Ingestions</span>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/60 leading-relaxed italic">
                  "I am continuously monitoring your metabolic efficiency. Current data suggests optimal micronutrient absorption."
                </p>
              </div>
            </div>
          </div>

          <div className="luxury-card p-8 space-y-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-aura-accent" size={24} />
              <h2 className="text-xl font-serif">Predictive Guard</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-aura-bg border border-aura-ink/5">
                <Activity className="text-aura-accent" size={20} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Metabolic Stability</p>
                  <p className="text-lg font-serif">94.2%</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-aura-bg border border-aura-ink/5">
                <Heart className="text-rose-500" size={20} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">Clinical Risk</p>
                  <p className="text-lg font-serif">Minimal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

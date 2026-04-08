import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in App.tsx will handle the rest
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-aura-bg flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-aura-accent/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-aura-gold/5 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md luxury-card relative z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-aura-ink flex items-center justify-center text-white font-serif text-3xl shadow-2xl shadow-aura-ink/20 mb-6">
            A
          </div>
          <h1 className="text-4xl font-serif mb-2">AuraNutrics</h1>
          <p className="text-aura-muted uppercase tracking-[0.2em] text-[10px] font-bold">Predictive Health Intelligence</p>
        </div>

        <div className="space-y-6">
          <p className="text-center text-aura-muted text-sm italic">
            "Access your personalized metabolic ecosystem with secure biometric authentication."
          </p>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-rose-500 text-xs text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 rounded-full bg-aura-ink text-white text-xs uppercase tracking-widest font-bold hover:bg-aura-accent transition-all duration-500 flex items-center justify-center space-x-3 group disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
                <span>Initialize with Google</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-aura-ink/5 flex items-center justify-center space-x-4">
          <Shield size={16} className="text-aura-muted" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-aura-muted">AES-256 Encrypted Access</span>
        </div>
      </motion.div>
    </div>
  );
};

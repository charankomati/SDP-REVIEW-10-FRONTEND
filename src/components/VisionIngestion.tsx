import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFoodImage, NutritionalAnalysis, AnalysisError } from '../services/geminiService';

interface VisionIngestionProps {
  onAnalysisComplete: (analysis: NutritionalAnalysis) => void;
}

export const VisionIngestion: React.FC<VisionIngestionProps> = ({ onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreview(reader.result as string);
      await performAnalysis(base64);
    };
    reader.readAsDataURL(file);
  };

  const performAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeFoodImage(base64);
      onAnalysisComplete(result);
    } catch (err) {
      if (err instanceof AnalysisError) {
        setError({ message: err.message, code: err.code });
      } else {
        setError({ 
          message: "An unexpected error occurred during analysis. Please try again.", 
          code: 'UNKNOWN' 
        });
      }
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="luxury-card overflow-hidden relative">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-serif mb-2">Vision Ingestion</h2>
          <p className="text-aura-muted text-sm uppercase tracking-widest">Computer Vision Pipeline</p>
        </div>

        <div 
          className="w-full aspect-video rounded-2xl border-2 border-dashed border-aura-muted/20 flex items-center justify-center relative bg-aura-bg/50 cursor-pointer hover:bg-aura-bg transition-colors overflow-hidden"
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        >
          {preview ? (
            <div className="relative w-full h-full">
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
              {error && (
                <div className="absolute inset-0 bg-rose-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
                  <AlertCircle className="mb-4 text-rose-300" size={40} />
                  <p className="text-sm font-medium mb-2">{error.message}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mb-6">Error Code: {error.code}</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="px-6 py-2 rounded-full bg-white text-rose-900 text-[10px] uppercase tracking-widest font-bold hover:bg-rose-100 transition-colors"
                  >
                    Try Another Image
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-aura-muted">
              <Camera size={48} strokeWidth={1} />
              <span className="text-sm font-light">Capture or Upload Meal</span>
            </div>
          )}
          
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white rounded-2xl"
              >
                <Loader2 className="animate-spin mb-4" size={32} />
                <span className="text-sm tracking-widest uppercase font-medium">Architecting Intelligence...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />

        <div className="flex space-x-4 w-full">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex-1 py-4 px-6 rounded-full border border-aura-ink/10 flex items-center justify-center space-x-2 hover:bg-aura-gold hover:text-aura-bg transition-all duration-500 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              {error ? 'Retry Upload' : 'Upload Image'}
            </span>
          </button>
          
          {preview && !isAnalyzing && (
            <button 
              onClick={reset}
              className="p-4 rounded-full border border-aura-ink/10 hover:bg-rose-500 hover:text-white transition-all duration-300"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, ArrowRight, Workflow, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';
import { hashPassword, comparePasswords, isValidEmail, isStrongPassword } from '../lib/auth';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'register';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Registration Logic
        if (!fullName) throw new Error('Full name is required');
        if (!isValidEmail(email)) throw new Error('Invalid email format');
        if (!isStrongPassword(password)) throw new Error('Password must be at least 8 characters');

        const existingUser = await db.users.where('email').equals(email.toLowerCase()).first();
        if (existingUser) throw new Error('Email already registered');

        const hashedPassword = await hashPassword(password);
        const userId = await db.users.add({
          email: email.toLowerCase(),
          password: hashedPassword,
          fullName,
          createdAt: Date.now()
        });

        const newUser = await db.users.get(userId);
        if (newUser) {
          login(newUser);
          navigate(from, { replace: true });
        }
      } else {
        // Login Logic
        const user = await db.users.where('email').equals(email.toLowerCase()).first();
        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          throw new Error('Invalid email or password');
        }

        login(user);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 selection:bg-gold-deep selection:text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-deep/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-deep/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 mb-4"
          >
            <Workflow className="text-gold-deep" size={40} />
            <span className="text-4xl font-serif font-black tracking-tighter text-white italic leading-none">EventFlow</span>
          </motion.div>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Precision Productivity</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl relative group">
          {/* Subtle Accent Line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold-deep to-transparent opacity-50" />
          
          <h2 className="text-2xl font-serif italic text-white mb-8 text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 px-12 py-4 text-white focus:outline-none focus:border-gold-deep/50 transition-all placeholder:text-white/10"
                      placeholder="Enter your full name"
                      required={mode === 'register'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 text-white focus:outline-none focus:border-gold-deep/50 transition-all placeholder:text-white/10"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-12 py-4 text-white focus:outline-none focus:border-gold-deep/50 transition-all placeholder:text-white/10"
                  placeholder="••••••••"
                  required
                />
              </div>
              {mode === 'register' && (
                <p className="text-[8px] text-white/20 uppercase tracking-tighter">Min. 8 characters</p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs"
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gold-deep hover:bg-gold-light text-black font-black uppercase tracking-[0.2em] py-5 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <span className="z-10">{isLoading ? <Loader2 className="animate-spin" /> : mode === 'login' ? 'Authenticate' : 'Establish Account'}</span>
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform z-10" />}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </div>

        <div className="mt-12 text-center opacity-20">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white">EventFlow Security Protocol v2.4.0</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

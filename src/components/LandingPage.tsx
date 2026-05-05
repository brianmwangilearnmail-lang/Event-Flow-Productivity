import React from 'react';
import { motion } from 'motion/react';
import { 
  Workflow, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Calendar, 
  ShieldCheck,
  Zap,
  Star
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-gold-deep selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="text-gold-deep" size={24} />
            <span className="text-2xl font-serif font-black tracking-tighter italic leading-none">EventFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-gold-deep transition-colors">Features</a>
            <a href="#about" className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-gold-deep transition-colors">About</a>
            <Link to="/login" className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-gold-deep transition-all active:scale-95 shadow-lg shadow-black/10">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="inline-block px-4 py-1 bg-gold-deep/10 text-gold-deep text-[10px] font-black uppercase tracking-[0.3em] rounded-full mb-6">
                Premium Operations Suite
              </span>
              <h1 className="text-6xl lg:text-8xl font-serif font-black italic tracking-tighter leading-[0.9] mb-8">
                Elevate Every <span className="text-gold-deep">Experience.</span>
              </h1>
              <p className="text-xl text-black/60 font-medium max-w-lg mb-10 leading-relaxed">
                The ultimate management ecosystem for high-end event professionals. Seamlessly orchestrate clients, logistics, and financials in one elegant interface.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link to="/login" className="w-full sm:w-auto px-10 py-5 bg-black text-white text-[12px] font-black uppercase tracking-[0.2em] rounded-full flex items-center justify-center gap-3 hover:bg-gold-deep hover:translate-y-[-2px] transition-all shadow-2xl shadow-black/20">
                  Enter Dashboard <ArrowRight size={18} />
                </Link>
                <a href="#features" className="w-full sm:w-auto px-10 py-5 border border-black/10 text-[12px] font-black uppercase tracking-[0.2em] rounded-full flex items-center justify-center gap-3 hover:bg-black/5 transition-all">
                  Explore Features
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-[2rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border border-black/5 aspect-square lg:aspect-auto lg:h-[600px]">
                <img 
                  src="/landing_hero.png" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
              
              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-10 top-20 bg-white p-6 rounded-2xl shadow-2xl border border-black/5 hidden xl:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold-deep rounded-xl flex items-center justify-center text-white">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">Revenue</p>
                    <p className="text-xl font-serif font-black italic">+124% Growth</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl lg:text-6xl font-serif font-black italic tracking-tighter mb-6">Designed for Excellence</h2>
            <p className="text-white/40 text-[12px] font-black uppercase tracking-[0.3em]">The complete toolkit for luxury event planning</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: "Client CRM", desc: "Keep track of every interaction and preference with high-fidelity client profiles.", icon: Users },
              { title: "Financial Suite", desc: "Automate quotations, invoices, and receipts with precision and elegance.", icon: Zap },
              { title: "Event Ledger", desc: "Monitor every event lifecycle from inquiry to completion in real-time.", icon: Calendar },
              { title: "Catalog Engine", desc: "Manage thousands of service items and inventory with lightning speed.", icon: BarChart3 },
              { title: "Audit Trail", desc: "Maintain a complete history of every change made to your business data.", icon: ShieldCheck },
              { title: "Premium Design", desc: "A dark-mode aesthetic built for modern high-end creative agencies.", icon: Star },
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 border border-white/10 rounded-[2.5rem] bg-white/5 hover:bg-white/10 transition-all group"
              >
                <f.icon className="text-gold-deep mb-8 group-hover:scale-110 transition-transform" size={40} />
                <h3 className="text-xl font-serif font-black italic mb-4">{f.title}</h3>
                <p className="text-white/40 leading-relaxed font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 overflow-hidden relative">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl lg:text-7xl font-serif font-black italic tracking-tighter mb-10 leading-tight">
              Ready to redefine your <br/><span className="text-gold-deep underline decoration-black/10 underline-offset-8">workflow?</span>
            </h2>
            <Link to="/login" className="inline-flex items-center gap-4 px-12 py-6 bg-black text-white text-[14px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-gold-deep transition-all shadow-2xl hover:scale-105 active:scale-95">
              Launch Application <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold-deep/5 rounded-full blur-[120px] -z-10" />
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-black/5 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-2">
            <Workflow className="text-gold-deep" size={24} />
            <span className="text-xl font-serif font-black tracking-tighter italic leading-none">EventFlow</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/20">
            © 2026 Made by the EventFlow Team
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black">Privacy</a>
            <a href="#" className="text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black">Terms</a>
            <a href="#" className="text-[9px] font-black uppercase tracking-widest text-black/40 hover:text-black">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

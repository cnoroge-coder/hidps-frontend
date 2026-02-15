"use client";
import React, { useEffect } from 'react';
import { Shield, Lock, Activity, Bell, Terminal, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  useEffect(() => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    });

    elements.forEach(element => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden py-24 px-6">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom mask-image-hero"></div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_farthest-side_at_50%_200px,#1e293b_0%,#020617_100%)]"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10 animate-on-scroll fade-in-down">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent mb-6">
            Sentinel HIDS
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            A lightweight, rule-based Host Intrusion Detection & Prevention System.
            Real-time monitoring for the modern Linux environment.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login" className="glowing-btn px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg transition-all transform hover:scale-105">
              Login
            </Link>
            <Link href="/signup" className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition-all transform hover:scale-105">
              Signup
            </Link>
          </div>
        </div>
      </header>

      {/* Description Section */}
      <section className="py-12 px-6 animate-on-scroll fade-in-up">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xl text-slate-400">
            Sentinel HIDS is a lightweight, rule-based Host Intrusion Detection & Prevention System designed for real-time monitoring of modern Linux environments. It provides deep visibility into system activities, enabling proactive threat detection and response.
          </p>
        </div>
      </section>

      {/* Core Objectives Section */}
      <section className="py-12 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 animate-on-scroll fade-in-down">Security Objectives</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.1s' }}>
              <FeatureCard
                icon={<Activity className="text-blue-500" />}
                title="Real-time Monitoring"
                desc="Deep visibility into file modifications, new process creation, and unauthorized login attempts."
              />
            </div>
            <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.2s' }}>
              <FeatureCard
                icon={<Shield className="text-emerald-500" />}
                title="Rule-Based Detection"
                desc="Advanced correlation engine that identifies malicious patterns using custom-built decoders."
              />
            </div>
            <div className="animate-on-scroll fade-in-up" style={{ animationDelay: '0.3s' }}>
              <FeatureCard
                icon={<Bell className="text-amber-500" />}
                title="Instant Alerting"
                desc="Critical security notifications delivered instantly via Email and Africa's Talking SMS integration."
              />
            </div>
          </div>
        </div>
      </section>
      <style jsx global>{`
        .mask-image-hero {
          -webkit-mask-image: linear-gradient(to bottom, white 20%, transparent 100%);
          mask-image: linear-gradient(to bottom, white 20%, transparent 100%);
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .animate-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .fade-in-down {
          opacity: 0;
          transform: translateY(-30px);
          animation: fadeInDown 1s ease-out forwards;
        }
        .fade-in-up {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 1s ease-out forwards;
        }
        @keyframes fadeInDown {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .glowing-btn {
          position: relative;
          color: white;
          background-color: #3b82f6;
          box-shadow: 0 0 5px #3b82f6;
          transition: all 0.3s ease-in-out;
        }
        .glowing-btn:hover {
          box-shadow: 0 0 15px #3b82f6, 0 0 25px #3b82f6;
        }
        .feature-card {
          position: relative;
          overflow: hidden;
        }
        .feature-card-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(29, 78, 216, 0.15) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
          pointer-events: none;
        }
        .feature-card:hover .feature-card-glow {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  const [coords, setCoords] = React.useState({ x: -1, y: -1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
  
  return (
    <div 
      className="p-8 h-full rounded-xl bg-slate-900 border border-slate-800 transition-all group transform hover:-translate-y-1 hover:border-blue-500/50 feature-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCoords({ x: -1, y: -1 })}
      style={{ '--mouse-x': `${coords.x}px`, '--mouse-y': `${coords.y}px` } as React.CSSProperties}
    >
      <div className="mb-4 p-3 rounded-lg bg-slate-950 w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
      <div className="feature-card-glow"></div>
    </div>
  );
}
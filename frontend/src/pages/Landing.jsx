import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Mic,
  Video,
  FileText,
  BarChart2,
  Terminal,
  ShieldCheck,
  Zap,
  Award,
  Play
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export function Landing() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('Software Engineer');

  const roles = [
    'Software Engineer',
    'Product Manager',
    'Data Analyst',
    'UX Designer',
    'DevOps Engineer'
  ];

  return (
    <div className="space-y-24 sm:space-y-32 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glowing backdrop aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[450px] bg-violet-600/15 dark:bg-violet-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs sm:text-sm font-semibold mb-6 animate-in fade-in zoom-in-95 duration-200">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Generation AI Interview Preparation Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.1]">
          Your Personal <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 bg-clip-text text-transparent">AI Interview Coach</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Turn any job description into a personalized interview preparation experience. Practice smarter, improve your skills and walk into every interview with confidence.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="primary"
            onClick={() => navigate('/preparations/new')}
            iconRight={ArrowRight}
            className="w-full sm:w-auto px-8"
          >
            Start Preparing Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-8"
          >
            Explore Dashboard Demo
          </Button>
        </div>

        {/* Quick Social Proof Metrics */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-[#27324A] max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">94%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Offer Success Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">10k+</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mock Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">500+</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Companies Covered</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">Real-time</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Voice Evaluation</p>
          </div>
        </div>
      </section>

      {/* Product Workflow Interactive Showcase (Matching User Design Inspiration) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            AI Interview, <span className="text-violet-500">Smarter You</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Practice. Analyze. Improve. Get interview-ready with real-time AI feedback.
          </p>
        </div>

        {/* 4-Step Interactive Pipeline Showcase */}
        <div className="rounded-3xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0E1528] p-6 sm:p-8 shadow-2xl overflow-hidden">
          {/* Step Breadcrumb Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-8">
            <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30">
              <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">Select Position</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A]">
              <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI Interview</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A]">
              <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice Analysis</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A]">
              <span className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI Feedback</span>
            </div>
          </div>

          {/* Pipeline Display Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Step 1: Position Selection */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#151C2E] p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Choose Target Role</h3>
              <p className="text-xs text-slate-500">Pick any engineering or tech role to practice.</p>
              <div className="space-y-1.5 pt-2">
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      selectedRole === r
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#0B1020] text-slate-700 dark:text-slate-300 hover:border-violet-500 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>{r}</span>
                    {selectedRole === r && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Live AI Voice Simulation */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#151C2E] p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">AI Interview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Session
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
                  "Can you describe a challenging technical challenge in distributed systems and how you solved it?"
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 text-center space-y-3">
                <div className="flex items-center justify-center space-x-1 text-violet-400">
                  <span className="h-3 w-1 bg-violet-500 rounded-full animate-bounce"></span>
                  <span className="h-6 w-1 bg-violet-400 rounded-full animate-bounce delay-75"></span>
                  <span className="h-8 w-1 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                  <span className="h-5 w-1 bg-blue-500 rounded-full animate-bounce delay-100"></span>
                  <span className="h-3 w-1 bg-violet-500 rounded-full animate-bounce"></span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">00:28 • Recording Answer</div>
                <div className="h-10 w-10 mx-auto rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <Mic className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Step 3: Voice Analysis Radar */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#151C2E] p-5 space-y-4">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Voice & Tone Analysis</span>
              <p className="text-xs text-slate-500">Real-time speech delivery breakdown</p>
              
              <div className="space-y-2.5 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Clarity & Articulation</span>
                    <span className="font-bold text-blue-500">85/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Executive Confidence</span>
                    <span className="font-bold text-emerald-500">78/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Speaking Pace (140 wpm)</span>
                    <span className="font-bold text-violet-500">72/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 mb-1">
                    <span>Filler Word Ratio</span>
                    <span className="font-bold text-amber-500">Low (3%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: AI Feedback & Score */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#151C2E] p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white">AI Evaluation Score</span>
                <div className="flex items-center space-x-3">
                  <div className="h-14 w-14 rounded-full border-4 border-violet-500 flex items-center justify-center font-extrabold text-xl text-violet-500 shrink-0">
                    82
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                    "Great structured answer with clear STAR method usage. Consider highlighting metrics more."
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Strong architectural trade-off reasoning
                  </div>
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium">
                    ✓ Confident voice tone throughout
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/mock-interviews')}
                className="w-full"
              >
                Try Live Mock Interview
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <Badge variant="primary" size="md">Core Capabilities</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Everything You Need to Ace Tech Interviews
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            From parsing complex job descriptions to simulating high-pressure live rounds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] space-y-3 hover:border-violet-500/40 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">JD Analysis Engine</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Paste any job post to extract required tech stacks, system constraints, behavioral traits, and company expectations.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] space-y-3 hover:border-violet-500/40 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Simulated Live Rounds</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Voice-powered adaptive interview simulations with follow-up probing questions, speech pacing, and clarity scoring.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] space-y-3 hover:border-violet-500/40 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BarChart2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Actionable Feedback</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Comprehensive post-session evaluation rubrics with suggested answers, model solutions, and personalized roadmaps.
            </p>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-violet-900 via-indigo-900 to-slate-900 p-8 sm:p-14 text-center text-white border border-violet-500/30 shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Experience the power of targeted, intelligent interview coaching. Create your first preparation session in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="primary"
                onClick={() => navigate('/preparations/new')}
                className="bg-white text-violet-950 hover:bg-slate-100 font-bold px-8"
              >
                Create Free Preparation
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="text-white border-white/30 hover:bg-white/10"
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;


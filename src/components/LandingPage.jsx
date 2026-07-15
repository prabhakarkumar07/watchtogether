import { useState, useRef } from 'react'
import {
  Play, Users, MessageSquare, Monitor, Lock, Zap,
  Smartphone, RefreshCw, ChevronRight, Github, ArrowRight,
  CheckCircle2, Star, Wifi, Clock, Globe, ShieldCheck
} from 'lucide-react'

const FEATURES = [
  {
    icon: Play,
    title: 'Perfect Video Sync',
    desc: 'Every play, pause, and seek is instantly synchronized across all participants. Zero drift. Every time.',
    color: '#3B82F6',
  },
  {
    icon: Monitor,
    title: 'Screen Sharing',
    desc: 'Share your entire screen or a single application window with everyone in the room in HD quality.',
    color: '#8B5CF6',
  },
  {
    icon: Users,
    title: 'HD Video Calls',
    desc: 'See your friends while watching. Built-in multi-person video calling with mic and camera controls.',
    color: '#10B981',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Chat',
    desc: 'React, comment, and discuss without missing a beat. Persistent chat history throughout the session.',
    color: '#F59E0B',
  },
  {
    icon: Lock,
    title: 'End-to-End Encrypted',
    desc: 'All control signals are encrypted with a unique room key. Your watch party stays completely private.',
    color: '#EF4444',
  },
  {
    icon: Zap,
    title: 'Serverless P2P',
    desc: 'Direct browser-to-browser connection. No middleman. Low latency, high reliability, zero cost.',
    color: '#06B6D4',
  },
  {
    icon: Smartphone,
    title: 'Works Everywhere',
    desc: 'Chrome, Firefox, Safari, Edge. Desktop and mobile. Watch together no matter what device you use.',
    color: '#EC4899',
  },
  {
    icon: RefreshCw,
    title: 'Auto Reconnect',
    desc: "Lost your connection? The app automatically attempts to restore your session without missing a beat.",
    color: '#84CC16',
  },
]

const STEPS = [
  { n: '01', title: 'Create a Room', desc: 'One click. No account. Get a unique room code instantly.' },
  { n: '02', title: 'Share the Link', desc: 'Copy the invite link and send it to anyone. They join in seconds.' },
  { n: '03', title: 'Watch Together', desc: 'Chat, call, react — everything stays in perfect sync for everyone.' },
]

const WHY = [
  { icon: CheckCircle2, label: 'No sign-up required', color: '#10B981' },
  { icon: Wifi,         label: 'Direct peer-to-peer connection', color: '#3B82F6' },
  { icon: Clock,        label: 'Ultra-low latency sync', color: '#8B5CF6' },
  { icon: ShieldCheck,  label: 'End-to-end encrypted sessions', color: '#EF4444' },
  { icon: Globe,        label: 'Works in every modern browser', color: '#F59E0B' },
  { icon: Star,         label: 'Multiple layout modes', color: '#EC4899' },
]

export default function LandingPage({ onCreateRoom, onJoinRoom, username, onUsernameChange, initialJoinCode }) {
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const joinInputRef = useRef(null)

  const handleCreate = () => {
    if (!username.trim()) {
      joinInputRef.current?.focus()
      return
    }
    setIsCreating(true)
    onCreateRoom()
  }

  const handleJoin = () => {
    if (!username.trim() || !joinCode.trim()) return
    setIsJoining(true)
    onJoinRoom(joinCode.trim().toUpperCase())
  }

  return (
    <div
      className="landing-page min-h-screen w-full overflow-y-auto text-white"
      style={{ backgroundColor: '#090A0F', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ backgroundColor: 'rgba(9,10,15,0.85)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
              <Play className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">Watch Together</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#why" className="hover:text-white transition-colors">Why us</a>
          </div>
          <a
            href="https://github.com/prabhakarkumar07"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:border-white/20 hover:text-white transition-all"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-6 pt-10 pb-12 text-center">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #3B82F6 0%, #8B5CF6 40%, transparent 70%)', filter: 'blur(80px)' }}
          aria-hidden="true"
        />

        {/* Pill badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          No account required · Free forever
        </div>

        <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
          Watch Together,{' '}
          <span style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Wherever You Are.
          </span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed" style={{ color: 'rgba(232,233,240,0.55)' }}>
          Watch YouTube, Vimeo, direct videos, or share your screen with friends in perfect sync.
          Chat, video call — all in one place, zero sign-up.
        </p>

        {/* ── CTA Box ── */}
        <div
          className="mx-auto max-w-lg rounded-2xl border border-white/8 p-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          {/* Display name */}
          <div className="mb-4 text-left">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(232,233,240,0.4)' }}>
              Your display name
            </label>
            <input
              ref={joinInputRef}
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your name…"
              maxLength={24}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white placeholder-white/25 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              autoComplete="name"
            />
          </div>

          {/* Create button */}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !username.trim()}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
          >
            {isCreating
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              : <Play className="h-4 w-4 fill-white" />
            }
            {isCreating ? 'Creating room…' : 'Create Room'}
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs" style={{ color: 'rgba(232,233,240,0.3)' }}>or join existing</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Join row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="ROOM CODE"
              maxLength={8}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm font-medium tracking-widest text-white uppercase placeholder-white/20 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={isJoining || !username.trim() || !joinCode.trim()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isJoining
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                : <ArrowRight className="h-4 w-4" />
              }
              Join
            </button>
          </div>

          {/* Trust note */}
          <p className="mt-4 text-center text-xs" style={{ color: 'rgba(232,233,240,0.28)' }}>
            🔒 No account required · End-to-end encrypted · Peer-to-peer
          </p>
        </div>
      </section>

      {/* ══ FEATURES BENTO GRID ══════════════════════════════════════════════ */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#3B82F6' }}>Everything you need</p>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Built for real watch parties</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="group rounded-xl border border-white/6 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/12"
              style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
            >
              <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all group-hover:scale-105"
                style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,233,240,0.45)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-y border-white/5 py-24" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#8B5CF6' }}>Simple by design</p>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Up and running in 30 seconds</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute left-full top-6 hidden w-full -translate-x-1/2 md:block"
                    style={{ height: '1px', background: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)' }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold tracking-tight"
                  style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}
                >
                  {n}
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,233,240,0.48)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY WATCH TOGETHER ═══════════════════════════════════════════════ */}
      <section id="why" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#10B981' }}>Why Watch Together</p>
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Private. Fast. Free.
              <br />
              <span style={{ color: 'rgba(232,233,240,0.4)' }}>Always.</span>
            </h2>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: 'rgba(232,233,240,0.5)' }}>
              Most "watch party" solutions require accounts, browser extensions, or subscriptions.
              Watch Together is different — just open, share, and watch.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
            >
              Create a free room
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {WHY.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/6 p-4 transition-all hover:border-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(232,233,240,0.75)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BOTTOM CTA ═══════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ backgroundColor: 'rgba(59,130,246,0.04)', borderTop: '1px solid rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ready to watch together?
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: 'rgba(232,233,240,0.48)' }}>
            Create a room in one click. No sign-up, no credit card, no extensions.
          </p>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}
          >
            <Play className="h-5 w-5 fill-white" />
            {isCreating ? 'Creating room…' : 'Create a Free Room'}
          </button>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)' }}>
                  <Play className="h-3.5 w-3.5 fill-white text-white" />
                </div>
                <span className="text-sm font-semibold text-white">Watch Together</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,233,240,0.35)' }}>
                Peer-to-peer synchronized watching. No servers, no accounts, no limits.
              </p>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,233,240,0.3)' }}>Product</p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'rgba(232,233,240,0.5)' }}>
                {['Features', 'How it works', 'Privacy Policy'].map(l => (
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,233,240,0.3)' }}>Links</p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'rgba(232,233,240,0.5)' }}>
                <li><a href="https://github.com/prabhakarkumar07" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1"><Github className="h-3.5 w-3.5" />GitHub</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,233,240,0.3)' }}>Developer</p>
              <a
                href="https://github.com/prabhakarkumar07"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Prabhakar Kumar
              </a>
              <p className="mt-1 text-xs" style={{ color: 'rgba(232,233,240,0.28)' }}>Portfolio & open source</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
            <p className="text-xs" style={{ color: 'rgba(232,233,240,0.28)' }}>
              © {new Date().getFullYear()} Watch Together · Built by Prabhakar Kumar
            </p>
            <p className="text-xs" style={{ color: 'rgba(232,233,240,0.2)' }}>
              Open source · WebRTC · End-to-End Encrypted
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

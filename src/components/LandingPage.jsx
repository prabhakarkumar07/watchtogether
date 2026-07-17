import { useState, useRef } from 'react'
import {
  Play, Users, MessageSquare, Monitor, Lock, Zap,
  Smartphone, RefreshCw, ChevronRight, Github, ArrowRight,
  CheckCircle2, Star, Wifi, Clock, Globe, ShieldCheck, Radio
} from 'lucide-react'

const FEATURES = [
  {
    icon: Play,
    title: 'Perfect Sync',
    desc: 'Play, pause, seek — mirrored across every device in under 60 ms.',
    color: '#FFB627',
  },
  {
    icon: Monitor,
    title: 'Screen Share',
    desc: 'Beam an entire screen or a single app window in crisp HD.',
    color: '#FFB627',
  },
  {
    icon: Users,
    title: 'HD Video Calls',
    desc: 'See friends while watching. Multi-person calling built-in.',
    color: '#FFB627',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    desc: 'React, quote, disagree — messages land instantly, no reload.',
    color: '#FFB627',
  },
  {
    icon: Lock,
    title: 'E2E Encrypted',
    desc: 'Every control signal is signed with a room-only key.',
    color: '#FFB627',
  },
  {
    icon: Zap,
    title: 'P2P, Zero Server',
    desc: 'Direct browser links — no data leaves the friend group.',
    color: '#FFB627',
  },
  {
    icon: Smartphone,
    title: 'Every Device',
    desc: 'Chrome, Firefox, Safari, Edge. Phone, laptop, tablet.',
    color: '#FFB627',
  },
  {
    icon: RefreshCw,
    title: 'Auto Reconnect',
    desc: 'Lost Wi-Fi? Rejoin picks up where you left off.',
    color: '#FFB627',
  },
]

const STEPS = [
  { n: '01', title: 'Spin up a room', desc: 'One click — no email, no card. You get a six-character code.' },
  { n: '02', title: 'Share the link', desc: 'Drop it in your group chat. Guests join with a tap.' },
  { n: '03', title: 'Roll the film', desc: 'Paste any video URL. Everyone sees the same frame, always.' },
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
    if (!username.trim() || !joinCode.trim()) {
       if (!username.trim()) joinInputRef.current?.focus()
       return
    }
    setIsJoining(true)
    onJoinRoom(joinCode.trim().toUpperCase())
  }

  return (
    <div
      className="landing-page min-h-screen w-full overflow-y-auto text-white grain scanlines"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#FFB627]">
              <Play className="h-4 w-4 fill-black text-black" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white flex items-center">
              Watch Together <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] text-white/50 ml-2">/v.1</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#why" className="hover:text-white transition-colors">Manifesto</a>
          </div>
          <a
            href="https://github.com/prabhakarkumar07/watchtogether"
            target="_blank"
            rel="noreferrer"
            className="cta-outline !py-2 !px-4 !text-xs !bg-transparent flex items-center gap-2"
          >
            <Github className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-[1200px] px-6 pt-10 pb-20 flex flex-col md:flex-row items-center justify-between gap-16 text-left">
        
        {/* Left Column */}
        <div className="flex-1 w-full relative z-10">


          <h1 className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-[72px]">
            <span className="bg-[#4a3514]/40 px-2 box-decoration-clone leading-relaxed">Roll the film,</span><br/>
            <span className="serif-italic text-accent-amber bg-[#4a3514]/40 px-2 box-decoration-clone">
              together.
            </span>
          </h1>

          <p className="mb-10 max-w-md text-[15px] leading-relaxed text-white/70">
            <span className="bg-[#4a3514]/40 px-1.5 py-0.5 box-decoration-clone inline-block mb-1">A late-night cinema for you and your friends — YouTube, Vimeo,</span>
            <span className="bg-[#4a3514]/40 px-1.5 py-0.5 box-decoration-clone inline-block mb-1">direct files, or a shared screen. Synced to the frame. Chatty.</span>
            <span className="bg-[#4a3514]/40 px-1.5 py-0.5 box-decoration-clone inline-block mb-1">Encrypted. Zero sign-up.</span>
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <button
              onClick={() => joinInputRef.current?.focus()}
              className="cta-pill flex items-center gap-2"
            >
              <Play className="h-4 w-4 fill-black text-black" />
              Start a watch party
            </button>
            <a href="#how-it-works" className="cta-outline flex items-center gap-2 !px-5 !py-3 !rounded-full">
              See how it works <ArrowRight className="h-4 w-4 -rotate-45" />
            </a>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-accent-amber">
            <div className="bg-[#4a3514]/40 px-2 py-1 flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full"/> WEBRTC LIVE</div>
            <div className="bg-[#4a3514]/40 px-2 py-1 flex items-center gap-1.5"><span className="text-white/20">-</span> P2P ENCRYPTED</div>
            <div className="bg-[#4a3514]/40 px-2 py-1 flex items-center gap-1.5"><span className="text-white/20">-</span> RUNS 100% IN YOUR BROWSER</div>
          </div>
        </div>

        {/* Right Column (Glass Panel) */}
        <div className="w-full max-w-md shrink-0 relative z-10">
           {/* Decorative glow behind the panel */}
           <div className="absolute inset-0 bg-accent-amber/10 blur-[100px] rounded-full pointer-events-none" />
           
           <div className="glass p-8 relative border-white/5">
             <div className="flex items-center justify-between mb-8 text-[10px] font-bold tracking-widest uppercase">
                <span className="text-accent-amber">TICKET &bull; 001</span>
                <span className="text-accent-amber">ADMIT ALL</span>
             </div>

             {/* Display name */}
             <div className="mb-6 text-left">
               <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">
                 YOUR DISPLAY NAME
               </label>
               <input
                 ref={joinInputRef}
                 type="text"
                 value={username}
                 onChange={(e) => onUsernameChange(e.target.value)}
                 placeholder=""
                 maxLength={24}
                 className="input-field !h-[42px] !text-[14px]"
                 autoComplete="name"
               />
             </div>

             {/* Create button */}
             <button
               type="button"
               onClick={handleCreate}
               disabled={isCreating || !username.trim()}
               className="btn-primary w-full !h-[44px] !text-[14px] mb-6 flex items-center justify-center gap-2"
             >
               {isCreating
                 ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                 : <Play className="h-4 w-4 fill-black text-black" />
               }
               {isCreating ? 'Creating room...' : 'Create a Room'}
             </button>

             {/* Divider */}
             <div className="my-6 flex items-center gap-4">
               <div className="h-px flex-1 bg-white/5" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">OR JOIN WITH CODE</span>
               <div className="h-px flex-1 bg-white/5" />
             </div>

             {/* Join row */}
             <div className="flex gap-2 mb-6">
               <input
                 type="text"
                 value={joinCode}
                 onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                 onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                 placeholder="ROOM CODE"
                 maxLength={8}
                 className="input-field !h-[42px] !font-mono !text-[14px] uppercase tracking-widest text-center"
                 autoComplete="off"
               />
               <button
                 type="button"
                 onClick={handleJoin}
                 disabled={isJoining || !username.trim() || !joinCode.trim()}
                 className="!h-[42px] !px-6 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[13px] font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isJoining
                   ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white inline-block" />
                   : 'Join'
                 }
               </button>
             </div>
             
             <div className="text-center text-[9px] font-bold tracking-widest text-white/20 uppercase flex items-center justify-center gap-1.5">
               <Lock className="h-2.5 w-2.5" /> ENCRYPTED &bull; P2P &bull; ZERO SERVERS
             </div>
           </div>
        </div>
      </section>

      {/* ══ MARQUEE ══════════════════════════════════════════════════════════ */}
      <div className="w-full overflow-hidden border-y border-white/5 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}>
        <div className="flex whitespace-nowrap opacity-60">
           <div className="animate-[marquee_30s_linear_infinite] flex items-center gap-8 px-4 text-xs font-bold uppercase tracking-[0.2em] text-accent-amber">
              <span>✦</span> <span className="text-white">PEER-TO-PEER</span>
              <span>✦</span> <span className="text-white">NO ACCOUNT</span>
              <span>✦</span> <span className="text-white">END-TO-END ENCRYPTED</span>
              <span>✦</span> <span className="text-white">FREE FOREVER</span>
              <span>✦</span> <span className="text-white">OPEN SOURCE</span>
              <span>✦</span> <span className="text-white">ZERO DELAY</span>
              
              <span>✦</span> <span className="text-white">PEER-TO-PEER</span>
              <span>✦</span> <span className="text-white">NO ACCOUNT</span>
              <span>✦</span> <span className="text-white">END-TO-END ENCRYPTED</span>
              <span>✦</span> <span className="text-white">FREE FOREVER</span>
              <span>✦</span> <span className="text-white">OPEN SOURCE</span>
              <span>✦</span> <span className="text-white">ZERO DELAY</span>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* ══ FEATURES BENTO GRID ══════════════════════════════════════════════ */}
      <section id="features" className="mx-auto max-w-[1000px] px-6 py-24">
        <div className="mb-16 flex flex-col md:flex-row items-end justify-between gap-6">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-accent-amber">/01 &bull; THE FEATURE REEL</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight max-w-xl">
              Everything a good <span className="serif-italic text-accent-amber">watch party</span> needs.
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-white/50 max-w-xs md:pb-2">
            Nothing you don't. No accounts, no bloat, no upsells. Just eight quiet superpowers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <div
              key={title}
              className={`group glass p-6 transition-all duration-300 hover:border-white/10 flex flex-col justify-between relative ${
                i === 0 ? 'lg:col-span-2 lg:row-span-1' : ''
              }`}
              style={{
                 background: i === 0 ? 'radial-gradient(ellipse at left, rgba(255,182,39,0.08) 0%, rgba(255,255,255,0.02) 100%)' : undefined
              }}
            >
              <div className="mb-8">
                 <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 group-hover:text-accent-amber group-hover:border-accent-amber/30 transition-colors">
                   <Icon className="h-4 w-4" />
                 </div>
                 <h3 className="mb-2 text-[15px] font-bold text-white">{title}</h3>
                 <p className="text-[13px] leading-relaxed text-white/40">{desc}</p>
              </div>
              <div className="absolute bottom-6 right-6 text-[10px] font-mono font-bold text-white/10 group-hover:text-accent-amber/40 transition-colors">
                 0{i + 1}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="border-t border-white/5 py-24" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
        <div className="mx-auto max-w-[1000px] px-6">
          <div className="mb-16">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-accent-amber">/02 &bull; HOUSE RULES</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight max-w-2xl">
              Thirty seconds <span className="serif-italic text-accent-amber">from click</span> to opening credits.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="glass p-6 flex flex-col items-start relative overflow-hidden group">
                <div
                  className="mb-8 inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent-amber/20 bg-accent-amber/5 text-[11px] font-mono font-bold text-accent-amber"
                >
                  {n}
                </div>
                <div className="absolute top-8 right-6 text-accent-amber/40">
                  <ArrowRight className="h-3 w-3" />
                </div>
                <h3 className="mb-3 text-[16px] font-bold text-white">{title}</h3>
                <p className="text-[13px] leading-relaxed text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ MANIFESTO ════════════════════════════════════════════════════════ */}
      <section id="why" className="border-t border-white/5 py-32 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-amber/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-[800px] px-6 text-center relative z-10">
          <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-accent-amber">/03 &bull; THE MANIFESTO</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-12">
            Built for <span className="serif-italic text-accent-amber">the love</span> of cinema.
          </h2>
          
          <div className="space-y-8 text-[15px] md:text-[17px] leading-relaxed text-white/60 mx-auto text-left max-w-[600px] font-medium">
            <p>
              We built Watch Together because we missed the feeling of sitting on a couch with friends, sharing a screen, and just enjoying a film. No algorithms. No ads. No tracking.
            </p>
            <p>
              Modern streaming has become a fragmented, isolated experience. We wanted to bring back the shared living room. That's why we built this as a pure, peer-to-peer web application.
            </p>
            <p>
              When you open a room, your browser connects directly to your friends. Your video, your voice, and your chat never touch our servers. It's fully end-to-end encrypted. It's open source. And it will be free forever.
            </p>
          </div>
          
          <div className="mt-16">
            <a
              href="https://github.com/prabhakarkumar07/watchtogether"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              <Github className="h-4 w-4" />
              View Source Code
            </a>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-12 text-center text-xs font-medium text-white/30">
        <p>Built with WebRTC, React, and Tailwind CSS. Open Source.</p>
      </footer>
    </div>
  )
}

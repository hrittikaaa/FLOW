import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Timer,
  BarChart3,
  ShieldCheck,
  Volume2,
  RefreshCw,
  Zap,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing/LandingNav";

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ─── Animation helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function FadeUpSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero Visual — decorative floating timer ────────────────────────── */

function HeroVisual() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="pointer-events-none relative mx-auto w-full max-w-[360px]"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-focus/10 blur-3xl" />
      <div className="glass-panel flex flex-col items-center gap-5 p-8">
        {/* Block name */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-focus/15 text-focus">
            <Timer className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-sm font-medium text-paper">Deep Work, Chapter 4</span>
        </div>

        {/* Ring mockup */}
        <div className="relative flex h-48 w-48 items-center justify-center">
          {/* Track */}
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            {/* Focus arc */}
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="#F2A65A"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="276.46"
              strokeDashoffset="69.1"
              className="drop-shadow-[0_0_8px_rgba(242,166,90,0.7)]"
            />
          </svg>
          {/* Center */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="font-mono text-3xl font-medium tabular text-paper">18:32</span>
            <span className="text-xs text-focus">Focus</span>
          </div>
        </div>

        {/* Segments strip */}
        <div className="flex items-center gap-1.5">
          {[
            { kind: "focus", done: true },
            { kind: "break", done: true },
            { kind: "focus", done: false, active: true },
            { kind: "break", done: false },
            { kind: "focus", done: false },
          ].map((seg, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                seg.active
                  ? "w-8 bg-focus shadow-[0_0_8px_rgba(242,166,90,0.6)]"
                  : seg.kind === "focus"
                  ? seg.done
                    ? "w-4 bg-focus/40"
                    : "w-4 bg-focus/20"
                  : seg.done
                  ? "w-3 bg-rest/40"
                  : "w-3 bg-rest/20"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-white/5 text-muted">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-focus/90 text-ink shadow-[0_0_24px_-6px_rgba(242,166,90,0.7)]">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-white/5 text-muted">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Feature card ───────────────────────────────────────────────────── */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "focus" | "rest";
}

function FeatureCard({ icon, title, description, accent = "focus" }: FeatureCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="glass-panel group flex flex-col gap-4 p-6 transition-shadow duration-300 hover:shadow-glass"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          accent === "focus"
            ? "bg-focus/15 text-focus group-hover:bg-focus/25"
            : "bg-rest/15 text-rest group-hover:bg-rest/25"
        } transition-colors duration-300`}
      >
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-sm font-semibold text-paper">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </motion.div>
  );
}

/* ─── How It Works Timeline ─────────────────────────────────────────── */

const HOW_STEPS = [
  {
    number: "01",
    title: "Create a block",
    description:
      "Give your block a name and a total time goal. 90 minutes, two hours, whatever the task deserves.",
  },
  {
    number: "02",
    title: "Flow sets the rhythm",
    description:
      "Flow automatically splits your time into focus and break segments. Tweak the ratio or leave the default 4:1.",
  },
  {
    number: "03",
    title: "Hit play and that's it",
    description:
      "The timer runs, breaks happen automatically, and your progress syncs across every device you're on.",
  },
];

function TimelineStep({
  step,
  side,
}: {
  step: (typeof HOW_STEPS)[number];
  side: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -40 : 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-panel w-full max-w-[340px] p-6 ${
        side === "left" ? "text-right ml-auto" : "text-left mr-auto"
      }`}
    >
      <span className="mb-2 inline-block font-mono text-xs font-semibold tracking-widest text-focus">
        {step.number}
      </span>
      <h3 className="mb-2 font-display text-base font-semibold text-paper">{step.title}</h3>
      <p className="text-sm leading-relaxed text-muted">{step.description}</p>
    </motion.div>
  );
}

function HowItWorksTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 85%", "end 55%"],
  });
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl px-4">
      {/* Ghost track */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.06]" />

      {/* Animated glowing line */}
      <motion.div
        className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2 origin-top rounded-full"
        style={{
          scaleY: lineScaleY,
          height: "100%",
          background: "linear-gradient(to bottom, #F2A65A 0%, #F2A65A 60%, #6FD6C6 100%)",
          boxShadow:
            "0 0 10px 3px rgba(242,166,90,0.55), 0 0 28px 8px rgba(242,166,90,0.18)",
        }}
      />

      {/* Steps */}
      {HOW_STEPS.map((step, i) => {
        const side = i % 2 === 0 ? "left" : "right";
        return (
          <div
            key={step.number}
            className="relative grid grid-cols-[1fr_56px_1fr] items-center py-14"
          >
            {/* Left slot */}
            <div className="flex justify-end pr-6">
              {side === "left" && <TimelineStep step={step} side="left" />}
            </div>

            {/* Center dot */}
            <div className="relative z-10 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-focus/30 bg-ink"
              >
                <div className="h-3 w-3 rounded-full bg-focus shadow-[0_0_14px_5px_rgba(242,166,90,0.6)]" />
                {/* Pulse ring */}
                <div className="absolute inset-0 animate-ping rounded-full bg-focus/15 [animation-duration:2.8s]" />
              </motion.div>
            </div>

            {/* Right slot */}
            <div className="flex justify-start pl-6">
              {side === "right" && <TimelineStep step={step} side="right" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────── */

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <LandingNav onSignIn={onGetStarted} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20 pb-12 text-center sm:px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-focus/25 bg-focus/10 px-4 py-1.5 text-xs font-medium text-focus"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-focus animate-pulse" />
          Built for deep, intentional work
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 max-w-3xl font-display text-4xl font-semibold leading-[1.15] text-paper sm:text-5xl lg:text-6xl"
        >
          Stop managing your time.
          <br />
          <span className="bg-gradient-to-r from-focus via-focus/80 to-rest bg-clip-text text-transparent">
            Start protecting it.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 max-w-md text-base leading-relaxed text-muted sm:text-lg"
        >
          Flow breaks your work into focus blocks with built-in breaks, so you actually finish things
          instead of just staying busy.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            id="landing-hero-get-started-btn"
            size="lg"
            variant="primary"
            onClick={onGetStarted}
            className="gap-2"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            id="landing-hero-signin-btn"
            size="lg"
            variant="outline"
            onClick={onGetStarted}
          >
            Sign in
          </Button>
        </motion.div>

        {/* Trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-5 flex items-center gap-4 text-xs text-muted"
        >
          {["Free forever", "No credit card", "Works offline"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-rest" />
              {item}
            </span>
          ))}
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 w-full max-w-sm"
        >
          <HeroVisual />
        </motion.div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUpSection className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-focus/80">
              How it works
            </p>
            <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
              Three steps, then just focus
            </h2>
            <p className="mt-3 text-sm text-muted">
              No onboarding calls, no 47-step setup. You can be running your first block in under a minute.
            </p>
          </FadeUpSection>

          <HowItWorksTimeline />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeUpSection className="mb-14 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-rest/80">
              Everything you need
            </p>
            <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
              Designed to get out of your way
            </h2>
            <p className="mt-3 text-sm text-muted">
              Every feature exists because it helps you actually focus. Not because it looked good on a features page.
            </p>
          </FadeUpSection>

          <StaggerSection className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Timer className="h-5 w-5" />}
              title="Focus blocks"
              description="Group related work into named blocks with a single time goal. One block per project, not twelve scattered timers."
              accent="focus"
            />
            <FeatureCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Auto-paced breaks"
              description="Breaks aren't an afterthought. They're baked in. Flow spaces them out based on your chosen focus-to-break ratio."
              accent="rest"
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Weekly & monthly analytics"
              description="See exactly where your hours went. Chart your focus time week over week so you can spot the good days and learn from the rough ones."
              accent="focus"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Strict mode"
              description="When you really need to stay honest, turn on strict mode. Skip and restart are locked, and you'll get a warning before closing the tab."
              accent="rest"
            />
            <FeatureCard
              icon={<Volume2 className="h-5 w-5" />}
              title="Ambient sounds"
              description="Attach a soundscape to any block (rain, brown noise, café hum) and it plays automatically when your focus segment starts."
              accent="focus"
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Real-time sync"
              description="Start a block on your laptop, check in on your phone. Timer state syncs instantly, no refresh needed."
              accent="rest"
            />
          </StaggerSection>
        </div>
      </section>

      {/* ── Testimonial strip ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FadeUpSection>
            <blockquote className="glass-panel p-8 text-center">
              <p className="mb-5 font-display text-lg font-medium leading-relaxed text-paper sm:text-xl">
                "The problem isn't that we have too little time. It's that we spend it on the wrong things: scattered and reactive."
              </p>
              <cite className="text-sm text-muted not-italic">
                Cal Newport, <em>Deep Work</em>
              </cite>
            </blockquote>
          </FadeUpSection>
        </div>
      </section>

      {/* ── Final CTA strip ───────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <FadeUpSection className="glass-panel relative overflow-hidden p-10 text-center">
            {/* Background glow */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-focus/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-rest/15 blur-3xl" />

            <div className="relative flex flex-col items-center gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-focus/15 text-focus">
                <Timer className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
                  Ready to actually get things done?
                </h2>
                <p className="text-sm text-muted">
                  It takes about 30 seconds to set up your first block. The hard part is deciding what to focus on.
                </p>
              </div>
              <Button
                id="landing-cta-get-started-btn"
                size="lg"
                variant="primary"
                onClick={onGetStarted}
                className="gap-2"
              >
                Get started, it's free
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-4 text-xs text-muted">
                {[
                  "No credit card",
                  "Cancel anytime",
                  "Your data stays yours",
                ].map((item, i, arr) => (
                  <span key={item} className="flex items-center gap-3">
                    <span>{item}</span>
                    {i < arr.length - 1 && (
                      <Circle className="h-1 w-1 fill-muted text-muted" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </FadeUpSection>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-glass-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-focus/15 text-focus">
              <Timer className="h-3 w-3" />
            </div>
            <span className="font-display font-medium text-paper/60">Flow</span>
          </div>
          <span>Built for people who take their time seriously.</span>
        </div>
      </footer>
    </div>
  );
}

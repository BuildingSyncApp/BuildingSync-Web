"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Status = "live" | "roadmap";

type Highlight = {
  status: Status;
  badge: string;
  title: string;
  note: string;
  detail: string;
  points: string[];
};

const HIGHLIGHTS: Highlight[] = [
  {
    status: "live",
    badge: "Live in R1",
    title: "Mobile Resident App",
    note: "Submit maintenance requests, read announcements, and manage your account from anywhere.",
    detail: "Installable PWA — residents and staff add BuildingSync to their home screen from Safari or Chrome. Works offline for the shell, native-feeling navigation, brand-mark home tile.",
    points: ["Maintenance request tracking", "Announcement broadcast", "Profile + password self-service"],
  },
  {
    status: "roadmap",
    badge: "Roadmap",
    title: "ImageR AI Package Tracking",
    note: "Automatically scan and log packages with image recognition. Reduce manual entry by 90%.",
    detail: "ImageR captures label data, matches parcels to units, and pushes instant resident notifications without front-desk double entry.",
    points: ["AI-assisted label capture", "Resident notification automation", "Audit-ready package history"],
  },
  {
    status: "roadmap",
    badge: "Roadmap",
    title: "KeyLink Biometric Access",
    note: "Secure key management with fingerprint authentication, smart tags, and complete audit trails.",
    detail: "Biometric validation ties each key handoff to a verified staff member, reducing lost inventory and disputed access events.",
    points: ["Fingerprint-verified pickup", "Smart key tagging", "Full access audit trail"],
  },
  {
    status: "roadmap",
    badge: "Roadmap",
    title: "E-Voting & Virtual AGMs",
    note: "Run board elections and annual general meetings digitally with secure, verifiable voting.",
    detail: "Issue agendas, collect secure ballots, and publish results with an audit trail that survives meeting turnover.",
    points: ["Secure digital ballots", "Virtual meeting participation", "Verifiable result logs"],
  },
];

export function ProductHighlights() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const dragDistance = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const cur = el.scrollLeft;
    setProgress(max > 0 ? cur / max : 0);
    setCanLeft(cur > 4);
    setCanRight(cur < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollByDir = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    isDragging.current = true;
    dragDistance.current = 0;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragStartScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const el = scrollerRef.current;
    if (!isDragging.current || !el) return;
    const x = e.pageX - el.offsetLeft;
    const delta = x - dragStartX.current;
    dragDistance.current = Math.max(dragDistance.current, Math.abs(delta));
    el.scrollLeft = dragStartScrollLeft.current - delta * 1.2;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollerRef.current) scrollerRef.current.style.cursor = "grab";
  };

  return (
    <section id="features" className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 border-t border-border overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-15%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">01 / Features</p>
          <h2
            className="mt-4 tracking-tight"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            PRODUCT HIGHLIGHTS
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            disabled={!canLeft}
            aria-label="Scroll left"
            className={`w-10 h-10 border border-border rounded-md font-mono text-sm transition-colors ${
              canLeft
                ? "text-foreground hover:border-accent hover:text-accent"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            disabled={!canRight}
            aria-label="Scroll right"
            className={`w-10 h-10 border border-border rounded-md font-mono text-sm transition-colors ${
              canRight
                ? "text-foreground hover:border-accent hover:text-accent"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            →
          </button>
        </div>
      </motion.div>

      <div className="mt-8 mb-3 h-px bg-border/50 relative">
        <motion.div
          className="absolute top-0 left-0 h-px bg-accent"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.15 }}
        />
      </div>

      <p className="mb-4 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-widest select-none">
        <span className="md:hidden">Swipe to explore</span>
        <span className="hidden md:inline">Drag or use arrows to explore</span>
      </p>

      <div
        ref={scrollerRef}
        className="flex gap-4 md:gap-6 overflow-x-auto pb-4 select-none scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {HIGHLIGHTS.map((h, i) => (
          <HighlightCard
            key={h.title}
            highlight={h}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => {
              if (dragDistance.current > 8) return;
              setOpenIndex((cur) => (cur === i ? null : i));
            }}
          />
        ))}
      </div>

      <div className="mt-4 flex md:hidden items-center gap-2">
        {HIGHLIGHTS.map((_, i) => {
          const seg = 1 / HIGHLIGHTS.length;
          const active = progress >= i * seg - 0.05 && progress < (i + 1) * seg + 0.05;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => {
                const cards = scrollerRef.current?.querySelectorAll("article");
                cards?.[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }}
              className={`h-px transition-all duration-300 ${active ? "w-6 bg-accent" : "w-3 bg-border/50"}`}
            />
          );
        })}
      </div>
    </section>
  );
}

function HighlightCard({
  highlight,
  index,
  isOpen,
  onToggle,
}: {
  highlight: Highlight;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className="flex-shrink-0 w-[83vw] sm:w-80 md:w-96"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`relative w-full text-left bg-card border rounded-lg p-6 md:p-7 transition-colors ${
          isOpen ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
        }`}
      >
        <div className="flex items-baseline justify-between mb-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            No. {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                highlight.status === "live"
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground"
              }`}
            >
              {highlight.badge}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
              {isOpen ? "Close" : "Open"}
            </span>
          </div>
        </div>

        <h3
          className="text-3xl md:text-4xl tracking-tight mb-4"
          style={{ fontFamily: "var(--font-bebas)" }}
        >
          {highlight.title}
        </h3>

        <div className={`h-px bg-accent/60 mb-5 transition-all duration-500 ${isOpen ? "w-full" : "w-12"}`} />

        <p className="font-mono text-xs text-muted-foreground leading-relaxed">{highlight.note}</p>

        <div
          className={`grid transition-all duration-500 ease-out ${
            isOpen ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0"
          }`}
        >
          <div className="overflow-hidden">
            <p className="font-mono text-xs leading-relaxed text-foreground/85">{highlight.detail}</p>
            <ul className="mt-5 space-y-2">
              {highlight.points.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                >
                  <span className="h-px w-4 bg-accent/70" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

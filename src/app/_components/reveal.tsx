"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

interface Props {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Stagger-Verzögerung in Sekunden. */
  delay?: number;
}

export function Reveal({ children, as, className = "", style, delay = 0 }: Props) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    // Sicherheitsnetz: Inhalt darf NIE dauerhaft versteckt bleiben (langsames
    // JS, Headless-Capture, IO-Edge-Cases). Nach 2s spätestens einblenden.
    const fallback = window.setTimeout(() => el.classList.add("is-visible"), 2000);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const merged: CSSProperties = { ...style, ["--reveal-delay" as keyof CSSProperties]: `${delay}s` } as CSSProperties;

  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()} style={merged}>
      {children}
    </Tag>
  );
}

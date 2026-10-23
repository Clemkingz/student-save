"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Coins, GraduationCap, PiggyBank } from "lucide-react";

export function StudentSlogan({ signUpPath }: { signUpPath: string }) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || reducedMotion.matches || !("IntersectionObserver" in window)) return;
    // Content is visible without JS. Hide only when observation is available.
    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        element.dataset.reveal = "visible";
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    const showStatic = () => {
      if (reducedMotion.matches) {
        delete element.dataset.reveal;
        observer.disconnect();
      }
    };
    reducedMotion.addEventListener("change", showStatic);
    observer.observe(element);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", showStatic);
      delete element.dataset.reveal;
    };
  }, []);

  return (
    <section ref={section} className="student-slogan" aria-labelledby="student-slogan-title">
      <div className="slogan-icons" aria-hidden="true"><Coins /><PiggyBank /><GraduationCap /></div>
      <div className="section-shell slogan-content">
        <h2 id="student-slogan-title">
          <span className="slogan-line">You don&apos;t need a bank account</span>{" "}
          <span className="slogan-line">to spend and save as a student.</span>{" "}
          <span className="slogan-line slogan-accent">Student Save got you.</span>
        </h2>
        <p>No bank account? No problem. Student Save lets you spend smart, save toward your goals, and stay in control, all built for student life. Verify your student status and get started in minutes.</p>
        <Link className="button button-lime" href={signUpPath}>Get Started <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

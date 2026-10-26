"use client";

import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.animate([{ opacity: .35, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 550, easing: "cubic-bezier(.2,.7,.2,1)", delay: Number((entry.target as HTMLElement).dataset.revealDelay || 0) });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    document.querySelectorAll(".section-heading, .feature-card, .step-item, .commitment-copy, .faq-intro, .final-cta-card").forEach((element, index) => {
      (element as HTMLElement).dataset.revealDelay = String((index % 3) * 65);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}

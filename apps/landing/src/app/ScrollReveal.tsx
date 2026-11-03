"use client";

import { useEffect } from "react";

const revealed = ".intro-item, .section-heading, .feature-card, .how-heading, .step-item, .commitment-art, .commitment-copy, .faq-intro, .faq-item, .final-cta-card, .footer-main > *";

function countUp(element: HTMLElement) {
  const target = Number(element.dataset.count);
  const start = performance.now() + 500;
  const step = (now: number) => {
    const progress = Math.min(Math.max(now - start, 0) / 1300, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = `₦${Math.round(target * eased).toLocaleString("en-NG")}`;
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  let frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    element.textContent = `₦${target.toLocaleString("en-NG")}`;
  };
}

export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const amount = document.querySelector<HTMLElement>("[data-count]");
    const stopCount = amount ? countUp(amount) : undefined;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealed));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        const order = Array.from(element.parentElement?.children ?? []).indexOf(element);
        element.classList.remove("reveal-pending");
        element.classList.add("revealed");
        element.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", delay: Math.min(order, 5) * 80, fill: "backwards" });
      });
    }, { threshold: .1, rootMargin: "0px 0px -5% 0px" });
    // Hidden only from here, so the page still shows in full without JavaScript.
    elements.forEach(element => {
      element.classList.add("reveal-pending");
      observer.observe(element);
    });
    return () => {
      observer.disconnect();
      stopCount?.();
      elements.forEach(element => element.classList.remove("reveal-pending"));
    };
  }, []);
  return null;
}

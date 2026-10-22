import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  ChartNoAxesCombined,
  CircleHelp,
  GraduationCap,
  LockKeyhole,
  Menu,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

const spendingBars = [42, 58, 46, 72, 52, 66, 86, 61, 75, 54, 96, 69];
const appSignUpPath = "/app/auth/sign-up";

const faqs = [
  {
    question: "Does StudentSave connect to my bank?",
    answer: "No. You enter your own income and expenses. StudentSave keeps a record of what you choose to add; it does not import or verify bank activity.",
  },
  {
    question: "What does Lock Savings do?",
    answer: "It is a voluntary commitment to help you stay accountable to a goal. It does not hold, move, or restrict your money, and you record progress manually.",
  },
  {
    question: "Do I need to be a student to use it?",
    answer: "StudentSave is designed with student life in mind. Email verification confirms access to an email address; it does not verify student status.",
  },
  {
    question: "Can I change my budget or savings goal?",
    answer: "Budgets and goals are plans you create for yourself. You can review and adjust them as your priorities change.",
  },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link className={footer ? "brand brand-footer" : "brand"} href="/" aria-label="StudentSave home">
      {/* The supplied mark is vector artwork, so it stays crisp at every size. */}
      <Image src="/student-save-logo.svg" width={205} height={51} alt="StudentSave — Save Smart, Spend Wisely" />
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="hero-visual">
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <div className="float-note goal-note">
        <span className="float-note-icon"><Target size={17} aria-hidden="true" /></span>
        <span><small>Goal progress</small><strong>Little by little ✨</strong></span>
      </div>
      <div className="dashboard-card">
        <div className="dashboard-topline">
          <div className="avatar-mark"><GraduationCap size={18} aria-hidden="true" /></div>
          <div><strong>Your money overview</strong><span>Sample dashboard</span></div>
          <span className="more-button" aria-hidden="true">•••</span>
        </div>

        <div className="balance-panel">
          <div className="balance-caption"><span>Tracked balance</span><span className="sample-pill"><span /> Example</span></div>
          <strong className="balance-amount">₦126,500</strong>
          <span className="balance-helper">Based on records you add</span>
          <div className="balance-change"><ArrowUpRight size={14} aria-hidden="true" /> Your records, all in one place</div>
        </div>

        <div className="overview-head"><div><strong>This month</strong><span>Spending overview</span></div><span className="month-select">May <span aria-hidden="true">⌄</span></span></div>
        <div className="chart-panel" role="img" aria-label="Decorative example of spending activity across a month">
          <div className="chart-y-labels"><span>₦60k</span><span>₦40k</span><span>₦20k</span><span>₦0</span></div>
          <div className="chart-content">
            <div className="chart-grid"><i /><i /><i /><i /></div>
            <div className="chart-bars">
              {spendingBars.map((height, index) => (
                <span className="chart-bar" key={index} style={{ "--bar-height": `${height}%`, "--bar-index": index } as CSSProperties} />
              ))}
            </div>
            <div className="chart-x-labels"><span>1</span><span>8</span><span>15</span><span>22</span><span>30</span></div>
          </div>
        </div>

        <div className="preview-lower">
          <div className="mini-budget">
            <div className="mini-heading"><span className="mini-icon budget-icon"><BookOpenCheck size={15} aria-hidden="true" /></span><span>Food budget</span><strong>72%</strong></div>
            <div className="progress-track"><span /></div>
            <small>₦14,400 <i>of</i> ₦20,000</small>
          </div>
          <div className="mini-goal">
            <span className="mini-icon goal-icon"><PiggyBank size={15} aria-hidden="true" /></span>
            <span><small>Savings goal</small><strong>New laptop</strong></span>
            <span className="goal-percent">35%</span>
          </div>
        </div>
      </div>
      <div className="float-note record-note">
        <span className="record-icon"><ReceiptText size={17} aria-hidden="true" /></span>
        <span><small>Made for real life</small><strong>Easy to keep up</strong></span>
        <BadgeCheck className="record-check" size={18} aria-hidden="true" />
      </div>
      <span className="visual-disclaimer">Illustrative preview with sample values</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="#features">What you can do</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#faq">FAQs</Link>
          </nav>
          <Link className="header-cta" href={appSignUpPath}>Create account <ArrowRight size={16} aria-hidden="true" /></Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation"><Menu size={22} aria-hidden="true" /></summary>
            <nav aria-label="Mobile navigation">
              <Link href="#features">What you can do</Link>
              <Link href="#how-it-works">How it works</Link>
              <Link href="#faq">FAQs</Link>
              <Link href={appSignUpPath}>Create account</Link>
            </nav>
          </details>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-bg-shape shape-a" />
        <div className="hero-bg-shape shape-b" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-kicker"><Sparkles size={14} aria-hidden="true" /> Your money, your next chapter</span>
            <h1>Make room for<br />what <span>matters.</span></h1>
            <p className="hero-description">Student life has enough surprises. Keep your money in view, make a plan that feels doable, and build better habits one step at a time.</p>
            <div className="hero-buttons">
              <Link className="button button-lime" href={appSignUpPath}>Create account <ArrowRight size={17} aria-hidden="true" /></Link>
              <Link className="button button-outline" href="#features">Explore the features</Link>
            </div>
            <div className="hero-trust"><ShieldCheck size={17} aria-hidden="true" /><span>Your money stays yours. StudentSave simply helps you keep track.</span></div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="intro-strip" aria-label="StudentSave principles">
        <div className="intro-item"><span className="intro-mark"><Wallet size={17} aria-hidden="true" /></span><span>Know what you’ve recorded</span></div>
        <span className="intro-divider" />
        <div className="intro-item"><span className="intro-mark"><Target size={17} aria-hidden="true" /></span><span>Make plans that fit student life</span></div>
        <span className="intro-divider" />
        <div className="intro-item"><span className="intro-mark"><LockKeyhole size={17} aria-hidden="true" /></span><span>Stay in control of your money</span></div>
      </section>

      <section className="features-section section-shell" id="features">
        <div className="section-heading">
          <span className="section-kicker">A little more clarity</span>
          <h2>Good money habits<br /><span>start small.</span></h2>
          <p>One simple place to see what’s coming in, what’s going out, and what you’re working toward.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-card-green">
            <div className="feature-top"><span className="feature-icon"><ReceiptText size={21} aria-hidden="true" /></span><span className="feature-index">01</span></div>
            <h3>See where it goes</h3>
            <p>Record money in and everyday spending, from lunch and transport to side-hustle earnings.</p>
            <Link href="#how-it-works" aria-label="Learn how to track money">Track your money <ArrowRight size={15} aria-hidden="true" /></Link>
            <div className="feature-decoration receipt-decoration"><span /><span /><span /><b>₦</b></div>
          </article>
          <article className="feature-card feature-card-yellow">
            <div className="feature-top"><span className="feature-icon"><ChartNoAxesCombined size={21} aria-hidden="true" /></span><span className="feature-index">02</span></div>
            <h3>Plan without pressure</h3>
            <p>Set spending limits that make sense for you. See what’s left and adjust when life changes.</p>
            <Link href="#how-it-works" aria-label="Learn how to plan a budget">Make a simple budget <ArrowRight size={15} aria-hidden="true" /></Link>
            <div className="budget-decoration"><span /><span /><span /><span /></div>
          </article>
          <article className="feature-card feature-card-mint">
            <div className="feature-top"><span className="feature-icon"><PiggyBank size={21} aria-hidden="true" /></span><span className="feature-index">03</span></div>
            <h3>Save for your next thing</h3>
            <p>Choose a goal that matters to you and record your progress as you go. Every step counts.</p>
            <Link href="#commitment" aria-label="Learn about savings goals">Build toward a goal <ArrowRight size={15} aria-hidden="true" /></Link>
            <div className="goal-decoration"><div className="goal-decoration-ring"><span>35%</span></div><Sparkles size={16} aria-hidden="true" /></div>
          </article>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-shell how-inner">
          <div className="how-heading">
            <span className="section-kicker">No complicated setup</span>
            <h2>Start where<br />you <span>are.</span></h2>
            <p>You don’t need a perfect budget or a big savings balance to begin. Just take the next small step.</p>
            <Link className="text-link" href="#get-started">Find your first step <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="steps-list">
            <article className="step-item"><span className="step-number">1</span><div><h3>Write it down</h3><p>Add the money you receive and the things you spend on. Your records are yours to update.</p></div><ArrowDownRight className="step-arrow" size={20} aria-hidden="true" /></article>
            <article className="step-item"><span className="step-number">2</span><div><h3>Choose a plan</h3><p>Make a budget for the things you care about, or set a savings goal for what’s ahead.</p></div><ArrowDownRight className="step-arrow" size={20} aria-hidden="true" /></article>
            <article className="step-item"><span className="step-number">3</span><div><h3>Keep moving</h3><p>Check in when it helps, notice your progress, and change your plan when you need to.</p></div><span className="step-done"><BadgeCheck size={20} aria-hidden="true" /></span></article>
          </div>
        </div>
      </section>

      <section className="commitment-section section-shell" id="commitment">
        <div className="commitment-art" aria-hidden="true">
          <div className="commitment-sun" />
          <div className="commitment-card"><span className="commitment-lock"><LockKeyhole size={25} /></span><span className="commitment-lines"><i /><i /><i /></span><span className="commitment-sticker"><Sparkles size={17} /></span></div>
          <span className="commitment-leaf leaf-one" /><span className="commitment-leaf leaf-two" />
        </div>
        <div className="commitment-copy">
          <span className="section-kicker">A promise to yourself</span>
          <h2>Keep your goals<br />close. <span>Keep control.</span></h2>
          <p>Lock Savings is a personal commitment to keep working toward something you want. Log the progress you choose, and stay in charge of your money the whole time.</p>
          <div className="honest-note"><span><ShieldCheck size={18} aria-hidden="true" /></span><p><strong>Just to be clear</strong>StudentSave never locks, holds, or moves your money. Your commitment is yours to manage.</p></div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-shell faq-inner">
          <div className="faq-intro"><span className="faq-icon"><CircleHelp size={22} aria-hidden="true" /></span><span className="section-kicker">Good questions</span><h2>Clear answers,<br />always.</h2><p>Money feels personal. We’ll always be straightforward about what StudentSave does and doesn’t do.</p></div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details className="faq-item" key={faq.question}>
                <summary>{faq.question}<span className="faq-plus" aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta section-shell" id="get-started">
        <div className="final-cta-card">
          <div className="cta-spark cta-spark-one"><Sparkles size={24} aria-hidden="true" /></div>
          <div className="cta-spark cta-spark-two"><Sparkles size={15} aria-hidden="true" /></div>
          <span className="cta-kicker">Your next chapter starts with a small step</span>
          <h2>Make your money<br />make sense.</h2>
          <p>Keep track. Make a plan. Give your goals a little room to grow.</p>
          <Link className="button button-lime" href={appSignUpPath}>Create your account <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-main section-shell">
          <div className="footer-brand-block"><Brand footer /><p>Save smart. Spend wisely.<br />A little more clarity for student money.</p></div>
          <div className="footer-links"><strong>Explore</strong><Link href="#features">Features</Link><Link href="#how-it-works">How it works</Link><Link href="#faq">FAQs</Link></div>
          <div className="footer-links"><strong>Our promise</strong><span>Manual tracking</span><span>Your money stays yours</span><span>No student-status claims</span></div>
          <div className="footer-note"><span className="footer-note-icon"><ShieldCheck size={17} aria-hidden="true" /></span><p>StudentSave records information you enter. It does not connect to your bank or hold, transfer, or verify funds.</p></div>
        </div>
        <div className="footer-bottom section-shell"><span>© 2026 StudentSave</span><span>Built for better money habits.</span></div>
      </footer>
    </main>
  );
}

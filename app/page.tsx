
import Link from "next/link";
import {
  CerynqSidebar,
  CerynqMobileHeader,
} from "../components/CerynqSidebar";

const ARGUS_ADDRESS =
  "0xeCe5cA8bf9220718E5727754026757512212cb3c";

const steps = [
  {
    number: "01",
    title: "Analyze",
    description:
      "Enter an Arc Mainnet smart-contract address or start with a real example.",
  },
  {
    number: "02",
    title: "Understand",
    description:
      "Examine recognized controls, evidence confidence and assessment coverage.",
  },
  {
    number: "03",
    title: "Verify",
    description:
      "Review supporting information, source provenance and unresolved checks.",
  },
];

const capabilities = [
  "Contract verification",
  "Proxy identification",
  "Implementation resolution",
  "Ownership controls",
  "Pause capability",
  "Blacklist and whitelist signals",
  "Privileged functions",
  "Evidence provenance",
];

export default function HomePage() {
  return (
    <main className="cq-home">
      <div className="mx-auto flex min-h-screen max-w-[1850px]">
        <CerynqSidebar />

        <div className="cq-home-main">
          <CerynqMobileHeader />

          <div className="cq-home-content">

            {/* HERO */}

            <section className="cq-hero">
              <div className="cq-hero-inner">
                <p className="cq-eyebrow">
                  Trust through evidence
                </p>

                <h1>
                  Onchain Risk Intelligence for Arc
                </h1>

                <p className="cq-hero-description">
                  Understand supported smart-contract risk
                  signals with explainable findings, traceable
                  evidence and transparent limitations.
                </p>

                <div className="cq-actions">
                  <Link
                    href="/scan"
                    className="cq-button cq-button-primary"
                  >
                    Open contract scanner →
                  </Link>

                  <Link
                    href={`/scan?example=${ARGUS_ADDRESS}`}
                    className="cq-button"
                  >
                    Analyze example: Argus →
                  </Link>
                </div>

                <p className="cq-hero-note">
                  Live Arc Mainnet analysis · No wallet
                  connection required
                </p>
              </div>
            </section>

            {/* HOW IT WORKS */}

            <section className="cq-section">
              <div className="cq-section-heading">
                <p className="cq-eyebrow">
                  Get started
                </p>

                <h2>
                  How Cerynq works
                </h2>
              </div>

              <div className="cq-step-grid">
                {steps.map((step) => (
                  <article
                    key={step.number}
                    className="cq-panel"
                  >
                    <span className="cq-step-number">
                      {step.number}
                    </span>

                    <h3>{step.title}</h3>

                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* CURRENT PRODUCT */}

            <section className="cq-home-bottom">
              <div className="cq-panel">
                <p className="cq-eyebrow">
                  Available today
                </p>

                <h3>
                  Supported contract intelligence
                </h3>

                <p>
                  Cerynq examines recognized smart-contract
                  structures and control signals using Arc
                  Mainnet data and available provider evidence.
                  Missing information remains visible rather
                  than being treated as a safe result.
                </p>

                <div className="cq-capabilities">
                  {capabilities.map((capability) => (
                    <div
                      key={capability}
                      className="cq-capability"
                    >
                      <span
                        className="cq-capability-mark"
                        aria-hidden="true"
                      />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/scan"
                  className="cq-text-link"
                >
                  Start an analysis →
                </Link>
              </div>

              <div className="cq-panel cq-methodology">
                <p className="cq-eyebrow">
                  Explainable methodology
                </p>

                <h3>
                  Evidence before conclusions
                </h3>

                <p>
                  Findings describe supported observations,
                  not a complete assessment of a contract&apos;s
                  security.
                </p>

                <p>
                  Detected, Not detected and Unknown each
                  have specific meanings. Coverage, confidence
                  and evidence provenance help you understand
                  what the analysis establishes — and what
                  remains uncertain.
                </p>

                <Link
                  href="/resources#risk-model"
                  className="cq-text-link"
                >
                  Read the methodology →
                </Link>
              </div>
            </section>

            {/* FOOTER */}

            <footer className="cq-home-footer">
              <span>
                Cerynq · Arc Mainnet · Risk Model v0.1
              </span>

              <span>
                Public beta · Informational analysis,
                not a security audit
              </span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

# Cerynq

**Explainable onchain risk intelligence for Arc.**

Cerynq is an onchain risk intelligence platform being built on Arc.

The current beta starts with smart-contract intelligence: identifying supported privileged-control signals, resolving proxy implementations when possible, evaluating evidence provenance, and explaining the evidence and limitations behind each finding.

Cerynq is designed as a broader risk-intelligence platform. Its architecture is intended to expand beyond contract analysis into wallet intelligence, entity intelligence, risk-flow monitoring, and future institutional risk workflows.

---

## Current Beta

The current beta analyzes smart contracts on **Arc Mainnet**.

Its goal is not to reduce a contract to a simple "safe" or "unsafe" label.

Instead, Cerynq surfaces supported risk signals together with:

- classification
- evidence source
- evidence confidence
- score contribution
- model coverage
- explanation
- known limitations

Current capabilities include:

- Arc Mainnet smart-contract analysis
- Onchain bytecode detection
- Proxy-aware analysis
- Implementation resolution when available
- ABI provenance tracking
- Verification-quality tracking
- Explainable privileged-control findings
- Explicit `Unknown` states when evidence is insufficient
- Risk Model v0.1
- Evidence confidence
- Model coverage
- Conservative treatment of incomplete or limited evidence

---

## Risk Model v0.1

The current model evaluates five privileged-control categories:

1. **Active Ownership**
2. **Pause Capability**
3. **Blacklist / Freeze Capability**
4. **Whitelist Capability**
5. **Other Privileged Controls**

Each finding can be classified as:

- `detected`
- `not_detected`
- `unknown`

`Unknown` is a first-class result in Cerynq.

Missing or incomplete evidence is not automatically interpreted as absence of risk.

---

## Evidence and Provenance

Cerynq tracks not only what was observed, but also where the evidence came from and how strongly that evidence supports a classification.

Current evidence sources include:

- Arc Mainnet RPC
- Arc Explorer contract ABI
- Arc Explorer implementation ABI

ABI evidence can currently be classified as:

- `full`
- `limited`
- `unknown`

Verification provenance can include:

- fully verified
- partially verified
- verified with tier unavailable
- unverified
- unknown
- Sourcify verification signals
- bytecode-database verification signals

A limited-provenance ABI can still support a positive interface signal.

However, absence of a supported method from limited evidence is not treated as proof that the capability does not exist.

---

## Assessment Semantics

A Cerynq scan can produce one of three assessment states.

### Complete

All checks in the current model were resolved.

Only a complete assessment can receive a current-model risk level.

### Partial

Some checks were resolved while one or more checks remain `Unknown`.

In this state, the displayed score reflects only resolved signals.

It must not be interpreted as a complete risk classification.

### Insufficient

The available evidence was not sufficient to resolve the current model.

No risk level is assigned.

---

## Proxy Analysis

Cerynq uses Arc Explorer metadata to identify and resolve supported proxy structures.

When a proxy has one reported implementation, Cerynq can analyze the implementation ABI when evidence is available.

For multi-implementation architectures, Cerynq currently avoids collapsing multiple implementations into a single ABI.

This is intentional.

When the evidence cannot justify a complete conclusion, Cerynq prefers unresolved findings over false certainty.

The current beta has been validated against an **EIP-1167 minimal proxy on Arc Mainnet**.

---

## Architecture

The current codebase separates evidence collection, detection, and risk evaluation.

```text
app/
  api/
    scan/
      route.ts

  page.tsx

lib/
  arc/
    client.ts
    explorer.ts

  detectors/
    ownership.ts
    pause.ts
    blacklist.ts
    whitelist.ts
    privileged.ts

  risk/
    engine.ts
```

This separation is intentional.

The current contract-analysis pipeline is designed to remain one intelligence domain within Cerynq rather than becoming the entire platform architecture.

---

## Platform Direction

Cerynq begins with contract intelligence, but the long-term platform is intended to support broader onchain risk intelligence.

Future areas of research and development include the following.

### Bytecode Signal Intelligence

Cerynq is intended to analyze onchain bytecode when verified ABI evidence is unavailable or incomplete.

A core principle of this future capability is the distinction between:

- **selector observed**
- **function semantics confirmed**

A selector observed in bytecode confirms that a selector exists.

It does **not** by itself prove:

- function behavior
- function name
- access control
- administrative authority
- malicious intent

Cerynq should preserve this distinction when bytecode intelligence is introduced.

### Broader Contract Intelligence

Future contract-analysis capabilities may include:

- deeper proxy analysis
- upgradeability analysis
- ownership-transition intelligence
- role-based access analysis
- live administrative state
- runtime evidence
- behavioral evidence
- broader privileged-control coverage

### Wallet Intelligence

Future wallet-focused capabilities may include:

- flagged-wallet analysis
- wallet risk context
- counterparty analysis
- exposure analysis
- behavioral indicators
- transaction-history intelligence

### Entity Intelligence

Future analysis may connect addresses into broader entity or cluster context where evidence supports doing so.

Potential areas include:

- address clustering
- entity relationships
- shared control patterns
- counterparty context
- exposure relationships

### Risk-Flow Monitoring

Future risk intelligence may analyze how funds, exposure, and risk signals move across:

- wallets
- contracts
- entities
- counterparties
- transaction paths

This can support a broader view of onchain risk than isolated address analysis.

### Institutional Risk Intelligence

The institutional layer is a future expansion of the Cerynq platform.

Potential institutional workflows include:

- analysis of flagged wallets
- risk-flow monitoring
- entity-level intelligence
- counterparty exposure monitoring
- ongoing risk monitoring
- investigation-oriented evidence
- explainable risk provenance
- historical risk context

These capabilities are **not part of the current public beta**.

---

## Design Principles

### Explainability

Every supported classification should be traceable to observable evidence.

### Evidence Before Certainty

Incomplete evidence should remain incomplete.

`Unknown` must never silently become `Not detected`.

### Provenance Matters

Evidence quality depends not only on what was observed, but also on where the evidence came from.

### Conservative Classification

Cerynq should prefer unresolved results over unsupported reassurance.

### Separation of Observation and Interpretation

Observed technical signals should not automatically be treated as confirmed behavioral semantics.

### Modular Intelligence

Contract intelligence, wallet intelligence, entity intelligence, risk-flow intelligence, and institutional monitoring should remain composable domains rather than becoming tightly coupled to a single scanner workflow.

---

## Technology

Current stack:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- viem
- Zod
- Arc Mainnet
- Arc Explorer / Blockscout API

Arc Mainnet:

```text
Chain ID: 5042
RPC: https://rpc.mainnet.arc.io
```

---

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```text
.env.local
```

Configure the Blockscout API key:

```env
BLOCKSCOUT_API_KEY=your_blockscout_api_key
```

Do not commit `.env.local` or production credentials.

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## API

Current beta scan endpoint:

```text
POST /api/scan
```

Example request:

```json
{
  "address": "0x..."
}
```

The endpoint returns contract intelligence, evidence metadata, detector findings, and the current risk-model result.

The current beta performs read-only analysis.

Cerynq does not execute onchain transactions through the scan endpoint.

---

## Security Boundaries

The current beta performs read-only analysis against public blockchain and explorer data.

Current safeguards include:

- strict request validation
- JSON content-type enforcement
- request-body size limits
- basic rate limiting
- generic client-facing error responses
- server-side secret handling
- security response headers

The current in-memory rate limiter is a basic beta safeguard.

It should not be considered a distributed production-grade rate-limiting system.

---

## Validation

Production build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Production dependency audit:

```bash
npm audit --omit=dev
```

---

## Limitations

Cerynq Beta does not provide a complete smart-contract security audit.

The current model evaluates a defined set of privileged-control signals.

It may not identify:

- unsupported naming conventions
- hidden runtime behavior
- custom administrative architectures
- every proxy architecture
- every role-based access mechanism
- every upgrade mechanism
- every malicious behavior
- every unsafe contract design
- every economic or governance risk

Model coverage refers only to checks implemented in the current Cerynq risk model.

It does not represent complete contract coverage.

Results should always be interpreted together with:

- evidence provenance
- evidence confidence
- model coverage
- assessment status
- known limitations

Cerynq results are informational and do not constitute financial, investment, legal, or complete security-audit advice.

---

## Status

**Public beta preparation**

Current focus:

- Arc Mainnet
- Contract intelligence
- Explainable findings
- Evidence provenance
- Proxy-aware analysis
- Risk Model v0.1

Future platform direction includes:

- Bytecode Signal Intelligence
- broader contract intelligence
- wallet intelligence
- entity intelligence
- risk-flow monitoring
- institutional risk intelligence

Cerynq is being developed iteratively, with the current beta serving as the first intelligence layer of a broader onchain risk platform.
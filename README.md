# Cerynq

**Explainable onchain risk intelligence for Arc.**

Cerynq is an onchain risk intelligence platform being built on Arc.

The current beta begins with smart-contract intelligence: identifying supported privileged-control signals, resolving supported proxy implementations, evaluating evidence provenance, and explaining the evidence and limitations behind each finding.

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
- onchain bytecode detection
- canonical EIP-1167 minimal-proxy resolution from runtime bytecode
- Blockscout metadata and ABI intelligence
- Sourcify ABI fallback
- implementation-aware ABI analysis
- ABI provenance tracking
- verification-quality tracking
- explainable privileged-control findings
- explicit `Unknown` states when evidence is insufficient
- Risk Model v0.1
- evidence confidence
- model coverage
- conservative treatment of incomplete or limited evidence
- operational-state reporting for provider and RPC degradation

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
- Blockscout contract ABI
- Blockscout implementation ABI
- Sourcify contract ABI
- Sourcify implementation ABI

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
- bytecode-database verification signals reported by Blockscout

A limited-provenance ABI can still support a positive interface signal.

However, absence of a supported method from limited evidence is not treated as proof that the capability does not exist.

---

## Evidence Resolution and Fallback

Cerynq does not rely on a single metadata provider.

The current evidence-resolution path is:

```text
Arc Mainnet RPC
      |
      |-- runtime bytecode
      |      |
      |      `-- canonical EIP-1167 resolution when applicable
      |
      v
Blockscout
      |
      |-- usable ABI evidence -> use Blockscout evidence
      |
      `-- unavailable / not found / unusable ABI
                    |
                    v
                 Sourcify
                    |
                    `-- use fallback ABI evidence when available
```

Blockscout is the primary metadata and ABI provider.

Sourcify is used as a fallback when Blockscout is unavailable, does not return a usable result, or does not provide usable ABI evidence for the analyzed contract or resolved implementation.

Provider failures are kept distinct from evidence absence. A provider outage does not become a `not_detected` risk result.

---

## Operational States

A successful or attempted scan can expose one of four operational states.

### Normal

Primary evidence resolution is functioning normally.

Typical case:

- Arc Mainnet RPC is available
- Blockscout is available
- Blockscout provides the ABI evidence used by the scan

### Degraded

The primary evidence source is unavailable or insufficient, but fallback evidence allows the scan to continue.

Typical case:

- Arc Mainnet RPC is available
- Blockscout fails or does not provide usable ABI evidence
- Sourcify provides usable fallback ABI evidence

### Limited

Arc Mainnet remains reachable, but external ABI evidence is unavailable or insufficient.

In this state:

- direct onchain observations can still be used where supported
- ABI-dependent checks can remain `Unknown`
- infrastructure failure is not interpreted as absence of a capability

### Unavailable

Arc Mainnet RPC cannot be queried reliably enough to complete the scan.

Cerynq does not fabricate a partial result in this state.

---

## Assessment Semantics

A Cerynq risk assessment can produce one of three assessment states.

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

Operational state and assessment state describe different things:

- **operational state** describes whether the data path is healthy, degraded, limited, or unavailable
- **assessment state** describes how completely the current risk model could classify its checks

---

## Proxy Analysis

Cerynq currently performs independent onchain resolution for **canonical EIP-1167 minimal proxies**.

When runtime bytecode matches the canonical 45-byte EIP-1167 pattern, Cerynq extracts the implementation address directly from bytecode and can evaluate implementation-level ABI evidence when available.

Blockscout proxy metadata can still contribute provider metadata, but independently resolved onchain EIP-1167 evidence takes precedence for implementation identity.

For multi-implementation architectures, Cerynq currently avoids collapsing multiple reported implementations into a single ABI.

The current beta does **not** claim general support for:

- EIP-1967 proxy resolution
- Diamond / EIP-2535 proxy resolution
- arbitrary custom proxy architectures

When the evidence cannot justify a complete conclusion, Cerynq prefers unresolved findings over false certainty.

---

## Resilience and Provider Protection

The current beta includes several safeguards intended to reduce avoidable provider load and preserve scan behavior during partial outages.

### Short-lived provider cache

Successful Blockscout and Sourcify metadata results are cached in memory for a short TTL.

Current configuration:

```text
TTL: 60 seconds
Maximum entries: 200 per provider cache
```

### In-flight deduplication

Concurrent scans for the same address share the same in-progress provider request instead of issuing duplicate external requests.

### Blockscout request pacing

The Blockscout Free tier currently enforces a request-rate limit.

Cerynq spaces Blockscout request starts by 250 ms, limiting a single running process to at most approximately 4 Blockscout requests per second.

This intentionally leaves a small margin below the provider limit.

### Important deployment boundary

The cache, in-flight deduplication, route rate limiter, and Blockscout pacing are in-memory safeguards.

They are useful for the beta but are **not distributed, cross-instance production rate limiting**.

Production deployment should also use platform-level protection such as Vercel firewall / WAF / rate-limiting controls where appropriate.

---

## Architecture

The current codebase separates chain access, provider resolution, evidence modeling, detection, and risk evaluation.

```text
app/
  api/
    scan/
      route.ts
  page.tsx

lib/
  arc/
    cache.ts
    client.ts
    evidence.ts
    explorer.ts
    provider.ts
    proxy.ts
    resolver.ts
    sourcify.ts

  detectors/
    ownership.ts
    pause.ts
    blacklist.ts
    whitelist.ts
    privileged.ts

  risk/
    engine.ts
```

Key responsibilities:

- `client.ts` — Arc Mainnet RPC client
- `explorer.ts` — Blockscout adapter and provider request pacing
- `sourcify.ts` — Sourcify adapter
- `provider.ts` — provider error and operational-status modeling
- `proxy.ts` — canonical EIP-1167 runtime-bytecode resolution
- `resolver.ts` — provider selection, fallback, cache usage, and effective ABI evidence
- `evidence.ts` — provider-neutral evidence types and provenance labels
- `cache.ts` — short-lived async cache and in-flight deduplication
- `detectors/*` — privileged-control detectors
- `risk/engine.ts` — Risk Model v0.1 evaluation

This separation is intentional.

The current contract-analysis pipeline is designed to remain one intelligence domain within Cerynq rather than becoming the entire platform architecture.

---

## Platform Direction

Cerynq begins with contract intelligence, but the long-term platform is intended to support broader onchain risk intelligence.

Future areas of research and development include the following.

### Bytecode Signal Intelligence

Cerynq may analyze additional onchain bytecode signals when verified ABI evidence is unavailable or incomplete.

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

Cerynq should preserve this distinction if broader bytecode intelligence is introduced.

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
- Blockscout API
- Sourcify API

Arc Mainnet:

```text
Chain ID: 5042
Default RPC: https://rpc.mainnet.arc.io
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure the required secret.

```env
BLOCKSCOUT_API_KEY=

ARC_MAINNET_RPC_URL=https://rpc.mainnet.arc.io
BLOCKSCOUT_BASE_URL=https://api.blockscout.com/5042/api/v2
SOURCIFY_BASE_URL=https://sourcify.dev/server/v2
```

### `BLOCKSCOUT_API_KEY`

Required.

Used server-side for Blockscout metadata and ABI requests.

Never expose this value through a `NEXT_PUBLIC_*` variable.

### `ARC_MAINNET_RPC_URL`

Optional.

Defaults to the official public Arc Mainnet RPC.

### `BLOCKSCOUT_BASE_URL`

Optional.

Defaults to the Arc Mainnet Blockscout API base URL.

This is also useful for controlled provider-failure testing in local development.

### `SOURCIFY_BASE_URL`

Optional.

Defaults to the public Sourcify v2 API base URL.

This is also useful for controlled fallback and failure testing in local development.

Do not commit `.env.local` or production credentials.

---

## Local Development

Install dependencies:

```bash
npm install
```

Create the local environment file:

```text
.env.local
```

At minimum:

```env
BLOCKSCOUT_API_KEY=your_blockscout_api_key
```

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

A successful scan can return:

- Arc network metadata
- contract / EOA classification
- operational status
- provider operational states
- proxy and implementation intelligence
- effective ABI provider and source
- ABI evidence quality
- detector findings
- current risk-model assessment

The current beta performs read-only analysis.

Cerynq does not execute onchain transactions through the scan endpoint.

If Arc Mainnet RPC is unavailable, the endpoint can return HTTP `503` with:

```json
{
  "ok": false,
  "network": "Arc Mainnet",
  "chainId": 5042,
  "address": "0x...",
  "operationalStatus": "unavailable",
  "error": "Arc Mainnet is temporarily unavailable. Cerynq could not complete this scan."
}
```

---

## Security Boundaries

The current beta performs read-only analysis against public blockchain and verification-provider data.

Current safeguards include:

- strict request validation
- JSON content-type enforcement
- request-body size limits
- basic per-process request rate limiting
- Blockscout request pacing
- short-lived provider caching
- in-flight request deduplication
- typed provider failure handling
- generic client-facing error responses
- server-side secret handling
- explicit operational-state reporting

The current in-memory safeguards should not be considered distributed production-grade traffic control.

Deployment-level protection remains part of the production launch configuration.

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

Whitespace validation:

```bash
git diff --check
```

Production dependency audit:

```bash
npm audit --omit=dev
```

Before release, Cerynq should also be smoke-tested across:

- normal provider operation
- Blockscout failure with Sourcify fallback
- both ABI providers unavailable
- Arc Mainnet RPC unavailable
- repeated same-address scans
- concurrent same-address scans
- multiple contract types and evidence-quality cases

---

## Limitations

Cerynq Beta does not provide a complete smart-contract security audit.

The current model evaluates a defined set of privileged-control signals.

It may not identify:

- unsupported naming conventions
- hidden runtime behavior
- custom administrative architectures
- proxy architectures outside the currently supported scope
- every role-based access mechanism
- every upgrade mechanism
- every malicious behavior
- every unsafe contract design
- every economic or governance risk

Canonical EIP-1167 minimal-proxy resolution is currently supported.

General EIP-1967, Diamond / EIP-2535, and arbitrary custom proxy resolution are not currently claimed.

Model coverage refers only to checks implemented in the current Cerynq risk model.

It does not represent complete contract coverage.

Results should always be interpreted together with:

- evidence provenance
- evidence confidence
- model coverage
- assessment status
- operational status
- known limitations

Cerynq results are informational and do not constitute financial, investment, legal, or complete security-audit advice.

---

## Status

**Public beta preparation**

Current focus:

- Arc Mainnet
- contract intelligence
- explainable findings
- evidence provenance
- resilient provider resolution
- canonical EIP-1167 proxy resolution
- Risk Model v0.1
- beta deployment and validation

Future platform direction includes:

- Bytecode Signal Intelligence
- broader contract intelligence
- wallet intelligence
- entity intelligence
- risk-flow monitoring
- institutional risk intelligence

Cerynq is being developed iteratively, with the current beta serving as the first intelligence layer of a broader onchain risk platform.

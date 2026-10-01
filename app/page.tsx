"use client";

import { FormEvent, useState } from "react";

type ScanResult = {
  ok: boolean;
  network?: string;
  chainId?: number;
  address?: string;
  isContract?: boolean;
  contractType?: "contract" | "eoa";
  bytecodeDetected?: boolean;
  bytecodeSize?: number;
  explorer?: {
    available: boolean;
    isVerified: boolean | null;
    contractName: string | null;
    proxyType: string | null;
    implementationAddress: string | null;
  };
  error?: string;
};

export default function Home() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: address.trim(),
        }),
      });

      const data: ScanResult = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to analyze address.");
        return;
      }

      setResult(data);
    } catch {
      setError("Unable to connect to the Cerynq scan service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
          Cerynq
        </p>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Explainable on-chain risk intelligence.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Analyze smart contracts on Arc and understand the risk signals,
          privileged controls, and evidence behind every result.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Enter Arc contract address"
            className="h-12 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-lg bg-white px-6 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error && (
          <div className="mt-6 w-full max-w-2xl rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-left text-sm text-red-300">
            {error}
          </div>
        )}

        {result?.ok && (
          <div className="mt-8 w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-left">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Contract Identity
                </p>

                <h2 className="mt-2 text-xl font-medium">
                  {result.isContract
                    ? "Smart Contract"
                    : "Externally Owned Account"}
                </h2>
              </div>

              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                {result.network}
              </span>
            </div>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500">Address</dt>
                <dd className="mt-1 break-all font-mono text-zinc-200">
                  {result.address}
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-zinc-500">Chain ID</dt>
                  <dd className="mt-1 text-zinc-200">{result.chainId}</dd>
                </div>

                <div>
                  <dt className="text-zinc-500">Type</dt>
                  <dd className="mt-1 capitalize text-zinc-200">
                    {result.contractType}
                  </dd>
                </div>

                <div>
                  <dt className="text-zinc-500">Bytecode</dt>
                  <dd className="mt-1 text-zinc-200">
                    {result.bytecodeDetected ? "Detected" : "Not detected"}
                  </dd>
                </div>

                <div>
                  <dt className="text-zinc-500">Bytecode size</dt>
                  <dd className="mt-1 text-zinc-200">
                    {result.bytecodeSize ?? 0} bytes
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 border-t border-zinc-800 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Explorer Intelligence
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-zinc-500">Verified</p>
                  <p className="mt-1 text-zinc-200">
                    {result.explorer?.isVerified === true
                      ? "Yes"
                      : result.explorer?.isVerified === false
                        ? "No"
                        : "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Contract name</p>
                  <p className="mt-1 text-zinc-200">
                    {result.explorer?.contractName ?? "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Proxy</p>
                  <p className="mt-1 text-zinc-200">
                    {result.explorer?.proxyType ?? "Not detected"}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Implementation</p>
                  <p className="mt-1 break-all font-mono text-zinc-200">
                    {result.explorer?.implementationAddress ?? "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-zinc-600">
          Arc Mainnet · Risk Model v0.1
        </p>
      </div>
    </main>
  );
}
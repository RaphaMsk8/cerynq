
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import "./cerynq-visual.css";
import "./cerynq-atmosphere.css";
import "./cerynq-brand.css";

type IconName =
  | "home"
  | "scan"
  | "pulse"
  | "nodes"
  | "building"
  | "book"
  | "globe"
  | "external"
  | "arrow"
  | "x";

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9M9 21v-8h6v8" />
      </>
    ),
    scan: (
      <>
        <circle cx="10.8" cy="10.8" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    pulse: (
      <path d="M2 12h5l3-7 4 14 3-7h5" />
    ),
    nodes: (
      <>
        <circle cx="12" cy="4" r="2" />
        <circle cx="4" cy="20" r="2" />
        <circle cx="20" cy="20" r="2" />
        <path d="m11 6-6 12m8-12 6 12M6 20h12" />
      </>
    ),
    building: (
      <path d="m3 10 9-6 9 6M5 10h14M6 20V10m4 10V10m4 10V10M3 21h18" />
    ),
    book: (
      <path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v15" />
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M19 14v5H5V5h5" />
      </>
    ),
    arrow: (
      <path d="M4 12h16m-7-7 7 7-7 7" />
    ),
    x: (
      <path
        d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.58-6.633 7.58H.48l8.596-9.835L0 1.153h7.594l5.24 6.932 6.067-6.932ZM17.61 20.647h2.04L6.47 3.238H4.28L17.61 20.647Z"
        fill="currentColor"
        stroke="none"
      />
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="cq-brand-hd"
      aria-label="Cerynq — Home"
    >
      <span className="cq-brand-hd-shield">
        <Image
          src="/cerynq-shield-hd.webp"
          alt=""
          width={640}
          height={730}
          priority
          unoptimized
          draggable={false}
        />
      </span>

      <span className="cq-brand-hd-wordmark">
        <Image
          src="/cerynq-wordmark-hd.webp"
          alt=""
          width={1200}
          height={296}
          priority
          unoptimized
          draggable={false}
        />
      </span>
    </Link>
  );
}

function MenuLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`cq-menu-link${active ? " cq-active" : ""}`}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  );
}

function SoonItem({
  icon,
  label,
}: {
  icon: IconName;
  label: string;
}) {
  return (
    <div
      className="cq-menu-link cq-disabled"
      aria-disabled="true"
      title={`${label} — Soon`}
    >
      <Icon name={icon} />
      <span>{label}</span>
      <span className="cq-soon">Soon</span>
    </div>
  );
}

export function CerynqSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="cq-sidebar"
      aria-label="Cerynq workspace"
    >
      <Brand />

      <p className="cq-menu-heading">
        Workspace
      </p>

      <nav
        aria-label="Workspace navigation"
        className="cq-menu-group"
      >
        <MenuLink
          href="/"
          icon="home"
          label="Home"
          active={pathname === "/"}
        />

        <MenuLink
          href="/scan"
          icon="scan"
          label="Scan"
          active={pathname === "/scan"}
        />

        <SoonItem
          icon="pulse"
          label="Monitor"
        />

        <SoonItem
          icon="nodes"
          label="Investigations"
        />

        <SoonItem
          icon="building"
          label="Institutional"
        />
      </nav>

      <div className="cq-menu-divider" />

      <nav
        aria-label="Resources and ecosystem"
        className="cq-menu-group"
      >
        <MenuLink
          href="/resources"
          icon="book"
          label="Resources"
          active={pathname === "/resources"}
        />

        <a
          href="https://explorer.arc.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="cq-menu-link"
          aria-label="Arc Mainnet Explorer — opens in a new tab"
        >
          <Icon name="globe" />
          <span>Arc Mainnet</span>
          <Icon name="external" size={14} />
        </a>
      </nav>

      <div className="cq-sidebar-bottom">
        <a
          href="https://x.com/Cerynq"
          target="_blank"
          rel="noopener noreferrer"
          className="cq-social-card"
          aria-label="Follow Cerynq on X"
        >
          <div className="cq-social-art">
            <Icon name="x" size={31} />
          </div>

          <div className="cq-social-label">
            <strong>Follow Cerynq</strong>
            <Icon name="arrow" size={15} />
          </div>

          <p>
            Updates and ecosystem insights.
          </p>
        </a>

        <div className="cq-discord">
          <Icon name="nodes" size={15} />
          <span>Discord</span>
          <span className="cq-soon">Soon</span>
        </div>
      </div>
    </aside>
  );
}

export function CerynqMobileHeader() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/scan", label: "Scan" },
    { href: "/resources", label: "Resources" },
  ];

  return (
    <header className="cq-mobile-header">
      <Brand />

      <nav
        aria-label="Mobile navigation"
        className="cq-mobile-navigation"
      >
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              pathname === item.href
                ? "page"
                : undefined
            }
            className={
              pathname === item.href
                ? "cq-active"
                : ""
            }
          >
            {item.label}
          </Link>
        ))}

        <span
          className="cq-mobile-disabled"
          aria-disabled="true"
        >
          Institutional · Soon
        </span>
      </nav>
    </header>
  );
}

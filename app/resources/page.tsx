
import type { Metadata } from "next";
import { CerynqResources } from "../../components/CerynqResources";

export const metadata: Metadata = {
  title: "Resources | Cerynq",
  description:
    "Understand Cerynq's onchain risk signals, evidence sources, and limitations on Arc Mainnet.",
};

export default function ResourcesPage() {
  return <CerynqResources />;
}

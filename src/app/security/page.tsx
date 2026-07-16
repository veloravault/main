import type { Metadata } from "next";
import rootStyles from "../dreelio/dreelio.module.css";
import { Footer } from "@/components/dreelio/Footer";
import { Nav } from "@/components/dreelio/Nav";
import { SecurityPageContent } from "@/components/dreelio/SecurityPageContent";

export const metadata: Metadata = {
  title: "How security works — Velora Vault",
  description:
    "The encryption model, access controls, recovery limits, and threat boundaries behind Velora Vault.",
};

export default function SecurityPage() {
  return (
    <div className={rootStyles.root}>
      <Nav />
      <SecurityPageContent />
      <Footer />
    </div>
  );
}

import type { ReactNode } from "react";
import rootStyles from "@/app/velora/velora.module.css";
import { getInitialSignedIn } from "@/lib/server/auth";
import { Footer } from "./Footer";
import { Nav } from "./Nav";
import { SmoothAnchorScroll } from "./SmoothAnchorScroll";

type PublicPageShellProps = {
  children: ReactNode;
};

export async function PublicPageShell({ children }: PublicPageShellProps) {
  const initialSignedIn = await getInitialSignedIn();

  return (
    <div className={rootStyles.root}>
      <SmoothAnchorScroll />
      <Nav initialSignedIn={initialSignedIn} />
      {children}
      <Footer />
    </div>
  );
}

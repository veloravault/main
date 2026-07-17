import type { ReactNode } from "react";
import rootStyles from "@/app/dreelio/dreelio.module.css";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

type PublicPageShellProps = {
  children: ReactNode;
};

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className={rootStyles.root}>
      <Nav />
      {children}
      <Footer />
    </div>
  );
}

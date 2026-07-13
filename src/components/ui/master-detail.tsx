import * as React from "react";
import { cn } from "@/lib/utils";

export function MasterDetail(props: {
  list: React.ReactNode;
  detail: React.ReactNode;
  hasSelection: boolean;
  emptyDetail: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("vault-master-detail", props.className)}>
      <div className="vault-master-list">{props.list}</div>
      <aside className="vault-master-pane" aria-live="polite">
        {props.hasSelection ? props.detail : props.emptyDetail}
      </aside>
    </div>
  );
}

"use client";

import styles from "@/app/admin/admin.module.css";

export function AdminSkeleton() {
  return (
    <div className={styles.skeleton} aria-label="Loading members" role="status">
      {[0, 1, 2, 3].map((item) => (
        <div className={styles.rowSkeleton} key={item}>
          <span className={styles.skeletonAvatar} />
          <span className={styles.skeletonCopy}><i /><i /></span>
          <span className={styles.skeletonAction} />
        </div>
      ))}
      {[0, 1].map((item) => <div className={styles.cardSkeleton} key={`card-${item}`} />)}
      <span className="sr-only">Loading</span>
    </div>
  );
}

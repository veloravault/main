import Image from "next/image";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./FeatureSplit.module.css";
import { PILL_ICONS } from "./icons";

type Props = {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  pills: readonly string[];
  image: { src: string; alt: string; width: number; height: number };
  reverse?: boolean;
};

export function FeatureSplit({ id, eyebrow, title, body, pills, image, reverse }: Props) {
  const media = (
    <div className={styles.frame}>
      <div className={styles.card}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 900px) 100vw, 520px"
          className={styles.img}
        />
      </div>
    </div>
  );

  const copy = (
    <div className={styles.copy}>
      <p className={shared.eyebrow}>{eyebrow}</p>
      <h2 className={`${shared.h2} ${styles.title}`}>{title}</h2>
      <p className={`${shared.lead} ${styles.body}`}>{body}</p>
      <a href="#pricing" className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}>
        Try Velora Vault free
      </a>
      <div className={styles.pills}>
        {pills.map((label) => {
          const Icon = PILL_ICONS[label as keyof typeof PILL_ICONS];
          return (
            <span key={label} className={shared.featurePill}>
              {Icon ? <Icon /> : null}
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <section id={id} className={`${shared.section} ${styles.section}`}>
      <div className={`${shared.container} ${styles.grid}`} data-reverse={reverse}>
        {reverse ? (
          <>
            {copy}
            {media}
          </>
        ) : (
          <>
            {media}
            {copy}
          </>
        )}
      </div>
    </section>
  );
}

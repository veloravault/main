"use client";

import { useState } from "react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Pricing.module.css";
import { PLANS } from "./data";
import { IconCheck } from "./icons";

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <div className={shared.sectionHead}>
          <p className={shared.eyebrow}>Access</p>
          <h2 className={shared.h2}>
            Free for everyone,
            <br />
            always
          </h2>
        </div>

        <div className={styles.grid}>
          {PLANS.map((plan) => {
            const price =
              plan.highlight && !annual ? plan.price : plan.highlight ? plan.priceAnnual : plan.price;
            return (
              <article
                key={plan.name}
                className={styles.card}
                data-highlight={plan.highlight}
              >
                {plan.highlight && (
                  <div className={styles.toggle} role="tablist" aria-label="Vault type">
                    <button
                      role="tab"
                      aria-selected={annual}
                      data-active={annual}
                      onClick={() => setAnnual(true)}
                    >
                      Personal
                    </button>
                    <button
                      role="tab"
                      aria-selected={!annual}
                      data-active={!annual}
                      onClick={() => setAnnual(false)}
                    >
                      Family
                    </button>
                  </div>
                )}

                <div className={styles.head}>
                  <span className={styles.planName}>{plan.name}</span>
                  {plan.highlight && <span className={styles.save}>Recommended</span>}
                </div>
                <h3 className={styles.price}>{price}</h3>
                <p className={styles.blurb}>{plan.blurb}</p>

                <ul className={styles.features}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <IconCheck className={styles.check} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.cta === "Contact us" ? "#contact" : "/request-access"}
                  className={`${shared.btn} ${plan.highlight ? shared.btnDark : shared.btnGhost} ${styles.cardCta}`}
                >
                  {plan.cta}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

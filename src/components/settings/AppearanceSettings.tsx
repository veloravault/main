"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

type ThemeChoice = "system" | "light" | "dark";
const choices: Array<{ id: ThemeChoice; label: string; description: string; icon: typeof SunIcon }> = [
  { id: "system", label: "System", description: "Follow this device", icon: LaptopIcon },
  { id: "light", label: "Light", description: "Bright grouped surfaces", icon: SunIcon },
  { id: "dark", label: "Dark", description: "Layered charcoal materials", icon: MoonIcon },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const selected = mounted && choices.some((choice) => choice.id === theme) ? theme as ThemeChoice : "system";

  return (
    <section className="settings-detail-section" aria-labelledby="settings-appearance-title">
      <header><p className="type-group-label">Appearance</p><h2 id="settings-appearance-title">Choose an appearance</h2><p>Use the system preference or keep a consistent theme on this device.</p></header>
      <div className="settings-theme-segment" role="radiogroup" aria-label="Appearance">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const active = selected === choice.id;
          return <button key={choice.id} type="button" role="radio" aria-checked={active} className={`system-interactive ${active ? "is-active" : ""}`} onClick={() => setTheme(choice.id)}><Icon aria-hidden="true" /><span>{choice.label}</span>{active && <CheckIcon className="settings-theme-check" aria-hidden="true" />}</button>;
        })}
      </div>
      <div className="settings-appearance-preview" aria-label="Appearance preview">
        <div className="settings-preview-sidebar"><i /><i /><i /></div>
        <div className="settings-preview-content"><span /><strong /><p /><div><i /><i /></div></div>
      </div>
      <div className="settings-group settings-theme-mobile">
        {choices.map((choice) => {
          const Icon = choice.icon;
          const active = selected === choice.id;
          return <button key={choice.id} type="button" className="settings-choice-row system-interactive" onClick={() => setTheme(choice.id)} aria-pressed={active}><span className="settings-row-icon"><Icon aria-hidden="true" /></span><span><strong>{choice.label}</strong><small>{choice.description}</small></span>{active && <CheckIcon className="settings-choice-check" aria-hidden="true" />}</button>;
        })}
      </div>
    </section>
  );
}

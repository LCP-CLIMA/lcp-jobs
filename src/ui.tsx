import type { ReactNode } from "react";
import { lek, signedLek, signedPercent, toneOf } from "./lib/format";
import type { Tone } from "./lib/types";

export function Money({ value, large = false }: { value: number; large?: boolean }) {
  const signed = signedLek(value);
  return <span className={`money ${signed.tone}${large ? " lg" : ""}`}>{signed.text}</span>;
}

export function CostAmount({ value }: { value: number }) {
  return <b className="money neg">{lek(value)}</b>;
}

export function IncomeAmount({ value }: { value: number }) {
  const tone = value > 0 ? "pos" : value < 0 ? "neg" : "zero";
  return <b className={`money ${tone}`}>{lek(value)}</b>;
}

export function Percent({ value }: { value: number }) {
  const signed = signedPercent(value);
  return <span className={`money ${signed.tone}`}>{signed.text}</span>;
}

export function ProfitHero({ net, detail }: { net: number; detail?: ReactNode }) {
  const tone: Tone = toneOf(net);
  const word = tone === "pos" ? "PROFIT (fitim)" : tone === "neg" ? "LOSS (humbje)" : "EVEN (baraz)";
  return (
    <div className={`hero ${tone}`}>
      <div className="kicker">{word}</div>
      <Money value={net} large />
      {detail ? <div className="hero-detail">{detail}</div> : null}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" className={`toggle${checked ? " on" : ""}`} aria-pressed={checked} onClick={() => onChange(!checked)}>
      <span className="knob" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function Section({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {caption ? <p className="caption">{caption}</p> : null}
      {children}
    </section>
  );
}

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="scrim" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

import { useId } from "react";
import { Link } from "react-router-dom";

export const cx = (...a) => a.filter(Boolean).join(" ");

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  outline: "border border-stone-300 bg-white text-ink hover:bg-brand-50",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
const btn = (variant = "primary", extra) =>
  cx("inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 ring-brand-200 disabled:opacity-60", VARIANTS[variant], extra);

export const Button = ({ variant, className, ...p }) => <button className={btn(variant, className)} {...p} />;
export const LinkButton = ({ to, variant, className, children }) => <Link to={to} className={btn(variant, className)}>{children}</Link>;

export const Card = ({ className, ...p }) => <div className={cx("rounded-2xl border border-stone-200 bg-white p-5", className)} {...p} />;

export function Field({ label, error, as: Tag = "input", className, ...p }) {
  const id = useId();
  return (
    <div className="mt-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <Tag id={id} aria-invalid={!!error} className={cx("w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 ring-brand-200", error ? "border-red-600" : "border-stone-300", className)} {...p} />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const TONES = { info: "bg-brand-50 text-brand-700", warn: "bg-amber-50 text-amber-900", error: "bg-red-50 text-red-800", ok: "bg-green-50 text-green-800" };
export const Alert = ({ tone = "info", className, children }) => (
  <div role={tone === "error" ? "alert" : undefined} className={cx("rounded-xl px-4 py-3 text-sm font-medium", TONES[tone], className)}>{children}</div>
);

export const Badge = ({ children }) => <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{children}</span>;
export const Spinner = () => <p className="py-8 text-center text-sm text-stone-500">Loading…</p>;

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mt-5 flex gap-2" role="tablist">
      {tabs.map(([k, text]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={cx("rounded-full border px-4 py-1.5 text-sm font-medium", value === k ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white hover:bg-brand-50")}>{text}</button>
      ))}
    </div>
  );
}

import type { ReactNode } from 'react';
export const money = (value: number | null, currency = 'USD') =>
  value === null
    ? 'Not available'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
export const number = (value: number | null) =>
  value === null
    ? 'Not available'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
export function Card({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <article className={`stat ${accent ? 'accent' : ''}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function Panel({
  title,
  children,
  sub,
}: {
  title: string;
  children: ReactNode;
  sub?: string;
}) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {sub && <p className="muted">{sub}</p>}
      {children}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

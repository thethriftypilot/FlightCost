import type { Aircraft, Entity, RecordValue, Recurring, Snapshot } from './domain/models';
import type { ReportKind } from './domain/reporting';
export interface Api {
  snapshot(): Promise<Snapshot>;
  setup(aircraft: Aircraft, plans: Recurring[]): Promise<string>;
  save(entity: Entity, value: RecordValue): Promise<string>;
  remove(entity: Entity, id: string): Promise<boolean>;
  setting(key: string, value: string): Promise<void>;
  backup(): Promise<string | null>;
  restore(): Promise<boolean>;
  exportData(): Promise<string | null>;
  exportCsv(id: string): Promise<string | null>;
  importCsv(id: string): Promise<number>;
  receipt(id: string): Promise<boolean>;
  saveReceipt(id: string): Promise<boolean>;
  report(
    id: string,
    from: string,
    to: string,
    format: 'pdf' | 'print',
    kind?: ReportKind,
  ): Promise<string | null>;
  reportCsv(id: string, from: string, to: string, kind: ReportKind): Promise<string | null>;
  tripReport(id: string, format: 'pdf' | 'print'): Promise<string | null>;
  demo(): Promise<string>;
  external(url: string): Promise<void>;
}
declare global {
  interface Window {
    flightcost: Api;
  }
}
export const api = window.flightcost;

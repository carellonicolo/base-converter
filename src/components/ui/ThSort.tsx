import { useI18n } from '../../i18n';
import type { SortDir } from '../../lib/sort';

interface Props {
  label: string;
  /** Il verso, se la tabella è ordinata per questa colonna; `null` altrimenti. */
  dir: SortDir | null;
  onSort: () => void;
}

/** Intestazione di colonna cliccabile: ordina la tabella per quella colonna. */
export function ThSort({ label, dir, onSort }: Props) {
  const { t } = useI18n();
  const active = dir !== null;
  return (
    <th aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={`th-sort${active ? ' active' : ''}`} onClick={onSort} title={t('admin.sortBy', { col: label.toLowerCase() })}>
        {label}
        <span className="th-sort-arrow" aria-hidden>
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

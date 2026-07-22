import { useI18n } from '../../i18n';

/** Interruttore lingua IT / EN, coerente col look della carello-shell. */
export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="segmented" role="group" aria-label="Lingua / Language">
      <button className={lang === 'it' ? 'active' : ''} onClick={() => setLang('it')} type="button" aria-pressed={lang === 'it'}>
        IT
      </button>
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} type="button" aria-pressed={lang === 'en'}>
        EN
      </button>
    </div>
  );
}

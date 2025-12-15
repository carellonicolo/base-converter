import { useState, useEffect } from 'react';
import { ArrowRight, Copy, Check, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCopyToClipboard from '../hooks/useCopyToClipboard';
import { isValidForBase } from '../utils/validation';
import InfoBox from './ui/InfoBox';

interface ConversionResult {
  base: number;
  label: string;
  value: string;
  prefix?: string;
}

function BaseConverter() {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [inputBase, setInputBase] = useState(10);
  const [customBase, setCustomBase] = useState('');
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [error, setError] = useState('');
  const [copyStatus, copy] = useCopyToClipboard();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    copy(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setInputValue(value);
    setError(''); // Clear error when typing
  };

  const commonBases = [
    { base: 2, label: t('base.bases.binary'), prefix: '0b' },
    { base: 8, label: t('base.bases.octal'), prefix: '0o' },
    { base: 10, label: t('base.bases.decimal'), prefix: '' },
    { base: 16, label: t('base.bases.hex'), prefix: '0x' },
  ];

  useEffect(() => {
    if (!inputValue.trim()) {
      setResults([]);
      setError('');
      return;
    }

    try {
      // Remove common prefixes and detect base
      let cleanValue = inputValue.trim();
      let detectedBase = inputBase;

      if (cleanValue.startsWith('0x') || cleanValue.startsWith('0X')) {
        cleanValue = cleanValue.substring(2);
        detectedBase = 16;
      } else if (cleanValue.startsWith('0b') || cleanValue.startsWith('0B')) {
        cleanValue = cleanValue.substring(2);
        detectedBase = 2;
      } else if (cleanValue.startsWith('0o') || cleanValue.startsWith('0O')) {
        cleanValue = cleanValue.substring(2);
        detectedBase = 8;
      }

      // Validate for the detected base
      if (!isValidForBase(cleanValue, detectedBase)) {
        const maxChar = detectedBase > 10
          ? (detectedBase - 1).toString(36).toUpperCase()
          : (detectedBase - 1);
        setError(`${t('base.errorInvalid')} (${detectedBase}). Use: 0-${maxChar}`);
        setResults([]);
        return;
      }

      const decimalValue = parseInt(cleanValue, detectedBase);

      if (isNaN(decimalValue) || !isFinite(decimalValue)) {
        setError(t('base.errorInvalid'));
        setResults([]);
        return;
      }

      setError('');
      const conversions: ConversionResult[] = commonBases.map(({ base, label, prefix }) => ({
        base,
        label,
        value: decimalValue.toString(base).toUpperCase(),
        prefix,
      }));

      if (customBase && parseInt(customBase) >= 2 && parseInt(customBase) <= 36) {
        const base = parseInt(customBase);
        if (!commonBases.some(b => b.base === base)) {
          conversions.push({
            base,
            label: `Base ${base}`,
            value: decimalValue.toString(base).toUpperCase(),
            prefix: '',
          });
        }
      }

      setResults(conversions);
    } catch (err) {
      setError(t('base.errorInvalid'));
      setResults([]);
    }
  }, [inputValue, inputBase, customBase, t]);

  return (
    <div className="space-y-8">
      {/* Educational Info Box */}
      <InfoBox
        title={t('base.title')}
        description={t('base.description')}
        icon={<Calculator className="w-5 h-5" />}
        useCases={t('base.useCases', { returnObjects: true }) as string[]}
        examples={[
          { label: '42 (dec)', value: '101010 (bin) = 2A (hex)' },
          { label: '255 (dec)', value: '11111111 (bin) = FF (hex)' }
        ]}
        realWorldUse={t('common.realWorldUse')}
        type="educational"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {t('base.valueLabel')}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="123, 0xFF, 1010..."
            className="liquid-input w-full text-white placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {t('base.baseLabel')}
          </label>
          <select
            value={inputBase}
            onChange={(e) => setInputBase(parseInt(e.target.value))}
            className="liquid-input w-full text-white appearance-none cursor-pointer"
          >
            {commonBases.map((b) => (
              <option key={b.base} value={b.base}>{b.label}</option>
            ))}
            <option value={32}>Base 32</option>
            <option value={36}>Base 36</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
          {t('base.customBaseLabel')}
        </label>
        <input
          type="number"
          min="2"
          max="36"
          value={customBase}
          onChange={(e) => setCustomBase(e.target.value)}
          placeholder="7, 12, 24..."
          className="liquid-input w-full text-white placeholder-slate-400"
        />
      </div>

      {error && (
        <div className="glass-morphism border-red-400/30 rounded-2xl p-4 bg-red-500/10">
          <p className="text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-40"></div>
              <ArrowRight className="w-6 h-6 text-liquid-300 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">{t('base.results')}</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {results.map((result, index) => (
              <div
                key={index}
                className="glass-card specular-highlight p-6 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{result.label}</h4>
                  <button
                    onClick={() => handleCopy(result.prefix + result.value, index)}
                    className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                    title="Copia"
                  >
                    {copiedIndex === index && copyStatus === 'copied' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  {result.prefix && (
                    <span className="text-slate-400 text-sm font-mono">{result.prefix}</span>
                  )}
                  <p className="text-3xl font-bold text-white font-mono break-all">
                    {result.value}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-3 font-medium">Base {result.base}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!inputValue && (
        <div className="text-center py-16">
          <div className="glass-morphism rounded-2xl p-8 inline-block">
            <p className="text-slate-300 text-lg font-light">{t('base.title')}: Inserisci un numero</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BaseConverter;

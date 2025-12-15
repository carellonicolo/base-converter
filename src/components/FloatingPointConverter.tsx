import { useState, useEffect } from 'react';
import { Info, Copy, Check, Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InfoBox from './ui/InfoBox';

function FloatingPointConverter() {
  const { t } = useTranslation();
  const [decimalInput, setDecimalInput] = useState('');
  const [binaryInput, setBinaryInput] = useState('');
  const [fixedPointBits, setFixedPointBits] = useState(8);
  const [floatFormat, setFloatFormat] = useState<'float32' | 'float64'>('float32');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [floatingPointResult, setFloatingPointResult] = useState<{
    sign: string;
    exponent: string;
    mantissa: string;
    binary: string;
    hex: string;
  } | null>(null);

  const [fixedPointResult, setFixedPointResult] = useState<{
    binary: string;
    hex: string;
    decimal: string;
  } | null>(null);

  useEffect(() => {
    if (!decimalInput.trim()) {
      setFloatingPointResult(null);
      setFixedPointResult(null);
      return;
    }

    const value = parseFloat(decimalInput);
    if (isNaN(value)) {
      setFloatingPointResult(null);
      setFixedPointResult(null);
      return;
    }

    const floatResult = convertToFloatingPoint(value, floatFormat);
    setFloatingPointResult(floatResult);

    const fixedResult = convertToFixedPoint(value, fixedPointBits);
    setFixedPointResult(fixedResult);
  }, [decimalInput, floatFormat, fixedPointBits]);

  const convertToFloatingPoint = (
    value: number,
    format: 'float32' | 'float64'
  ): {
    sign: string;
    exponent: string;
    mantissa: string;
    binary: string;
    hex: string;
  } => {
    const buffer =
      format === 'float32' ? new ArrayBuffer(4) : new ArrayBuffer(8);
    const view = new DataView(buffer);

    if (format === 'float32') {
      view.setFloat32(0, value, false);
    } else {
      view.setFloat64(0, value, false);
    }

    let binary = '';
    const bytes = format === 'float32' ? 4 : 8;
    for (let i = 0; i < bytes; i++) {
      const byte = view.getUint8(i);
      binary += byte.toString(2).padStart(8, '0');
    }

    const sign = binary[0];
    const exponentBits = format === 'float32' ? 8 : 11;
    const mantissaBits = format === 'float32' ? 23 : 52;

    const exponent = binary.substring(1, 1 + exponentBits);
    const mantissa = binary.substring(1 + exponentBits, 1 + exponentBits + mantissaBits);

    let hex = '';
    for (let i = 0; i < bytes; i++) {
      hex += view.getUint8(i).toString(16).toUpperCase().padStart(2, '0');
    }

    return { sign, exponent, mantissa, binary, hex };
  };

  const convertToFixedPoint = (
    value: number,
    fractionalBits: number
  ): {
    binary: string;
    hex: string;
    decimal: string;
  } => {
    const scaleFactor = Math.pow(2, fractionalBits);
    const fixedValue = Math.round(value * scaleFactor);

    const binary = (fixedValue >>> 0).toString(2).padStart(32, '0');
    const hex = '0x' + (fixedValue >>> 0).toString(16).toUpperCase().padStart(8, '0');

    return {
      binary,
      hex,
      decimal: fixedValue.toString(),
    };
  };

  const binaryToDecimal = (binary: string, format: 'float32' | 'float64'): number => {
    const cleanBinary = binary.replace(/\s/g, '');
    const expectedLength = format === 'float32' ? 32 : 64;

    if (cleanBinary.length !== expectedLength) {
      return NaN;
    }

    const bytes = format === 'float32' ? 4 : 8;
    const buffer = new ArrayBuffer(bytes);
    const view = new DataView(buffer);

    for (let i = 0; i < bytes; i++) {
      const byte = cleanBinary.substring(i * 8, (i + 1) * 8);
      view.setUint8(i, parseInt(byte, 2));
    }

    return format === 'float32' ? view.getFloat32(0, false) : view.getFloat64(0, false);
  };

  const handleBinaryConvert = () => {
    const value = binaryToDecimal(binaryInput, floatFormat);
    if (!isNaN(value)) {
      setDecimalInput(value.toString());
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Errore copia:', err);
    }
  };

  const formatBinaryWithSpaces = (binary: string, chunkSize: number): string => {
    const chunks = [];
    for (let i = 0; i < binary.length; i += chunkSize) {
      chunks.push(binary.substring(i, i + chunkSize));
    }
    return chunks.join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Educational Info Box */}
      <InfoBox
        title={t('floating.title')}
        description={t('floating.description')}
        icon={<Gauge className="w-5 h-5" />}
        useCases={t('floating.useCases', { returnObjects: true }) as string[]}
        examples={[
          { label: '3.14', value: 'Float32 (IEEE 754)' },
          { label: '42.5', value: 'Fixed Point (Q16.16)' },
          { label: '0.1', value: 'Approximation' }
        ]}
        realWorldUse={t('common.realWorldUse')}
        type="educational"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {t('floating.decimalLabel')}
          </label>
          <input
            type="text"
            value={decimalInput}
            onChange={(e) => setDecimalInput(e.target.value)}
            placeholder="3.14159, -42.5, 0.125"
            className="liquid-input w-full text-white placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {t('floating.floatFormatLabel')}
          </label>
          <select
            value={floatFormat}
            onChange={(e) => setFloatFormat(e.target.value as 'float32' | 'float64')}
            className="liquid-input w-full text-white cursor-pointer appearance-none"
          >
            <option value="float32">Float 32-bit (Single)</option>
            <option value="float64">Float 64-bit (Double)</option>
          </select>
        </div>
      </div>

      {floatingPointResult && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-40"></div>
                <h3 className="text-2xl font-bold text-white relative z-10">{t('floating.title')}</h3>
              </div>
            </div>

            <div className="glass-morphism rounded-2xl p-6 space-y-4 glass-reflection">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-liquid-300 uppercase tracking-wider">{t('floating.sign')} (1 bit)</h4>
                  </div>
                  <div className="glass-morphism rounded-xl p-3 text-center bg-white/5">
                    <span className="text-2xl font-mono text-white">
                      {floatingPointResult.sign}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {floatingPointResult.sign === '0' ? t('floating.positive') : t('floating.negative')}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-liquid-300 uppercase tracking-wider">
                      {t('floating.exponent')} ({floatFormat === 'float32' ? '8' : '11'} bit)
                    </h4>
                  </div>
                  <div className="glass-morphism rounded-xl p-3 text-center bg-white/5">
                    <span className="text-lg font-mono text-white break-all">
                      {floatingPointResult.exponent}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Dec: {parseInt(floatingPointResult.exponent, 2)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-liquid-300 uppercase tracking-wider">
                      {t('floating.mantissa')} ({floatFormat === 'float32' ? '23' : '52'} bit)
                    </h4>
                  </div>
                  <div className="glass-morphism rounded-xl p-3 bg-white/5">
                    <span className="text-xs font-mono text-white break-all">
                      {formatBinaryWithSpaces(floatingPointResult.mantissa, 8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{t('floating.binaryFull')}</h4>
                  <button
                    onClick={() => copyToClipboard(floatingPointResult.binary, 'binary')}
                    className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                    title="Copia"
                  >
                    {copiedField === 'binary' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                <p className="text-sm font-mono text-white break-all glass-morphism p-3 rounded-xl bg-white/5">
                  {formatBinaryWithSpaces(floatingPointResult.binary, 8)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{t('floating.hex')}</h4>
                <button
                  onClick={() => copyToClipboard(floatingPointResult.hex, 'hex')}
                  className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                  title="Copia"
                >
                  {copiedField === 'hex' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 hover:text-white" />
                  )}
                </button>
              </div>
              <p className="text-xl font-mono text-white glass-morphism p-3 rounded-xl bg-white/5">
                0x{floatingPointResult.hex}
              </p>
            </div>
          </div>

          {fixedPointResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-40"></div>
                    <h3 className="text-2xl font-bold text-white relative z-10">{t('floating.fixedTitle')} (Q24.{fixedPointBits})</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-300">{t('floating.fractionalBits')}:</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={fixedPointBits}
                    onChange={(e) => setFixedPointBits(parseInt(e.target.value) || 8)}
                    className="w-20 px-3 py-1.5 glass-morphism text-white text-sm rounded-lg focus:border-liquid-400/50 focus:ring-2 focus:ring-liquid-400/20"
                  />
                </div>
              </div>

              <div className="glass-morphism rounded-2xl p-6 space-y-4 glass-reflection">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{t('floating.binaryFull')} (32-bit)</h4>
                    <button
                      onClick={() => copyToClipboard(fixedPointResult.binary, 'fixed-binary')}
                      className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                      title="Copia"
                    >
                      {copiedField === 'fixed-binary' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-mono text-white break-all glass-morphism p-3 rounded-xl bg-white/5">
                    {formatBinaryWithSpaces(fixedPointResult.binary, 8)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{t('floating.hex')}</h4>
                    <button
                      onClick={() => copyToClipboard(fixedPointResult.hex, 'fixed-hex')}
                      className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                      title="Copia"
                    >
                      {copiedField === 'fixed-hex' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-xl font-mono text-white glass-morphism p-3 rounded-xl bg-white/5">
                    {fixedPointResult.hex}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">{t('floating.integerScaled')}</h4>
                    <button
                      onClick={() => copyToClipboard(fixedPointResult.decimal, 'fixed-decimal')}
                      className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                      title="Copia"
                    >
                      {copiedField === 'fixed-decimal' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-xl font-mono text-white glass-morphism p-3 rounded-xl bg-white/5">
                    {fixedPointResult.decimal}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    * 2^{fixedPointBits} = {Math.pow(2, fixedPointBits)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-700 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-40"></div>
            <h3 className="text-2xl font-bold text-white relative z-10">
              {t('floating.binaryConvertLabel')}
            </h3>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={binaryInput}
              onChange={(e) => setBinaryInput(e.target.value)}
              placeholder={`01000000010010010000111111011011...`}
              className="liquid-input w-full text-white placeholder-slate-400 font-mono"
            />
          </div>
          <button
            onClick={handleBinaryConvert}
            className="liquid-button text-white font-semibold hover:bg-white/10 shadow-liquid"
          >
            Convert
          </button>
        </div>
      </div>

      <div className="glass-morphism rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-30"></div>
            <Info className="w-5 h-5 text-liquid-300 flex-shrink-0 mt-0.5 relative z-10" />
          </div>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>IEEE 754 Float32: 1 bit {t('floating.sign')}, 8 bit {t('floating.exponent')}, 23 bit {t('floating.mantissa')}</li>
              <li>IEEE 754 Float64: 1 bit {t('floating.sign')}, 11 bit {t('floating.exponent')}, 52 bit {t('floating.mantissa')}</li>
            </ul>
          </div>
        </div>
      </div>

      {!decimalInput && (
        <div className="text-center py-16">
          <div className="glass-morphism rounded-2xl p-8 inline-block">
            <p className="text-slate-300 text-lg font-light">{t('floating.decimalLabel')}: Inserisci un numero</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FloatingPointConverter;

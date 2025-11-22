import { useState } from 'react';
import { ArrowRightLeft, Copy, Check, Type } from 'lucide-react';
import AsciiTable from './AsciiTable';
import useCopyToClipboard from '../hooks/useCopyToClipboard';
import { textToAscii, asciiToText, textToBinary, textToHex } from '../utils/conversions';
import InfoBox from './ui/InfoBox';

function AsciiConverter() {
  const [textInput, setTextInput] = useState('');
  const [asciiInput, setAsciiInput] = useState('');
  const [copyStatus, copy] = useCopyToClipboard();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = (text: string, field: string) => {
    copy(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const asciiResult = textInput ? textToAscii(textInput) : '';
  const binaryResult = textInput ? textToBinary(textInput) : '';
  const hexResult = textInput ? textToHex(textInput) : '';
  const textResult = asciiInput ? asciiToText(asciiInput) : '';

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title="Convertitore ASCII"
        description="ASCII (American Standard Code for Information Interchange) è un sistema che assegna un numero univoco a ogni carattere. È alla base di come i computer rappresentano il testo: ogni lettera, numero o simbolo che digiti ha un codice ASCII."
        icon={<Type className="w-5 h-5" />}
        useCases={[
          "Programmazione: capire come i computer memorizzano il testo",
          "Debugging: identificare caratteri speciali nascosti nel codice",
          "Comunicazione dati: trasmissione di testo tra sistemi",
          "Crittografia base: manipolare caratteri a livello numerico",
          "Analisi file: vedere i dati grezzi dei file di testo"
        ]}
        examples={[
          { label: "'A'", value: 'ASCII 65 (binario: 01000001)' },
          { label: "'Hello'", value: '72 101 108 108 111' },
          { label: "'0' (zero)", value: 'ASCII 48 (diverso dal numero 0!)' }
        ]}
        realWorldUse="Quando premi il tasto 'A' sulla tastiera, il computer riceve il numero 65. Questo numero viene poi convertito nella lettera 'A' sullo schermo. ASCII è usato in file .txt, codice sorgente, email, e quasi ovunque ci sia testo nei computer."
        type="educational"
      />

      <AsciiTable />

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div className="absolute inset-0 bg-liquid-400 blur-lg opacity-40"></div>
          <ArrowRightLeft className="w-6 h-6 text-liquid-300 relative z-10" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
              Testo da Convertire
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Inserisci il testo..."
              rows={4}
              className="liquid-input w-full text-white placeholder-slate-400 resize-none"
            />
          </div>

          {textInput && (
            <div className="space-y-4">
              <div className="glass-card specular-highlight p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">ASCII Decimale</h4>
                  <button
                    onClick={() => handleCopy(asciiResult, 'ascii')}
                    className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                    title="Copia"
                  >
                    {copiedField === 'ascii' && copyStatus === 'copied' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">{asciiResult}</p>
              </div>

              <div className="glass-card specular-highlight p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">Binario</h4>
                  <button
                    onClick={() => handleCopy(binaryResult, 'binary')}
                    className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                    title="Copia"
                  >
                    {copiedField === 'binary' && copyStatus === 'copied' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">{binaryResult}</p>
              </div>

              <div className="glass-card specular-highlight p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">Esadecimale</h4>
                  <button
                    onClick={() => handleCopy(hexResult, 'hex')}
                    className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                    title="Copia"
                  >
                    {copiedField === 'hex' && copyStatus === 'copied' ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">{hexResult}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
              Codici ASCII da Convertire
            </label>
            <textarea
              value={asciiInput}
              onChange={(e) => setAsciiInput(e.target.value)}
              placeholder="Inserisci i codici ASCII separati da spazi o virgole... (es. 72 101 108 108 111)"
              rows={4}
              className="liquid-input w-full text-white placeholder-slate-400 resize-none"
            />
          </div>

          {asciiInput && (
            <div className="glass-card specular-highlight p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">Testo Risultante</h4>
                <button
                  onClick={() => handleCopy(textResult, 'text')}
                  className="glass-morphism p-2.5 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10"
                  title="Copia"
                >
                  {copiedField === 'text' && copyStatus === 'copied' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-300 hover:text-white" />
                  )}
                </button>
              </div>
              <p className="text-white text-lg break-all">{textResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AsciiConverter;

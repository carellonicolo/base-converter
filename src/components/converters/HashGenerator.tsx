import React, { useState, useEffect, useRef } from 'react';
import { Shield, FileUp } from 'lucide-react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import InfoBox from '../ui/InfoBox';
import { generateHash, generateFileHash, HashAlgorithm } from '../../utils/conversions/hash';
import { useDebounce } from '../../hooks/useDebounce';

const HashGenerator: React.FC = () => {
  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA256');
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedInput = useDebounce(input, 300);

  const algorithmOptions = [
    { value: 'MD5', label: 'MD5 (Deprecated)' },
    { value: 'SHA1', label: 'SHA-1' },
    { value: 'SHA256', label: 'SHA-256 (Recommended)' },
    { value: 'SHA512', label: 'SHA-512' },
  ];

  useEffect(() => {
    if (!debouncedInput) {
      setHash('');
      return;
    }

    const generateHashAsync = async () => {
      setLoading(true);
      try {
        const result = await generateHash(debouncedInput, algorithm);
        setHash(result);
      } catch (error) {
        setHash('');
      } finally {
        setLoading(false);
      }
    };

    generateHashAsync();
  }, [debouncedInput, algorithm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileHash = await generateFileHash(file, algorithm as 'SHA256' | 'SHA512');
      setHash(fileHash);
    } catch (error) {
      console.error('Error generating file hash:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational Info Box */}
      <InfoBox
        title="Generatore Hash Crittografici"
        description="Gli hash crittografici trasformano qualsiasi dato (testo, file) in una 'impronta digitale' univoca di lunghezza fissa. Anche un piccolo cambiamento nell'input produce un hash completamente diverso. Sono unidirezionali: dall'hash non puoi risalire all'originale."
        icon={<Shield className="w-5 h-5" />}
        useCases={[
          "Password: hash SHA-256 invece di memorizzare password in chiaro",
          "Integrità file: verificare che un download non sia corrotto o manomesso",
          "Blockchain: Bitcoin usa SHA-256 per mining e verifica transazioni",
          "Firme digitali: verificare l'autenticità di documenti e software",
          "Deduplicazione: identificare file duplicati senza confrontare contenuti"
        ]}
        examples={[
          { label: '"password123"', value: 'SHA-256: ef92b778b... (sempre uguale)' },
          { label: '"password124"', value: 'SHA-256: 8d969eef6... (completamente diverso!)' },
          { label: 'File di 1GB', value: 'SHA-256 sempre 64 caratteri' }
        ]}
        realWorldUse="Quando scarichi Linux da internet, viene fornito anche l'hash SHA-256. Dopo il download, ricalcoli l'hash del file e lo confronti: se coincide, il file è integro e autentico. Le password su siti sicuri vengono hashate: anche gli admin non vedono la tua password, solo l'hash. ⚠️ MD5 e SHA-1 sono OBSOLETI per sicurezza, usa SHA-256!"
        type="warning"
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Textarea
            label="Testo da hashare"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Inserisci il testo da convertire in hash..."
            rows={8}
            fullWidth
          />
        </div>

        <div className="space-y-4">
          <Select
            label="Algoritmo"
            options={algorithmOptions}
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as HashAlgorithm)}
            fullWidth
          />

          <div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
              <Button
                variant="secondary"
                icon={FileUp}
                fullWidth
                loading={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                Hash File
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Carica un file per calcolarne l'hash
            </p>
          </div>
        </div>
      </div>

      {hash && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider">
                {algorithm} Hash
              </h4>
              <p className="text-xs text-slate-400 mt-1">Lunghezza: {hash.length} caratteri</p>
            </div>
            <CopyButton text={hash} />
          </div>
          <div className="glass-morphism p-4 rounded-xl bg-black/20">
            <p className="text-white font-mono text-sm break-all">
              {hash}
            </p>
          </div>
        </Card>
      )}

      {/* Algorithm comparison */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-4 tracking-wide">Confronto Algoritmi</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Algoritmo</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Lunghezza</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Sicurezza</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Uso</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 font-mono">MD5</td>
                <td className="py-2 px-3">128 bit</td>
                <td className="py-2 px-3 text-red-400">❌ Insicuro</td>
                <td className="py-2 px-3">Checksum non-critico</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 font-mono">SHA-1</td>
                <td className="py-2 px-3">160 bit</td>
                <td className="py-2 px-3 text-yellow-400">⚠️ Deprecato</td>
                <td className="py-2 px-3">Legacy systems</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 px-3 font-mono">SHA-256</td>
                <td className="py-2 px-3">256 bit</td>
                <td className="py-2 px-3 text-green-400">✅ Sicuro</td>
                <td className="py-2 px-3">Uso generale</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono">SHA-512</td>
                <td className="py-2 px-3">512 bit</td>
                <td className="py-2 px-3 text-green-400">✅ Molto sicuro</td>
                <td className="py-2 px-3">Alta sicurezza</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HashGenerator;

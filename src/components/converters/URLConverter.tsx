import React, { useState } from 'react';
import { Link2, ExternalLink } from 'lucide-react';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import {
  encodeURL,
  decodeURL,
  parseQueryString,
  objectToQueryString,
  parseURL,
  slugify,
} from '../../utils/conversions/url';
import { useHistory } from '../../hooks/useHistory';
import { useDebounce } from '../../hooks/useDebounce';

const URLConverter: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [urlInput, setURLInput] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [error, setError] = useState('');
  const { add } = useHistory();

  const debouncedText = useDebounce(textInput, 300);
  const debouncedURL = useDebounce(urlInput, 300);
  const debouncedQuery = useDebounce(queryInput, 300);

  const encodedURL = debouncedText ? encodeURL(debouncedText) : '';

  const decodedURL = React.useMemo(() => {
    if (!debouncedURL) {
      setError('');
      return '';
    }
    try {
      const result = decodeURL(debouncedURL);
      setError('');
      return result;
    } catch {
      setError('');
      return debouncedURL; // Return as-is if not encoded
    }
  }, [debouncedURL]);

  const queryParams = React.useMemo(() => {
    if (!debouncedQuery) return null;
    try {
      return parseQueryString(debouncedQuery);
    } catch {
      return null;
    }
  }, [debouncedQuery]);

  const slugified = debouncedText ? slugify(debouncedText) : '';

  React.useEffect(() => {
    if (encodedURL && debouncedText) {
      add('url', debouncedText, { encoded: encodedURL, slugified });
    }
  }, [encodedURL, debouncedText, slugified, add]);

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="glass-morphism rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Link2 className="w-6 h-6 text-liquid-300 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">URL Encoder/Decoder</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Codifica e decodifica URL, analizza query parameters, e crea slug URL-friendly.
              Essenziale per sviluppo web e gestione API.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Encode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Codifica URL</h3>

          <Textarea
            label="Testo da codificare"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Hello World! #test"
            rows={4}
            fullWidth
          />

          {encodedURL && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">URL Codificato</h4>
                <CopyButton text={encodedURL} />
              </div>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg">
                {encodedURL}
              </p>
            </Card>
          )}

          {slugified && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">URL Slug</h4>
                <CopyButton text={slugified} />
              </div>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg">
                {slugified}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Slug URL-friendly per titoli e permalink
              </p>
            </Card>
          )}
        </div>

        {/* Decode section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Decodifica URL</h3>

          <Textarea
            label="URL da decodificare"
            value={urlInput}
            onChange={(e) => setURLInput(e.target.value)}
            placeholder="Hello%20World%21%20%23test"
            rows={4}
            fullWidth
          />

          {decodedURL && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-liquid-300 uppercase">URL Decodificato</h4>
                <CopyButton text={decodedURL} />
              </div>
              <p className="text-white text-sm break-all bg-black/20 p-3 rounded-lg">
                {decodedURL}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Query string parser */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Analizza Query Parameters</h3>

        <Textarea
          label="URL o Query String"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="?name=John&age=30&city=Rome oppure URL completo"
          rows={3}
          fullWidth
        />

        {queryParams && Object.keys(queryParams).length > 0 && (
          <Card>
            <h4 className="text-sm font-bold text-liquid-300 uppercase mb-4">Parametri Estratti</h4>
            <div className="space-y-2">
              {Object.entries(queryParams).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <code className="text-liquid-300 font-mono font-bold">{key}</code>
                    <span className="text-slate-500">=</span>
                    <code className="text-white font-mono">{value}</code>
                  </div>
                  <CopyButton text={`${key}=${value}`} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Examples */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">Caratteri Comuni Codificati</h4>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <code className="text-slate-400">spazio</code>
            <code className="text-liquid-300 font-mono">%20</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">!</code>
            <code className="text-liquid-300 font-mono">%21</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">#</code>
            <code className="text-liquid-300 font-mono">%23</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">&</code>
            <code className="text-liquid-300 font-mono">%26</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">=</code>
            <code className="text-liquid-300 font-mono">%3D</code>
          </div>
          <div className="flex items-center justify-between">
            <code className="text-slate-400">?</code>
            <code className="text-liquid-300 font-mono">%3F</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default URLConverter;

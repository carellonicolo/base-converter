import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import Textarea from '../ui/Textarea';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import { decodeJWT, validateJWT, formatJWT } from '../../utils/conversions/jwt';
import { useHistory } from '../../hooks/useHistory';
import { useDebounce } from '../../hooks/useDebounce';

const JWTDecoder: React.FC = () => {
  const [jwtInput, setJwtInput] = useState('');
  const [error, setError] = useState('');
  const { add } = useHistory();

  const debouncedJWT = useDebounce(jwtInput, 300);

  const decoded = React.useMemo(() => {
    if (!debouncedJWT) return null;
    try {
      const result = decodeJWT(debouncedJWT);
      setError('');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JWT non valido');
      return null;
    }
  }, [debouncedJWT]);

  const validation = React.useMemo(() => {
    if (!debouncedJWT) return null;
    try {
      return validateJWT(debouncedJWT);
    } catch {
      return null;
    }
  }, [debouncedJWT]);

  React.useEffect(() => {
    if (decoded && validation) {
      add('jwt', debouncedJWT.substring(0, 50) + '...', {
        header: decoded.header,
        payload: decoded.payload,
        valid: validation.valid,
      });
    }
  }, [decoded, validation, debouncedJWT, add]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('it-IT');
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="glass-morphism rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-liquid-300 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">JWT Decoder</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              Decodifica e analizza JSON Web Tokens (JWT). I JWT sono usati per autenticazione
              e scambio sicuro di informazioni tra parti.
            </p>
            <div className="glass-morphism rounded-xl p-4 bg-red-500/10 border-red-500/20">
              <p className="text-red-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Attenzione: Questo strumento decodifica JWT ma NON verifica la firma crittografica.
                Non inserire token sensibili in ambienti non sicuri.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <Textarea
        label="JWT Token"
        value={jwtInput}
        onChange={(e) => setJwtInput(e.target.value)}
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        rows={4}
        fullWidth
        error={error}
      />

      {/* Validation status */}
      {validation && (
        <Card className={validation.valid ? 'border-green-500/30' : 'border-red-500/30'}>
          <div className="flex items-center gap-3 mb-4">
            {validation.valid ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h4 className="text-lg font-bold text-white">
                {validation.valid ? 'Token Valido' : 'Token Non Valido'}
              </h4>
              {validation.expired && (
                <p className="text-sm text-red-400">Token scaduto</p>
              )}
              {validation.notYetValid && (
                <p className="text-sm text-yellow-400">Token non ancora valido</p>
              )}
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="glass-morphism rounded-xl p-4 bg-red-500/10">
              <h5 className="text-sm font-bold text-red-400 mb-2">Errori:</h5>
              <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.expiresIn !== null && validation.expiresIn > 0 && (
            <p className="text-sm text-slate-400 mt-3">
              Scade tra: {Math.floor(validation.expiresIn / 3600)} ore
            </p>
          )}
        </Card>
      )}

      {/* Decoded sections */}
      {decoded && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Header */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-liquid-300">Header</h4>
              <CopyButton text={JSON.stringify(decoded.header, null, 2)} />
            </div>
            <div className="glass-morphism rounded-xl p-4 bg-black/20">
              <pre className="text-sm text-white font-mono overflow-x-auto">
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Algorithm:</span>
                <span className="text-white font-mono">{decoded.header.alg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="text-white font-mono">{decoded.header.typ}</span>
              </div>
            </div>
          </Card>

          {/* Payload */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-liquid-300">Payload</h4>
              <CopyButton text={JSON.stringify(decoded.payload, null, 2)} />
            </div>
            <div className="glass-morphism rounded-xl p-4 bg-black/20 max-h-96 overflow-y-auto custom-scrollbar">
              <pre className="text-sm text-white font-mono">
                {JSON.stringify(decoded.payload, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      )}

      {/* Payload details */}
      {decoded?.payload && (
        <Card>
          <h4 className="text-lg font-bold text-white mb-4">Standard Claims</h4>
          <div className="grid md:grid-cols-2 gap-4">
            {decoded.payload.iss && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Issuer (iss)</p>
                <p className="text-white font-mono text-sm">{decoded.payload.iss}</p>
              </div>
            )}
            {decoded.payload.sub && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Subject (sub)</p>
                <p className="text-white font-mono text-sm">{decoded.payload.sub}</p>
              </div>
            )}
            {decoded.payload.aud && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Audience (aud)</p>
                <p className="text-white font-mono text-sm">{decoded.payload.aud}</p>
              </div>
            )}
            {decoded.payload.exp && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Expiration Time (exp)</p>
                <p className="text-white text-sm">{formatTimestamp(decoded.payload.exp)}</p>
              </div>
            )}
            {decoded.payload.nbf && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Not Before (nbf)</p>
                <p className="text-white text-sm">{formatTimestamp(decoded.payload.nbf)}</p>
              </div>
            )}
            {decoded.payload.iat && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Issued At (iat)</p>
                <p className="text-white text-sm">{formatTimestamp(decoded.payload.iat)}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Signature */}
      {decoded && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-liquid-300">Signature</h4>
              <p className="text-xs text-slate-400 mt-1">
                La firma garantisce che il token non sia stato alterato
              </p>
            </div>
            <CopyButton text={decoded.signature} />
          </div>
          <div className="glass-morphism rounded-xl p-4 bg-black/20">
            <p className="text-white font-mono text-sm break-all">
              {decoded.signature}
            </p>
          </div>
        </Card>
      )}

      {/* Example JWT */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-3 tracking-wide">Esempio JWT</h4>
        <p className="text-xs text-slate-400 mb-2">Prova con questo token di esempio:</p>
        <div className="glass-morphism rounded-xl p-3 bg-black/20">
          <code className="text-liquid-300 font-mono text-xs break-all">
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
          </code>
        </div>
      </div>
    </div>
  );
};

export default JWTDecoder;

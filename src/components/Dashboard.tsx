import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Type, Binary, Gauge, FileText, Shield,
  Palette, Clock, Link2, Key, FileJson, History, Settings
} from 'lucide-react';
import Card from './ui/Card';
import { useHistory } from '../hooks/useHistory';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats } = useHistory();

  const converters = [
    { name: 'Basi Numeriche', path: '/base', icon: Hash, color: 'text-blue-400', description: 'Converti tra basi 2-36' },
    { name: 'ASCII', path: '/ascii', icon: Type, color: 'text-green-400', description: 'Testo ↔ ASCII' },
    { name: 'Unicode', path: '/unicode', icon: Binary, color: 'text-purple-400', description: 'Testo ↔ Unicode' },
    { name: 'Virgola Mobile', path: '/floating', icon: Gauge, color: 'text-yellow-400', description: 'IEEE 754 & Fixed-point' },
    { name: 'Base64', path: '/base64', icon: FileText, color: 'text-cyan-400', description: 'Codifica/Decodifica Base64' },
    { name: 'Hash', path: '/hash', icon: Shield, color: 'text-red-400', description: 'MD5, SHA-256, SHA-512' },
    { name: 'Colori', path: '/color', icon: Palette, color: 'text-pink-400', description: 'HEX ↔ RGB ↔ HSL ↔ CMYK' },
    { name: 'Timestamp', path: '/timestamp', icon: Clock, color: 'text-orange-400', description: 'Unix ↔ Date ↔ ISO' },
    { name: 'URL', path: '/url', icon: Link2, color: 'text-indigo-400', description: 'Encode/Decode URL' },
    { name: 'JWT', path: '/jwt', icon: Key, color: 'text-emerald-400', description: 'Decoder JWT Token' },
    { name: 'JSON', path: '/json', icon: FileJson, color: 'text-teal-400', description: 'Formatta e Valida JSON' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4 animate-float">
          Base Converter Pro
        </h1>
        <p className="text-xl text-slate-300 mb-2">
          La suite completa per conversioni e encoding
        </p>
        <p className="text-sm text-slate-400">
          11 strumenti professionali in un'unica applicazione
        </p>
      </div>

      {/* Stats */}
      {stats.totalConversions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <div className="text-3xl font-bold text-liquid-300 mb-1">
              {stats.totalConversions}
            </div>
            <div className="text-sm text-slate-400">Conversioni Totali</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-liquid-300 mb-1">
              {stats.favoriteCount}
            </div>
            <div className="text-sm text-slate-400">Preferiti</div>
          </Card>
          <Card className="text-center">
            <div className="text-3xl font-bold text-liquid-300 mb-1">
              {stats.mostUsedType?.toUpperCase() || 'N/A'}
            </div>
            <div className="text-sm text-slate-400">Più Usato</div>
          </Card>
        </div>
      )}

      {/* Converters grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Scegli uno Strumento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {converters.map((converter) => (
            <Card
              key={converter.path}
              hover
              onClick={() => navigate(converter.path)}
              className="cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="glass-morphism p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <converter.icon className={`w-6 h-6 ${converter.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1 group-hover:text-liquid-300 transition-colors">
                    {converter.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {converter.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card hover onClick={() => navigate('/history')} className="cursor-pointer">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-liquid-300" />
            <div>
              <h3 className="text-lg font-bold text-white">Cronologia</h3>
              <p className="text-sm text-slate-400">Visualizza tutte le conversioni passate</p>
            </div>
          </div>
        </Card>

        <Card hover onClick={() => navigate('/settings')} className="cursor-pointer">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-liquid-300" />
            <div>
              <h3 className="text-lg font-bold text-white">Impostazioni</h3>
              <p className="text-sm text-slate-400">Personalizza tema e preferenze</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Features */}
      <div className="glass-morphism rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Caratteristiche</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Conversioni in tempo reale</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Cronologia persistente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Copia con un click</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Temi personalizzabili</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>PWA - Funziona offline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>100% Privacy - Locale</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

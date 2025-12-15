import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Type, Binary, Gauge, FileText, Shield,
  Palette, Clock, Link2, Key, FileJson
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const converters = [
    { name: t('dashboard.tools.base.name'), path: '/base', icon: Hash, color: 'text-blue-400', description: t('dashboard.tools.base.desc') },
    { name: t('dashboard.tools.ascii.name'), path: '/ascii', icon: Type, color: 'text-green-400', description: t('dashboard.tools.ascii.desc') },
    { name: t('dashboard.tools.unicode.name'), path: '/unicode', icon: Binary, color: 'text-purple-400', description: t('dashboard.tools.unicode.desc') },
    { name: t('dashboard.tools.floating.name'), path: '/floating', icon: Gauge, color: 'text-yellow-400', description: t('dashboard.tools.floating.desc') },
    { name: t('dashboard.tools.base64.name'), path: '/base64', icon: FileText, color: 'text-cyan-400', description: t('dashboard.tools.base64.desc') },
    { name: t('dashboard.tools.hash.name'), path: '/hash', icon: Shield, color: 'text-red-400', description: t('dashboard.tools.hash.desc') },
    { name: t('dashboard.tools.color.name'), path: '/color', icon: Palette, color: 'text-pink-400', description: t('dashboard.tools.color.desc') },
    { name: t('dashboard.tools.timestamp.name'), path: '/timestamp', icon: Clock, color: 'text-orange-400', description: t('dashboard.tools.timestamp.desc') },
    { name: t('dashboard.tools.url.name'), path: '/url', icon: Link2, color: 'text-indigo-400', description: t('dashboard.tools.url.desc') },
    { name: t('dashboard.tools.jwt.name'), path: '/jwt', icon: Key, color: 'text-emerald-400', description: t('dashboard.tools.jwt.desc') },
    { name: t('dashboard.tools.json.name'), path: '/json', icon: FileJson, color: 'text-teal-400', description: t('dashboard.tools.json.desc') },
  ];

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4 animate-float">
          {t('dashboard.hero.title')}
        </h1>
        <p className="text-xl text-slate-300 mb-2">
          {t('dashboard.hero.subtitle')}
        </p>
        <p className="text-sm text-slate-400">
          {t('dashboard.hero.description')}
        </p>
      </div>

      {/* Converters grid */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">{t('dashboard.toolsTitle')}</h2>
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


    </div>
  );
};

export default Dashboard;

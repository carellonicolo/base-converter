import { useState } from 'react';
import { Calculator, Hash, Type, Binary, Gauge, ExternalLink } from 'lucide-react';
import BaseConverter from './components/BaseConverter';
import AsciiConverter from './components/AsciiConverter';
import UnicodeConverter from './components/UnicodeConverter';
import FloatingPointConverter from './components/FloatingPointConverter';

function App() {
  const [activeTab, setActiveTab] = useState<'base' | 'ascii' | 'unicode' | 'floating'>('base');

  return (
    <div className="min-h-screen liquid-gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6 animate-float">
            <div className="relative">
              <div className="absolute inset-0 bg-liquid-400 blur-2xl opacity-30 animate-glow"></div>
              <Calculator className="w-16 h-16 text-liquid-300 relative z-10 drop-shadow-liquid" />
            </div>
            <h1 className="text-6xl font-bold text-white tracking-tight drop-shadow-lg">
              Base Converter
            </h1>
          </div>
          <p className="text-slate-300 text-lg font-light mb-4">Powered by Prof. Carello Nicolò - info@nicolocarello.it</p>
          <a
            href="https://app.nicolocarello.it"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 glass-morphism rounded-xl text-liquid-300 font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105 group"
          >
            <span>Vai a Tutte le App</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </header>

        <div className="glass-morphism rounded-3xl shadow-glass-lg overflow-hidden glass-reflection">
          <div className="flex border-b border-white/10 backdrop-blur-xl bg-white/5">
            <button
              onClick={() => setActiveTab('base')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-all duration-500 relative group ${
                activeTab === 'base'
                  ? 'text-liquid-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'base' && (
                <div className="absolute inset-0 bg-gradient-to-t from-liquid-500/20 to-transparent backdrop-blur-sm border-b-2 border-liquid-400"></div>
              )}
              <Hash className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeTab === 'base' ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="relative z-10">Basi Numeriche</span>
            </button>
            <button
              onClick={() => setActiveTab('ascii')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-all duration-500 relative group ${
                activeTab === 'ascii'
                  ? 'text-liquid-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'ascii' && (
                <div className="absolute inset-0 bg-gradient-to-t from-liquid-500/20 to-transparent backdrop-blur-sm border-b-2 border-liquid-400"></div>
              )}
              <Type className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeTab === 'ascii' ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="relative z-10">ASCII</span>
            </button>
            <button
              onClick={() => setActiveTab('unicode')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-all duration-500 relative group ${
                activeTab === 'unicode'
                  ? 'text-liquid-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'unicode' && (
                <div className="absolute inset-0 bg-gradient-to-t from-liquid-500/20 to-transparent backdrop-blur-sm border-b-2 border-liquid-400"></div>
              )}
              <Binary className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeTab === 'unicode' ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="relative z-10">Unicode</span>
            </button>
            <button
              onClick={() => setActiveTab('floating')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-all duration-500 relative group ${
                activeTab === 'floating'
                  ? 'text-liquid-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === 'floating' && (
                <div className="absolute inset-0 bg-gradient-to-t from-liquid-500/20 to-transparent backdrop-blur-sm border-b-2 border-liquid-400"></div>
              )}
              <Gauge className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeTab === 'floating' ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="relative z-10">Virgola Mobile/Fissa</span>
            </button>
          </div>

          <div className="p-8 backdrop-blur-sm">
            {activeTab === 'base' && <BaseConverter />}
            {activeTab === 'ascii' && <AsciiConverter />}
            {activeTab === 'unicode' && <UnicodeConverter />}
            {activeTab === 'floating' && <FloatingPointConverter />}
          </div>
        </div>

        <footer className="text-center mt-8 text-slate-400 text-sm opacity-70">

        </footer>
      </div>
    </div>
  );
}

export default App;

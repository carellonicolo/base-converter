import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import Input from '../ui/Input';
import Card from '../ui/Card';
import CopyButton from '../shared/CopyButton';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  rgbToCmyk,
  cmykToRgb,
  isValidHex,
  formatHex,
} from '../../utils/conversions/color';
import { useHistory } from '../../hooks/useHistory';

const ColorConverter: React.FC = () => {
  const [hexInput, setHexInput] = useState('#38bdf8');
  const [rgbR, setRgbR] = useState(56);
  const [rgbG, setRgbG] = useState(189);
  const [rgbB, setRgbB] = useState(248);
  const { add } = useHistory();

  const [currentColor, setCurrentColor] = useState({ r: 56, g: 189, b: 248 });

  // Update from HEX
  const handleHexChange = (hex: string) => {
    setHexInput(hex);
    if (isValidHex(hex)) {
      const rgb = hexToRgb(hex);
      if (rgb) {
        setCurrentColor(rgb);
        setRgbR(rgb.r);
        setRgbG(rgb.g);
        setRgbB(rgb.b);
      }
    }
  };

  // Update from RGB
  useEffect(() => {
    setCurrentColor({ r: rgbR, g: rgbG, b: rgbB });
    setHexInput(rgbToHex(rgbR, rgbG, rgbB));
  }, [rgbR, rgbG, rgbB]);

  // Calculate all formats
  const hsl = rgbToHsl(currentColor.r, currentColor.g, currentColor.b);
  const hsv = rgbToHsv(currentColor.r, currentColor.g, currentColor.b);
  const cmyk = rgbToCmyk(currentColor.r, currentColor.g, currentColor.b);

  const colorPreview = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

  const handleSave = () => {
    add('color', hexInput, {
      hex: hexInput,
      rgb: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
      cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    });
  };

  useEffect(() => {
    handleSave();
  }, [currentColor]);

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="glass-morphism rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Palette className="w-6 h-6 text-liquid-300 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Convertitore di Colori</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Converti colori tra diversi formati: HEX, RGB, HSL, HSV, e CMYK.
              Perfetto per web design, grafica digitale, e stampa.
            </p>
          </div>
        </div>
      </div>

      {/* Color preview */}
      <Card className="text-center">
        <h4 className="text-sm font-bold text-slate-200 mb-4 tracking-wide">Anteprima Colore</h4>
        <div
          className="w-full h-40 rounded-2xl border-4 border-white/20 shadow-glass-lg mb-4"
          style={{ background: colorPreview }}
        />
        <p className="text-white font-mono text-lg">{hexInput.toUpperCase()}</p>
      </Card>

      {/* Input methods */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider mb-4">
            Formato HEX
          </h4>
          <Input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#38bdf8"
            fullWidth
          />
          <input
            type="color"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-full h-12 mt-3 rounded-xl cursor-pointer"
          />
        </Card>

        <Card>
          <h4 className="text-sm font-bold text-liquid-300 uppercase tracking-wider mb-4">
            Formato RGB
          </h4>
          <div className="space-y-3">
            <Input
              type="number"
              min="0"
              max="255"
              value={rgbR}
              onChange={(e) => setRgbR(Number(e.target.value))}
              label="R"
              fullWidth
            />
            <Input
              type="number"
              min="0"
              max="255"
              value={rgbG}
              onChange={(e) => setRgbG(Number(e.target.value))}
              label="G"
              fullWidth
            />
            <Input
              type="number"
              min="0"
              max="255"
              value={rgbB}
              onChange={(e) => setRgbB(Number(e.target.value))}
              label="B"
              fullWidth
            />
          </div>
        </Card>
      </div>

      {/* All formats */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-liquid-300">HEX</h4>
            <CopyButton text={hexInput} size="sm" />
          </div>
          <p className="text-white font-mono">{hexInput.toUpperCase()}</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-liquid-300">RGB</h4>
            <CopyButton text={`rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`} size="sm" />
          </div>
          <p className="text-white font-mono">rgb({currentColor.r}, {currentColor.g}, {currentColor.b})</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-liquid-300">HSL</h4>
            <CopyButton text={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} size="sm" />
          </div>
          <p className="text-white font-mono">hsl({hsl.h}, {hsl.s}%, {hsl.l}%)</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-liquid-300">HSV</h4>
            <CopyButton text={`hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`} size="sm" />
          </div>
          <p className="text-white font-mono">hsv({hsv.h}, {hsv.s}%, {hsv.v}%)</p>
        </Card>

        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-liquid-300">CMYK</h4>
            <CopyButton text={`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`} size="sm" />
          </div>
          <p className="text-white font-mono">
            cmyk({cmyk.c}%, {cmyk.m}%, {cmyk.y}%, {cmyk.k}%)
          </p>
          <p className="text-xs text-slate-400 mt-2">
            ℹ️ CMYK è usato per la stampa professionale
          </p>
        </Card>
      </div>

      {/* Color palette suggestions */}
      <div className="glass-morphism rounded-2xl p-6">
        <h4 className="text-sm font-bold text-slate-200 mb-4 tracking-wide">Palette Suggerita</h4>
        <div className="grid grid-cols-5 gap-3">
          {[0, 20, 40, 60, 80].map((offset) => {
            const adjustedL = Math.max(0, Math.min(100, hsl.l + offset - 40));
            const paletteRgb = hslToRgb(hsl.h, hsl.s, adjustedL);
            const paletteHex = rgbToHex(paletteRgb.r, paletteRgb.g, paletteRgb.b);
            const paletteColor = `rgb(${paletteRgb.r}, ${paletteRgb.g}, ${paletteRgb.b})`;

            return (
              <div key={offset} className="text-center">
                <div
                  className="w-full h-20 rounded-xl border-2 border-white/20 cursor-pointer hover:scale-105 transition-transform"
                  style={{ background: paletteColor }}
                  onClick={() => handleHexChange(paletteHex)}
                  title={`Click per usare ${paletteHex}`}
                />
                <p className="text-xs text-slate-400 mt-2 font-mono">{paletteHex}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ColorConverter;

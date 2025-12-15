import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Search, Info } from 'lucide-react';
import CharacterDetailModal from './CharacterDetailModal';
import { unicodeCharacterDetails } from '../data/unicodeCharacterDetails';

interface UnicodeChar {
  dec: number;
  hex: string;
  bin: string;
  char: string;
  description: string;
  category: string;
  unicode: string;
}

const generateUnicodeData = (): UnicodeChar[] => {
  const data: UnicodeChar[] = [];

  for (let i = 0; i <= 0x024F; i++) {
    const char = String.fromCodePoint(i);
    let category = '';
    let description = '';

    if (i <= 0x001F) {
      category = 'control';
      description = getControlDescription(i);
    } else if (i === 0x0020) {
      category = 'special';
      description = 'Spazio';
    } else if (i >= 0x0021 && i <= 0x002F) {
      category = 'special';
      description = getSpecialDescription(i);
    } else if (i >= 0x0030 && i <= 0x0039) {
      category = 'number';
      description = `Cifra ${char}`;
    } else if (i >= 0x003A && i <= 0x0040) {
      category = 'special';
      description = getSpecialDescription(i);
    } else if (i >= 0x0041 && i <= 0x005A) {
      category = 'uppercase';
      description = `${char} maiuscola`;
    } else if (i >= 0x005B && i <= 0x0060) {
      category = 'special';
      description = getSpecialDescription(i);
    } else if (i >= 0x0061 && i <= 0x007A) {
      category = 'lowercase';
      description = `${char} minuscola`;
    } else if (i >= 0x007B && i <= 0x007E) {
      category = 'special';
      description = getSpecialDescription(i);
    } else if (i === 0x007F) {
      category = 'control';
      description = 'Delete';
    } else if (i >= 0x0080 && i <= 0x009F) {
      category = 'control';
      description = 'Controllo C1';
    } else if (i >= 0x00A0 && i <= 0x00BF) {
      category = 'latin1-symbols';
      description = getLatin1Description(i);
    } else if (i >= 0x00C0 && i <= 0x00D6) {
      category = 'latin1-uppercase';
      description = `${char} maiuscola accentata`;
    } else if (i >= 0x00D8 && i <= 0x00DE) {
      category = 'latin1-uppercase';
      description = `${char} maiuscola speciale`;
    } else if (i === 0x00D7) {
      category = 'latin1-symbols';
      description = 'Segno di moltiplicazione';
    } else if (i === 0x00DF) {
      category = 'latin1-lowercase';
      description = 'ß tedesca (eszett)';
    } else if (i >= 0x00E0 && i <= 0x00F6) {
      category = 'latin1-lowercase';
      description = `${char} minuscola accentata`;
    } else if (i >= 0x00F8 && i <= 0x00FF) {
      category = 'latin1-lowercase';
      description = `${char} minuscola speciale`;
    } else if (i === 0x00F7) {
      category = 'latin1-symbols';
      description = 'Segno di divisione';
    } else if (i >= 0x0100 && i <= 0x017F) {
      category = 'latin-extended-a';
      description = `${char} - Latin Extended-A`;
    } else if (i >= 0x0180 && i <= 0x024F) {
      category = 'latin-extended-b';
      description = `${char} - Latin Extended-B`;
    }

    data.push({
      dec: i,
      hex: i.toString(16).toUpperCase().padStart(4, '0'),
      bin: i.toString(2).padStart(16, '0'),
      char: char,
      description: description,
      category: category,
      unicode: `U+${i.toString(16).toUpperCase().padStart(4, '0')}`
    });
  }

  // Add Emojis (U+1F600 - U+1F64F)
  for (let i = 0x1F600; i <= 0x1F64F; i++) {
    const char = String.fromCodePoint(i);
    data.push({
      dec: i,
      hex: i.toString(16).toUpperCase().padStart(4, '0'),
      bin: i.toString(2).padStart(16, '0'),
      char: char,
      description: 'Emoji / Emoticon',
      category: 'emoji',
      unicode: `U+${i.toString(16).toUpperCase().padStart(4, '0')}`
    });
  }

  return data;
};

const getControlDescription = (code: number): string => {
  const controlNames: Record<number, string> = {
    0: 'NUL - Null', 1: 'SOH - Start of Heading', 2: 'STX - Start of Text',
    3: 'ETX - End of Text', 4: 'EOT - End of Transmission', 5: 'ENQ - Enquiry',
    6: 'ACK - Acknowledge', 7: 'BEL - Bell', 8: 'BS - Backspace',
    9: 'TAB - Horizontal Tab', 10: 'LF - Line Feed', 11: 'VT - Vertical Tab',
    12: 'FF - Form Feed', 13: 'CR - Carriage Return', 14: 'SO - Shift Out',
    15: 'SI - Shift In', 16: 'DLE - Data Link Escape', 17: 'DC1 - Device Control 1',
    18: 'DC2 - Device Control 2', 19: 'DC3 - Device Control 3',
    20: 'DC4 - Device Control 4', 21: 'NAK - Negative Acknowledge',
    22: 'SYN - Synchronous Idle', 23: 'ETB - End of Trans. Block',
    24: 'CAN - Cancel', 25: 'EM - End of Medium', 26: 'SUB - Substitute',
    27: 'ESC - Escape', 28: 'FS - File Separator', 29: 'GS - Group Separator',
    30: 'RS - Record Separator', 31: 'US - Unit Separator'
  };
  return controlNames[code] || 'Controllo';
};

const getSpecialDescription = (code: number): string => {
  const special: Record<number, string> = {
    0x21: 'Punto esclamativo', 0x22: 'Virgolette', 0x23: 'Cancelletto',
    0x24: 'Dollaro', 0x25: 'Percentuale', 0x26: 'E commerciale',
    0x27: 'Apostrofo', 0x28: 'Parentesi aperta', 0x29: 'Parentesi chiusa',
    0x2A: 'Asterisco', 0x2B: 'Più', 0x2C: 'Virgola', 0x2D: 'Trattino',
    0x2E: 'Punto', 0x2F: 'Barra', 0x3A: 'Due punti', 0x3B: 'Punto e virgola',
    0x3C: 'Minore', 0x3D: 'Uguale', 0x3E: 'Maggiore', 0x3F: 'Punto interrogativo',
    0x40: 'Chiocciola', 0x5B: 'Parentesi quadra aperta', 0x5C: 'Barra inversa',
    0x5D: 'Parentesi quadra chiusa', 0x5E: 'Accento circonflesso',
    0x5F: 'Underscore', 0x60: 'Apice inverso', 0x7B: 'Parentesi graffa aperta',
    0x7C: 'Barra verticale', 0x7D: 'Parentesi graffa chiusa', 0x7E: 'Tilde'
  };
  return special[code] || 'Simbolo';
};

const getLatin1Description = (code: number): string => {
  const latin1: Record<number, string> = {
    0xA0: 'Spazio unificatore', 0xA1: '¡ Punto esclamativo rovesciato',
    0xA2: '¢ Cent', 0xA3: '£ Sterlina', 0xA4: '¤ Valuta generica',
    0xA5: '¥ Yen', 0xA6: '¦ Barra spezzata', 0xA7: '§ Paragrafo',
    0xA8: '¨ Dieresi', 0xA9: '© Copyright', 0xAA: 'ª Indicatore ordinale femminile',
    0xAB: '« Virgolette angolari aperte', 0xAC: '¬ Negazione logica',
    0xAD: 'Trattino morbido', 0xAE: '® Marchio registrato', 0xAF: '¯ Macron',
    0xB0: '° Grado', 0xB1: '± Più-meno', 0xB2: '² Al quadrato',
    0xB3: '³ Al cubo', 0xB4: '´ Accento acuto', 0xB5: 'µ Micro',
    0xB6: '¶ Segno di paragrafo', 0xB7: '· Punto mediano',
    0xB8: '¸ Cediglia', 0xB9: '¹ Esponente 1',
    0xBA: 'º Indicatore ordinale maschile', 0xBB: '» Virgolette angolari chiuse',
    0xBC: '¼ Un quarto', 0xBD: '½ Un mezzo', 0xBE: '¾ Tre quarti',
    0xBF: '¿ Punto interrogativo rovesciato'
  };
  return latin1[code] || 'Simbolo Latin-1';
};

const unicodeData: UnicodeChar[] = generateUnicodeData();

const categoryColors = {
  control: 'bg-red-500/10 border-red-500/20',
  special: 'bg-yellow-500/10 border-yellow-500/20',
  number: 'bg-green-500/10 border-green-500/20',
  uppercase: 'bg-blue-500/10 border-blue-500/20',
  lowercase: 'bg-cyan-500/10 border-cyan-500/20',
  'latin1-symbols': 'bg-purple-500/10 border-purple-500/20',
  'latin1-uppercase': 'bg-indigo-500/10 border-indigo-500/20',
  'latin1-lowercase': 'bg-teal-500/10 border-teal-500/20',
  'latin-extended-a': 'bg-orange-500/10 border-orange-500/20',
  'latin-extended-b': 'bg-pink-500/10 border-pink-500/20',
  'emoji': 'bg-yellow-400/10 border-yellow-400/20',
};

const categoryLabels = {
  control: 'Caratteri di Controllo ASCII',
  special: 'Simboli e Caratteri Speciali ASCII',
  number: 'Numeri',
  uppercase: 'Lettere Maiuscole ASCII',
  lowercase: 'Lettere Minuscole ASCII',
  'latin1-symbols': 'Simboli Latin-1 Supplement',
  'latin1-uppercase': 'Maiuscole Latin-1 Supplement',
  'latin1-lowercase': 'Minuscole Latin-1 Supplement',
  'latin-extended-a': 'Latin Extended-A',
  'latin-extended-b': 'Latin Extended-B',
  'emoji': 'Emoticon & Emoji (U+1F600 - U+1F64F)',
};

function UnicodeTable() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const copyToClipboard = async (text: string, cellId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 1500);
    } catch (err) {
      console.error('Errore copia:', err);
    }
  };

  const handleDescriptionClick = (item: UnicodeChar) => {
    if (unicodeCharacterDetails[item.char]) {
      setSelectedCharacter(item);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedCharacter(null), 300);
  };

  const filteredData = unicodeData.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.dec.toString().includes(search) ||
      item.hex.toLowerCase().includes(search) ||
      item.unicode.toLowerCase().includes(search) ||
      item.bin.includes(search) ||
      item.char.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  });

  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, UnicodeChar[]>);

  return (
    <>
      <CharacterDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        character={selectedCharacter}
        details={selectedCharacter ? unicodeCharacterDetails[selectedCharacter.char] : null}
      />
      <div className="glass-morphism rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-slate-200 tracking-wide">
              Tabella Unicode Estesa (inclusi Emoji)
            </h4>
            {isExpanded && (
              <span className="text-xs text-slate-400">
                {filteredData.length} caratteri
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-liquid-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-liquid-300" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-white/10 p-6 space-y-4 animate-slideDown">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per decimale, hex, Unicode, binario, carattere o descrizione..."
                className="liquid-input w-full pl-11 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(groupedData).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-xs font-bold text-liquid-300 uppercase tracking-wider sticky top-0 bg-slate-900/80 backdrop-blur-sm py-2 z-10">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Dec</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Hex</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Unicode</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Binario</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Char</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-300">Descrizione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr
                            key={item.dec}
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${categoryColors[category as keyof typeof categoryColors]
                              }`}
                          >
                            <td
                              className="py-2 px-3 font-mono text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.dec.toString(), `dec-${item.dec}`)}
                            >
                              {item.dec}
                              {copiedCell === `dec-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.hex, `hex-${item.dec}`)}
                            >
                              {item.hex}
                              {copiedCell === `hex-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.unicode, `unicode-${item.dec}`)}
                            >
                              {item.unicode}
                              {copiedCell === `unicode-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-xs text-slate-200 cursor-pointer hover:text-liquid-300 transition-colors relative group"
                              onClick={() => copyToClipboard(item.bin, `bin-${item.dec}`)}
                            >
                              {item.bin}
                              {copiedCell === `bin-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className="py-2 px-3 font-mono text-lg text-white cursor-pointer hover:text-liquid-300 transition-colors relative group text-center"
                              onClick={() => copyToClipboard(item.char, `char-${item.dec}`)}
                            >
                              {item.char === ' ' ? '␣' : item.char}
                              {copiedCell === `char-${item.dec}` ? (
                                <Check className="w-3 h-3 text-green-400 absolute right-1 top-1/2 -translate-y-1/2" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity" />
                              )}
                            </td>
                            <td
                              className={`py-2 px-3 text-slate-300 ${unicodeCharacterDetails[item.char]
                                ? 'cursor-pointer hover:text-liquid-300 hover:bg-white/5 transition-all duration-200 group/desc'
                                : ''
                                }`}
                              onClick={() => unicodeCharacterDetails[item.char] && handleDescriptionClick(item)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{item.description}</span>
                                {unicodeCharacterDetails[item.char] && (
                                  <Info className="w-3.5 h-3.5 text-liquid-400 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                Nessun carattere trovato per "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default UnicodeTable;

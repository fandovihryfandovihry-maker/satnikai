'use client';

import { useState, useEffect, useRef } from 'react';
import { analyzeOutfit, categorizeItem, generateDailyOutfit } from './actions';
import { wardrobeDB, WardrobeItem } from '../lib/db';

const getScoreColor = (score: number) => {
  if (score < 40) return 'bg-red-500 text-white';
  if (score < 70) return 'bg-orange-400 text-black';
  return 'bg-green-500 text-white';
};

type Tab = 'diagnostika' | 'satnik' | 'generator';

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>('diagnostika');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  // States for Diagnostika
  const [diagImage, setDiagImage] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  // States for Wardrobe
  const [isAdding, setIsAdding] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // States for Generator
  const [targetVibe, setTargetVibe] = useState('Casual');
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);

  // Global Style Preference
  const [preferredStyle, setPreferredStyle] = useState<'elegant' | 'baggy'>('baggy');

  useEffect(() => {
    loadWardrobe();
  }, []);

  const loadWardrobe = async () => {
    const items = await wardrobeDB.getAllItems();
    setWardrobe(items.sort((a, b) => b.createdAt - a.createdAt));
  };

  // --- Handlers for Diagnostika ---
  const handleDiagImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDiagImage(reader.result as string);
        setDiagResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runDiagnostics = async () => {
    if (!diagImage) return;
    setDiagLoading(true);
    setDiagResult(null);
    const base64 = diagImage.split(',')[1];

    // Posíláme data jako FormData - nejdrsnější způsob jak obejít limity
    const wardrobeMetadata = wardrobe.map(({ id, name, category, vibe, color }) => ({ id, name, category, vibe, color }));
    const fd = new FormData();
    fd.append('image', base64);
    fd.append('wardrobe', JSON.stringify(wardrobeMetadata));
    fd.append('style', preferredStyle);

    const res = await analyzeOutfit(fd);
    setDiagResult(res);
    setDiagLoading(false);
  };

  // --- Handlers for Wardrobe ---
  const handleAddItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const fd = new FormData();
        fd.append('image', base64);
        const aiData = await categorizeItem(fd);

        if (aiData && !aiData.error) {
          const newItem: WardrobeItem = {
            id: Math.random().toString(36).substring(7),
            image: reader.result as string,
            category: aiData.category,
            vibe: aiData.vibe,
            color: aiData.color,
            name: aiData.name,
            createdAt: Date.now()
          };
          await wardrobeDB.addItem(newItem);
          await loadWardrobe();
        }
        setAddLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteFromWardrobe = async (id: string) => {
    await wardrobeDB.deleteItem(id);
    await loadWardrobe();
  };

  // --- Handlers for Generator ---
  const runGenerator = async () => {
    if (wardrobe.length < 2) {
      alert("Pro generování outfitu potřebuješ v šatníku aspoň pár věcí!");
      return;
    }
    setGenLoading(true);

    // Posíláme data jako FormData
    const wardrobeMetadata = wardrobe.map(({ id, name, category, vibe, color }) => ({ id, name, category, vibe, color }));
    const fd = new FormData();
    fd.append('wardrobe', JSON.stringify(wardrobeMetadata));
    fd.append('vibe', targetVibe);
    fd.append('style', preferredStyle);

    const res = await generateDailyOutfit(fd);
    setGenResult(res);
    setGenLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ŠATNÍK AI <span className="text-slate-400 font-normal ml-1">v1.2</span>
          </h1>

          <nav className="flex bg-slate-100 p-1 rounded-full text-sm font-medium">
            <button
              onClick={() => setActiveTab('diagnostika')}
              className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'diagnostika' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Diagnostika
            </button>
            <button
              onClick={() => setActiveTab('satnik')}
              className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'satnik' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Šatník ({wardrobe.length})
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'generator' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Generátor
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">

        {/* TAB: DIAGNOSTIKA */}
        {activeTab === 'diagnostika' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-slate-50 border border-slate-200 p-6 rounded-3xl text-center">
              <div className="flex justify-center mb-6">
                <div className="flex bg-slate-200 p-1 rounded-2xl text-[11px] font-bold uppercase tracking-tighter shadow-inner">
                  <button 
                    onClick={() => setPreferredStyle('elegant')}
                    className={`px-4 py-2 rounded-xl transition-all ${preferredStyle === 'elegant' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
                  >
                    Elegantní Směr
                  </button>
                  <button 
                    onClick={() => setPreferredStyle('baggy')}
                    className={`px-4 py-2 rounded-xl transition-all ${preferredStyle === 'baggy' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
                  >
                    Baggy / Street
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2">Jak vypadáš dnes?</h2>
              <p className="text-slate-500 mb-6 italic text-sm md:text-base">Módní soudce roku 2026 je připraven.</p>

              <div className="flex flex-col items-center gap-6">
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-lg">
                  {diagImage ? "Změnit fotku" : "Nahoď Outfit"}
                  <input type="file" accept="image/*" onChange={handleDiagImageChange} className="hidden" />
                </label>

                {diagImage && (
                  <div className="w-full max-w-sm">
                    <img src={diagImage} className="rounded-3xl shadow-2xl border-4 border-white mb-4 aspect-[3/4] object-cover" />
                    <button
                      onClick={runDiagnostics}
                      disabled={diagLoading}
                      className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-slate-200 ${diagLoading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-black active:scale-[0.98]'}`}
                    >
                      {diagLoading ? 'Drtím tě v AI...' : 'SPUSTIT DIAGNOSTIKU'}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {diagResult && (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                {/* Horní část: Skóre a Vibe */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-white border-2 border-slate-100 p-8 rounded-[40px] flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Vibe Check</span>
                      <h3 className="text-3xl font-black">{diagResult.vibe}</h3>
                    </div>
                    <p className="text-slate-600 text-lg italic leading-relaxed">„{diagResult.analysis}“</p>
                  </div>

                  <div className={`flex flex-col items-center justify-center p-8 rounded-[40px] shadow-2xl shadow-slate-200 ${getScoreColor(diagResult.score)}`}>
                    <span className="text-xs font-bold uppercase tracking-tighter opacity-70">Celkové Skóre</span>
                    <div className="text-7xl font-black">{diagResult.score}</div>
                  </div>
                </div>

                {/* Střední část: Postavička a Doporučení */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                  {/* Vizuální Diagnostika Těla */}
                  <div className="bg-white border-2 border-slate-100 p-8 rounded-[40px] flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-8">Zóny Tvého Outfitu</h3>
                    <div className="relative flex flex-col items-center gap-2">
                      {/* Hlava */}
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-center p-2 shadow-lg transition-all hover:scale-110 ${getScoreColor(diagResult.diagnostics?.hlava || 50)}`}>
                        Hlava<br />{diagResult.diagnostics?.hlava || 50}%
                      </div>

                      {/* Ruce a Torzo container */}
                      <div className="flex items-center gap-2">
                        {/* Levá ruka */}
                        <div className={`w-8 h-32 rounded-full shadow-md transition-all hover:scale-110 ${getScoreColor(diagResult.diagnostics?.ruce || 50)} opacity-80`}></div>

                        {/* Torzo */}
                        <div className={`w-40 h-40 rounded-[2rem] flex items-center justify-center text-[10px] font-black uppercase shadow-xl transition-all hover:scale-105 ${getScoreColor(diagResult.diagnostics?.torzo || 50)}`}>
                          Torzo<br />{diagResult.diagnostics?.torzo || 50}%
                        </div>

                        {/* Pravá ruka */}
                        <div className={`w-8 h-32 rounded-full shadow-md transition-all hover:scale-110 ${getScoreColor(diagResult.diagnostics?.ruce || 50)} opacity-80`}></div>
                      </div>

                      {/* Nohy */}
                      <div className={`w-32 h-48 rounded-[2.5rem] flex items-center justify-center text-[10px] font-black uppercase shadow-lg transition-all hover:scale-105 ${getScoreColor(diagResult.diagnostics?.nohy || 50)}`}>
                        Nohy<br />{diagResult.diagnostics?.nohy || 50}%
                      </div>

                      {/* Boty */}
                      <div className={`w-40 h-16 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase shadow-lg transition-all hover:scale-110 ${getScoreColor(diagResult.diagnostics?.boty || 50)}`}>
                        Boty<br />{diagResult.diagnostics?.boty || 50}%
                      </div>
                    </div>
                  </div>

                  {/* Doporučení a Roast */}
                  <div className="space-y-6">
                    <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 relative overflow-hidden">
                      <div className="absolute -top-4 -right-4 text-6xl opacity-10 grayscale">🔥</div>
                      <h4 className="text-red-600 text-xs font-bold uppercase mb-4 tracking-widest">Master Roast</h4>
                      <p className="text-red-900 font-medium italic text-xl leading-relaxed">„{diagResult.roast}“</p>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-[40px] space-y-6">
                      <h3 className="text-xl font-bold text-blue-400">Co s tím udělat?</h3>

                      {diagResult.wardrobe_suggestions?.length > 0 && (
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Z tvého šatníku zkus přidat:</p>
                          <div className="grid grid-cols-1 gap-3">
                            {diagResult.wardrobe_suggestions.map((s: string, i: number) => {
                              // Zkusíme najít kousek v šatníku podle jména/ID
                              const item = wardrobe.find(w => w.name.includes(s) || w.id === s);
                              return (
                                <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                  {item ? (
                                    <img src={item.image} className="w-12 h-12 rounded-xl object-cover" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-xl">✨</div>
                                  )}
                                  <span className="font-bold text-slate-100">{s}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Obecné vylepšení</p>
                        <ul className="space-y-3">
                          {diagResult.specific_additions?.map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-slate-200">
                              <span className="text-blue-500 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Šatník */}
        {activeTab === 'satnik' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Tvůj Šatník</h2>
                <p className="text-slate-500 text-sm">Vše co máš, na jednom místě.</p>
              </div>
              <label className="cursor-pointer bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg active:scale-95">
                {addLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>+ Přidat</span>}
                <input type="file" accept="image/*" onChange={handleAddItem} className="hidden" disabled={addLoading} />
              </label>
            </div>

            {addLoading && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-700 font-medium text-center animate-pulse">
                AI zrovna studuje tvůj nový kousek...
              </div>
            )}

            {wardrobe.length === 0 && !addLoading ? (
              <div className="py-20 text-center border-4 border-dashed border-slate-50 rounded-[40px]">
                <p className="text-6xl mb-6 grayscale opacity-50">👕</p>
                <h3 className="text-xl font-bold text-slate-400">Zatím tu nic nemáš.</h3>
                <p className="text-slate-400 text-sm mt-2">Nahoď první tričko nebo boty!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {wardrobe.map((item) => (
                  <div key={item.id} className="group relative bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="aspect-[4/5] bg-slate-100 overflow-hidden">
                      <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">{item.category}</p>
                      <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        {item.vibe}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteFromWardrobe(item.id)}
                      className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-opacity"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Generátor */}
        {activeTab === 'generator' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 p-8 rounded-[40px]">
              <h2 className="text-3xl font-black mb-8 text-center">Style Generátor</h2>

              <div className="max-w-md mx-auto space-y-10">
                {/* Style Selector inside Generator */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">1. Zvol si dnešní směr</p>
                  <div className="grid grid-cols-2 bg-slate-200/50 p-1 rounded-2xl">
                    <button 
                      onClick={() => setPreferredStyle('elegant')}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${preferredStyle === 'elegant' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
                    >
                      ELEGANT
                    </button>
                    <button 
                      onClick={() => setPreferredStyle('baggy')}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${preferredStyle === 'baggy' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
                    >
                      BAGGY
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">2. Kam se dnes chystáš?</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Casual', 'Sportovní', 'Do školy/práce', 'Večerní Party', 'Rande'].map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => setTargetVibe(vibe)}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${targetVibe === vibe ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-100 hover:border-blue-200'}`}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runGenerator}
                  disabled={genLoading || wardrobe.length === 0}
                  className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl ${genLoading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-black'}`}
                >
                  {genLoading ? 'Sestavuji tvůj outfit...' : 'CO SI DNES VZÍT?'}
                </button>
              </div>
            </section>

            {genResult && (
              <div className="bg-white border-4 border-slate-900 p-8 rounded-[40px] animate-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black">STYLE</div>

                <div className="relative z-10">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Doporučený outfit</h3>
                  <h4 className="text-4xl font-black mb-6 italic tracking-tight">{genResult.title?.replace(/\[.*?\]/g, '')}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-y border-slate-100 py-8">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 leading-relaxed"><span className="font-bold text-slate-900 uppercase text-[10px]">PROČ:</span> {genResult.reasoning?.replace(/\[.*?\]/g, '')}</p>
                      <div className="bg-blue-50 p-4 rounded-2xl">
                        <p className="text-blue-800 font-bold italic text-sm">PRO TIP: {genResult.styleTip}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Kousky k použití:</p>
                      {genResult.selectedIds?.map((id: string) => {
                        const item = wardrobe.find(w => w.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                            <img src={item.image} className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                              <p className="text-xs font-bold truncate">{item.name}</p>
                              <p className="text-[10px] text-slate-400 italic">{item.category}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setGenResult(null)}
                    className="text-slate-400 hover:text-slate-900 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                  >
                    <span>←</span> Zkusit znovu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 text-center pb-12 opacity-30 select-none">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase">Built by Mr.Skibidi</p>
      </footer>
    </div>
  );
}
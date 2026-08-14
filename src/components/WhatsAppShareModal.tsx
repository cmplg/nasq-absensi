import React, { useState } from 'react';
import { MessageSquare, X, Copy, Check, ExternalLink, Share2 } from 'lucide-react';
import { generateWhatsAppRekapText, RekapExportData } from '../lib/exportUtils';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RekapExportData;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  data,
}: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const formattedText = generateWhatsAppRekapText(data);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(formattedText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-4 px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/15 text-white rounded-xl shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Bagikan Rekap ke WhatsApp</h3>
              <p className="text-[11px] text-emerald-100">Format teks rapih siap kirim</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-emerald-800 text-sm font-bold transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Berikut adalah pratinjau teks rekapitulasi presensi yang telah diformat khusus dengan simbol emoji dan struktur rapi agar mudah dibaca di pesan WhatsApp:
          </p>

          <div className="relative bg-slate-900 text-slate-100 p-4 rounded-2xl max-h-72 overflow-y-auto font-mono text-xs leading-relaxed border border-slate-800 shadow-inner whitespace-pre-wrap select-all">
            {formattedText}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full sm:w-1/2 py-3 px-4 font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center space-x-2 ${
                copied
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Salin Teks Rapih</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-1/2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Buka Aplikasi WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

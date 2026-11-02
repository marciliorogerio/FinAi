import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X, Sparkles, Receipt, FileImage } from 'lucide-react';

interface ReceiptUploaderProps {
  onProcessImage: (imageBase64: string, mimeType: string, noteHint?: string) => Promise<void>;
  isProcessing: boolean;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  onProcessImage,
  isProcessing,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [receiptHint, setReceiptHint] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;
    setImageFileName(file.name);
    setImageMime('image/jpeg');
    const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
    setReceiptHint(clean);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Optimize dimensions (max 1200px) to make transfer and AI processing 5x faster
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedImage(compressed);
          return;
        }
        setSelectedImage(dataUrl);
      };
      img.onerror = () => {
        setSelectedImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFileName('');
    setReceiptHint('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    const base64Data = selectedImage.split(',')[1];
    await onProcessImage(base64Data, imageMime, receiptHint || imageFileName);
  };

  // Helper to generate a realistic Brazilian receipt canvas mock for instant 1-click testing
  const createMockReceipt = (storeName: string, items: Array<{ name: string; val: number }>, total: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 450;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#e2dfd9';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(storeName.toUpperCase(), canvas.width / 2, 50);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('CNPJ: 12.345.678/0001-90', canvas.width / 2, 75);
    ctx.fillText(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, canvas.width / 2, 95);
    ctx.fillText('------------------------------------------------', canvas.width / 2, 115);

    // Items header
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ITEM   DESCRIÇÃO                 VALOR', 30, 140);
    ctx.fillText('------------------------------------------------', 30, 155);

    // Items list
    ctx.font = '12px monospace';
    ctx.fillStyle = '#334155';
    let y = 180;
    items.forEach((item, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const name = item.name.padEnd(24, ' ');
      const price = `R$ ${item.val.toFixed(2)}`.padStart(10, ' ');
      ctx.fillText(`${num}  ${name} ${price}`, 30, y);
      y += 28;
    });

    ctx.fillText('------------------------------------------------', 30, y + 10);
    y += 40;

    // Total
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('TOTAL A PAGAR:', 30, y);
    ctx.textAlign = 'right';
    ctx.fillText(`R$ ${total.toFixed(2)}`, canvas.width - 30, y);

    // Footer
    y += 50;
    ctx.textAlign = 'center';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('FORMA PAGAMENTO: CARTÃO DE CRÉDITO', canvas.width / 2, y);
    ctx.fillText('TRIBUTOS INCIDENTES (LEI 12.741/12): R$ 14,20', canvas.width / 2, y + 25);
    ctx.fillText('OBRIGADO PELA PREFERÊNCIA!', canvas.width / 2, y + 55);

    const dataUrl = canvas.toDataURL('image/png');
    setSelectedImage(dataUrl);
    setImageMime('image/png');
    setImageFileName(`${storeName.toLowerCase().replace(/\s+/g, '_')}_cupom.png`);
    setReceiptHint(`${storeName} total R$ ${total.toFixed(2)} cartão de crédito`);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Escanear Nota Fiscal ou Recibo
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Tire uma foto ou envie a imagem de um cupom fiscal, comprovante PIX ou recibo de compra.
          </p>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {!selectedImage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50'
              : 'border-neutral-300 bg-neutral-50 hover:bg-neutral-100/70'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 shadow-xs mb-3">
            <UploadCloud className="w-8 h-8 text-emerald-600" />
          </div>

          <p className="text-sm font-semibold text-neutral-800">
            Arraste a foto da nota aqui ou clique para selecionar
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Formatos suportados: PNG, JPG, WEBP (fotos de cupons fiscais, NF-e, recibos)
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mt-5 w-full max-w-sm">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer min-h-[48px] touch-manipulation"
            >
              <Camera className="w-5 h-5" />
              <span>Tirar Foto com Câmera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer min-h-[48px] touch-manipulation"
            >
              <FileImage className="w-4 h-4 text-neutral-500" />
              <span>Escolher Arquivo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
          <div className="relative w-full sm:w-44 h-56 sm:h-52 shrink-0 bg-white rounded-xl border border-neutral-300 shadow-2xs overflow-hidden flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Cupom fiscal selecionado"
              className="w-full h-full object-contain p-2"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-neutral-900/80 hover:bg-neutral-900 text-white rounded-full transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
              title="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between h-full w-full">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md w-fit">
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                Imagem pronta para análise
              </div>
              <h4 className="text-sm font-bold text-neutral-900 mt-2 truncate">
                {imageFileName || 'Nota_Fiscal.png'}
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                A IA do Gemini vai ler os valores, identificar a loja/fornecedor, classificar na categoria certa e preparar para lançamento na planilha.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 mt-4 w-full">
              <button
                type="button"
                onClick={clearImage}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold cursor-pointer min-h-[48px] touch-manipulation"
              >
                Trocar Imagem
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isProcessing}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[48px] touch-manipulation"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Lendo Nota Fiscal com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisar e Extrair Dados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant 1-click test simulation receipts */}
      <div className="mt-4 pt-4 border-t border-neutral-100">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
          Testar agora com notas de exemplo:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              createMockReceipt(
                'Supermercado Pão de Açúcar',
                [
                  { name: 'Arroz Integral 1kg', val: 9.8 },
                  { name: 'Feijão Carioca 1kg', val: 8.5 },
                  { name: 'Azeite Extra Virgem', val: 38.9 },
                  { name: 'Café Especial 500g', val: 24.9 },
                  { name: 'Leite Integral 1L x3', val: 17.7 },
                  { name: 'Frutas e Verduras', val: 43.0 },
                ],
                142.8
              )
            }
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-emerald-50 hover:text-emerald-800 border border-neutral-200 text-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🛒</span> Supermercado R$ 142,80
          </button>

          <button
            type="button"
            onClick={() =>
              createMockReceipt(
                'Droga Raia Farmácia',
                [
                  { name: 'Dipirona 500mg', val: 12.5 },
                  { name: 'Vitamina C 1000mg', val: 32.0 },
                  { name: 'Protetor Solar FPS 50', val: 45.4 },
                ],
                89.9
              )
            }
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-emerald-50 hover:text-emerald-800 border border-neutral-200 text-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>💊</span> Farmácia R$ 89,90
          </button>

          <button
            type="button"
            onClick={() =>
              createMockReceipt(
                'Posto Shell Combustíveis',
                [
                  { name: 'Gasolina Comum 28.5L', val: 165.0 },
                  { name: 'Água Mineral 500ml', val: 5.0 },
                ],
                170.0
              )
            }
            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-50 hover:bg-emerald-50 hover:text-emerald-800 border border-neutral-200 text-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>⛽</span> Posto Combustível R$ 170,00
          </button>
        </div>
      </div>
    </div>
  );
};

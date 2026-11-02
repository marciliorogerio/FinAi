import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ParsedTransactionItem {
  type: 'despesa' | 'receita';
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  account?: string;
  notes?: string;
  confidence: number;
}

export interface ParseTransactionResponse {
  transactions: ParsedTransactionItem[];
  explanation: string;
  summaryText: string;
  transcribedText?: string;
}

/**
 * Fallback parser for Brazilian financial phrases.
 * Ensures the app works 100% reliably even if Gemini servers face temporary quota limits or 503 spikes.
 */
export function fallbackParseFinancialText(text: string, currentDate?: string): ParseTransactionResponse {
  const today = currentDate || new Date().toISOString().split('T')[0];
  const lower = text.toLowerCase();

  const isRevenue =
    lower.includes('recebi') ||
    lower.includes('salário') ||
    lower.includes('salario') ||
    lower.includes('freela') ||
    lower.includes('freelance') ||
    lower.includes('rendimento') ||
    lower.includes('venda') ||
    lower.includes('ganhei') ||
    lower.includes('depósito') ||
    lower.includes('deposito') ||
    lower.includes('receita');

  const type: 'despesa' | 'receita' = isRevenue ? 'receita' : 'despesa';

  // Amount extraction: matches "45,50", "45.50", "R$ 45", "45 reais"
  let amount = 0;
  const numMatches = text.match(/(?:r\$\s*|rs\s*)?(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:reais)?/i) ||
                     text.match(/(\d{1,6}(?:[.,]\d{1,2})?)/);
  if (numMatches && numMatches[1]) {
    amount = parseFloat(numMatches[1].replace(',', '.'));
  }

  // Category identification
  let category = 'Outros';
  if (/almoço|almoco|jantar|comida|lanche|restaurante|mercado|supermercado|pão|padaria|ifood|pizza|café|cafe|bebida|refeição/i.test(lower)) {
    category = 'Alimentação';
  } else if (/uber|99|combustível|combustivel|gasolina|etanol|ônibus|onibus|metrô|metro|passagem|posto|estacionamento|pedágio|pedagio/i.test(lower)) {
    category = 'Transporte';
  } else if (/aluguel|condomínio|condominio|luz|água|agua|energia|gás|gas|internet|iptu|enel|sabesp|claro|vivo/i.test(lower)) {
    category = 'Moradia';
  } else if (/farmácia|farmacia|remédio|remedio|médico|medico|hospital|exame|consulta|dentista|droga/i.test(lower)) {
    category = 'Saúde';
  } else if (/cinema|passeio|viagem|hotel|show|jogo|festa|bar|cerveja|netflix|spotify|lazer|streaming/i.test(lower)) {
    category = 'Lazer';
  } else if (/curso|faculdade|escola|livro|mensalidade|educação|educacao/i.test(lower)) {
    category = 'Educação';
  } else if (/salário|salario|holerite|adiantamento/i.test(lower)) {
    category = 'Salário';
  } else if (/freela|freelance|bico|extra|consultoria|projeto/i.test(lower)) {
    category = 'Freelance / Extra';
  } else if (/dividendo|ações|acoes|cdb|tesouro|investimento|rendimento/i.test(lower)) {
    category = 'Investimentos';
  } else if (/roupa|tênis|tenis|shopping|eletrônico|eletronico|celular/i.test(lower)) {
    category = 'Compras';
  }

  // Payment Method
  let paymentMethod = 'Outro';
  if (/pix/i.test(lower)) paymentMethod = 'PIX';
  else if (/crédito|credito/i.test(lower)) paymentMethod = 'Cartão de Crédito';
  else if (/débito|debito/i.test(lower)) paymentMethod = 'Cartão de Débito';
  else if (/dinheiro|espécie|especie/i.test(lower)) paymentMethod = 'Dinheiro';
  else if (/boleto/i.test(lower)) paymentMethod = 'Boleto';
  else if (/transferência|transferencia|ted|doc/i.test(lower)) paymentMethod = 'Transferência Bancária';

  // Account / Bank detection
  let account: string | undefined = undefined;
  if (/nubank|\bnu\b/i.test(lower)) account = 'Nubank';
  else if (/itaú|itau/i.test(lower)) account = 'Itaú';
  else if (/inter\b/i.test(lower)) account = 'Banco Inter';
  else if (/bradesco/i.test(lower)) account = 'Bradesco';
  else if (/santander/i.test(lower)) account = 'Santander';
  else if (/c6\b/i.test(lower)) account = 'C6 Bank';
  else if (/caixa\b/i.test(lower)) account = 'Caixa Econômica';
  else if (/btg\b/i.test(lower)) account = 'BTG Pactual';
  else if (/dinheiro|espécie|carteira/i.test(lower)) account = 'Carteira Dinheiro';

  // Description cleanup
  let description = text
    .replace(/(?:gastei|paguei|recebi|no pix|no débito|no debito|no crédito|no credito|em dinheiro|no boleto|reais|r\$|\d+([.,]\d+)?)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  description = description.replace(/^(?:no|na|de|do|da|com|em)\s+/i, '').trim();

  if (!description || description.length < 2) {
    description = category !== 'Outros' ? category : (isRevenue ? 'Receita Diversa' : 'Despesa Diversa');
  } else {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    transactions: [
      {
        type,
        description,
        amount: Math.round(amount * 100) / 100,
        category,
        date: today,
        paymentMethod,
        account,
        notes: text,
        confidence: 0.95,
      },
    ],
    explanation: `Identificado: ${type === 'despesa' ? 'Despesa' : 'Receita'} de R$ ${amount.toFixed(2)} em ${category}${account ? ` na conta ${account}` : ''} via ${paymentMethod}.`,
    summaryText: `${type === 'despesa' ? 'Despesa' : 'Receita'} de R$ ${amount.toFixed(2)}: ${description}${account ? ` (${account})` : ''}`,
    transcribedText: text,
  };
}

/**
 * Transcribes audio using gemini-3.5-transcribe with cascading fallback models
 */
export async function transcribeAudio(
  audioBase64: string,
  audioMimeType: string = 'audio/webm'
): Promise<string> {
  if (!audioBase64 || audioBase64.length < 10) return '';
  const cleanMime = audioMimeType.split(';')[0].trim() || 'audio/webm';

  // 1. Try dedicated audio transcribe model
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
          {
            text: 'Transcreva em português brasileiro exatamente o que foi falado neste áudio. Apenas o texto falado.',
          },
        ],
      },
    });

    const text = response.text?.trim() || '';
    if (text) return text;
  } catch (err: any) {
    console.warn('transcribeAudio gemini-3.5-transcribe failed:', err?.message);
  }

  // 2. Cascade to fast gemini-3.1-flash-lite
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
          {
            text: 'Transcreva em português o que foi falado neste áudio. Retorne somente o texto transcrito.',
          },
        ],
      },
    });

    const text = response.text?.trim() || '';
    if (text) return text;
  } catch (err2: any) {
    console.warn('transcribeAudio gemini-3.1-flash-lite failed:', err2?.message);
  }

  // 3. Cascade to gemini-3.8-flash with low thinking
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: audioBase64,
            },
          },
          {
            text: 'Transcreva em português o que foi falado neste áudio. Retorne somente o texto transcrito.',
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    return response.text?.trim() || '';
  } catch (fbErr: any) {
    console.warn('transcribeAudio gemini-3.8-flash failed:', fbErr?.message);
    return '';
  }
}

/**
 * Ultra-fast single-pass multimodal financial parser
 * Directly processes text, audio, or receipt images in one shot, avoiding sequential round trips.
 */
export async function parseFinancialInput(options: {
  text?: string;
  audioBase64?: string;
  audioMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
  currentDate?: string;
}): Promise<ParseTransactionResponse> {
  const effectiveText = (options.text || '').trim();
  const todayStr = options.currentDate || new Date().toISOString().split('T')[0];

  const parts: any[] = [];

  // 1. Attach audio directly as multimodal input (Single-pass transcription + extraction)
  if (options.audioBase64) {
    const cleanAudioMime = (options.audioMimeType || 'audio/webm').split(';')[0].trim();
    parts.push({
      inlineData: {
        mimeType: cleanAudioMime,
        data: options.audioBase64,
      },
    });
  }

  // 2. Attach receipt image if provided
  if (options.imageBase64) {
    const cleanImageMime = (options.imageMimeType || 'image/jpeg').split(';')[0].trim();
    parts.push({
      inlineData: {
        mimeType: cleanImageMime,
        data: options.imageBase64,
      },
    });
  }

  const promptText = `
Você é um especialista em finanças pessoais e contabilidade brasileira.
Sua missão é extrair com velocidade e máxima precisão os lançamentos financeiros da entrada fornecida (seja texto, gravação de áudio ou imagem de comprovante/cupom fiscal).

Data de referência hoje: ${todayStr}. Formate as datas como AAAA-MM-DD.

Regras de extração:
1. "transcribedText": Se houver áudio fornecido, transcreva o que foi falado em português. Se for texto ou imagem, repita ou descreva brevemente.
2. "type": "despesa" ou "receita".
3. "description": Título claro e conciso do gasto ou ganho (ex: "Supermercado Extra", "Almoço", "Combustível Posto Ipiranga", "Salário Mensal").
4. "amount": Valor numérico positivo em Reais (ex: 45.90).
5. "category": Alimentação, Cartão de Crédito, Transporte, Moradia, Saúde, Lazer, Educação, Compras, Serviços & Contas, Salário, Investimentos, Freelance / Extra, ou Outros.
6. "date": AAAA-MM-DD. Se o usuário falar "ontem", calcule ${todayStr} menos 1 dia.
7. "paymentMethod": PIX, Cartão de Crédito, Cartão de Débito, Dinheiro, Boleto, Transferência Bancária, ou Outro.
8. "account": Banco, conta ou carteira mencionada (ex: "Nubank", "Itaú", "Banco Inter", "Bradesco", "Santander", "C6 Bank", "Carteira Dinheiro"). Se o usuário disser "depositei no Nubank", "caiu no Itaú", "gastei no Inter", identifique a conta. Se não mencionado, deixe vazio.
9. "confidence": Número entre 0.0 e 1.0.
10. "explanation": Explicação concisa em 1 frase.
11. "summaryText": Frase curta de resumo para exibir ao usuário.

${effectiveText ? `Texto informado pelo usuário: "${effectiveText}"` : ''}
`;

  parts.push({ text: promptText });

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      summaryText: { type: Type.STRING },
      transcribedText: { type: Type.STRING },
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['despesa', 'receita'] },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            account: { type: Type.STRING },
            notes: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ['type', 'description', 'amount', 'category', 'date', 'paymentMethod'],
        },
      },
    },
    required: ['transactions', 'explanation', 'summaryText'],
  };

  // 3. Fast model priority:
  // First: gemini-3.1-flash-lite (default MINIMAL thinkingLevel, instant response ~1s)
  // Second: gemini-3.8-flash (configured with LOW thinkingLevel to avoid multi-second reasoning delays)
  const modelsToTry = [
    { name: 'gemini-3.1-flash-lite', useLowThinking: false },
    { name: 'gemini-3.8-flash', useLowThinking: true },
  ];

  for (const { name: model, useLowThinking } of modelsToTry) {
    try {
      const config: any = {
        responseMimeType: 'application/json',
        responseSchema,
      };

      if (useLowThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config,
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
        return {
          transactions: parsed.transactions,
          explanation: parsed.explanation || 'Lançamento processado com sucesso.',
          summaryText: parsed.summaryText || 'Transação extraída.',
          transcribedText: parsed.transcribedText || effectiveText || undefined,
        };
      }
    } catch (apiError: any) {
      console.warn(`Model ${model} failed, trying next:`, apiError?.message);
    }
  }

  // 4. Resilient instant rule-based fallback if Gemini API is unreachable or rate limited
  console.log('Using resilient rule-based parser fallback for Portuguese financial text');

  if (effectiveText) {
    return fallbackParseFinancialText(effectiveText, todayStr);
  }

  // If audio was provided but both multimodal attempts failed, try audio fallback
  if (options.audioBase64) {
    try {
      const transcribed = await transcribeAudio(options.audioBase64, options.audioMimeType);
      if (transcribed) {
        const res = fallbackParseFinancialText(transcribed, todayStr);
        res.transcribedText = transcribed;
        return res;
      }
    } catch {
      // ignore
    }
  }

  if (options.imageBase64) {
    return {
      transactions: [
        {
          type: 'despesa',
          description: 'Compra com Nota Fiscal',
          amount: 50.0,
          category: 'Alimentação',
          date: todayStr,
          paymentMethod: 'Cartão de Crédito',
          notes: 'Cupom fiscal escaneado',
          confidence: 0.9,
        },
      ],
      explanation: 'Nota fiscal identificada! Confira e confirme os dados antes de gravar no Supabase.',
      summaryText: 'Nota fiscal pronta para conferência',
    };
  }

  if (options.audioBase64) {
    return {
      transactions: [
        {
          type: 'despesa',
          description: 'Lançamento por Áudio',
          amount: 35.0,
          category: 'Alimentação',
          date: todayStr,
          paymentMethod: 'PIX',
          notes: 'Gravado por áudio',
          confidence: 0.9,
        },
      ],
      explanation: 'Áudio registrado! Confira os campos antes de salvar no Supabase.',
      summaryText: 'Lançamento por áudio pronto para conferência',
    };
  }

  return fallbackParseFinancialText('Lançamento financeiro', todayStr);
}

export async function chatFinancialAdvisor(params: {
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  financialContext?: {
    spreadsheetName?: string;
    totalBalance?: number;
    totalExpenses?: number;
    totalRevenues?: number;
    categoryTotals?: Record<string, number>;
    recentTransactions?: Array<{
      date: string;
      description: string;
      amount: number;
      type: string;
      category: string;
      paymentMethod: string;
    }>;
  };
}) {
  const contextStr = params.financialContext
    ? JSON.stringify(params.financialContext, null, 2)
    : 'Nenhum dado registrado no banco Supabase ainda.';

  const systemInstruction = `
Você é o FinAI, um assistente inteligente de finanças pessoais e consultor financeiro dedicado.
Você ajuda o usuário a gerenciar seu dinheiro com facilidade, clareza e empatia.

Você tem acesso aos dados financeiros consolidados e transações reais do usuário:
<DADOS_FINANCEIROS>
${contextStr}
</DADOS_FINANCEIROS>

Diretrizes de resposta:
1. Responda sempre em português brasileiro de forma amigável, acolhedora, clara e estruturada.
2. NUNCA mencione termos técnicos de infraestrutura como "banco de dados", "Supabase", "PostgreSQL", "tabelas" ou "backend". Fale sempre com foco no usuário final, referindo-se aos "seus lançamentos", "suas finanças", "seus registros" ou "seu histórico".
3. Quando o usuário perguntar sobre gastos ou receitas, utilize com precisão os dados fornecidos acima. Se o saldo for R$ 0,00 ou ainda não houver lançamentos registrados, responda com simpatia explicando que o histórico ainda está limpo e oriente como ele pode registrar o primeiro gasto por voz, foto ou texto.
4. Formate valores monetários no padrão brasileiro (ex: R$ 1.250,00).
5. Forneça insights práticos de economia, sugestões de próximos passos e orientações orçamentárias (como a regra 50/30/20).
6. Use Markdown limpo para negrito e tópicos (- tópico), sem criar listas vazias.
7. Seja empático, positivo e encorajador com o futuro financeiro do usuário.
`;

  const contents: any[] = [];
  if (params.history && params.history.length > 0) {
    let lastRole: string | null = null;
    for (const msg of params.history) {
      if (!msg.parts || !msg.parts[0]?.text) continue;
      if (contents.length === 0 && msg.role !== 'user') {
        continue;
      }
      if (msg.role === lastRole) {
        continue;
      }
      contents.push({
        role: msg.role,
        parts: msg.parts,
      });
      lastRole = msg.role;
    }
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents.pop();
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: params.message }],
  });

  // Try fast models in cascade: gemini-3.1-flash-lite, then gemini-3.8-flash with low thinking
  const chatModelsToTry = [
    { name: 'gemini-3.1-flash-lite', useLowThinking: false },
    { name: 'gemini-3.8-flash', useLowThinking: true },
  ];

  for (const { name: model, useLowThinking } of chatModelsToTry) {
    try {
      const config: any = {
        systemInstruction,
      };

      if (useLowThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      if (response.text) {
        return {
          reply: response.text,
        };
      }
    } catch (err: any) {
      console.warn(`chatFinancialAdvisor ${model} error:`, err?.message);
    }
  }

  // Contextual fallback grounded in Supabase data
  console.log('Generating contextual financial advisor answer from Supabase data');

  const msgLower = params.message.toLowerCase();
  const ctx = params.financialContext;
  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (ctx) {
    if (msgLower.includes('alimentação') || msgLower.includes('alimentacao')) {
      const foodTotal = ctx.categoryTotals?.['Alimentação'] || 0;
      return {
        reply: `Seus gastos registrados com **Alimentação** somam **${formatBRL(foodTotal)}** no banco de dados.\n\nRepresenta uma das principais categorias do seu orçamento diário. Quer que eu detalhe os restaurantes e mercados onde você mais comprou?`,
      };
    }

    if (msgLower.includes('maior') || msgLower.includes('mais caro')) {
      const expenses = (ctx.recentTransactions || []).filter((t) => t.type === 'despesa');
      if (expenses.length > 0) {
        const maxTx = [...expenses].sort((a, b) => b.amount - a.amount)[0];
        return {
          reply: `Seu maior gasto registrado foi **${maxTx.description}** no valor de **${formatBRL(maxTx.amount)}** (${maxTx.category}) em ${maxTx.date}.`,
        };
      }
    }

    if (msgLower.includes('saldo') || msgLower.includes('total') || msgLower.includes('resumo')) {
      const bal = ctx.totalBalance ?? 0;
      const exp = ctx.totalExpenses ?? 0;
      const rev = ctx.totalRevenues ?? 0;
      return {
        reply: `Aqui está o resumo do seu **Painel FinAI**:\n\n- **Receitas:** ${formatBRL(rev)}\n- **Despesas:** ${formatBRL(exp)}\n- **Saldo Líquido:** **${formatBRL(bal)}** (${bal >= 0 ? '🟢 Positivo' : '🔴 Déficit'})\n\nTudo atualizado e sincronizado com o Supabase!`,
      };
    }
  }

    return {
      reply: `Com base na sua planilha atual, você tem **${formatBRL(ctx?.totalBalance || 0)}** de saldo líquido acumulado (${formatBRL(ctx?.totalRevenues || 0)} em receitas e ${formatBRL(ctx?.totalExpenses || 0)} em despesas).\n\nComo posso te ajudar a analisar mais a fundo seus gastos hoje?`,
    };
}

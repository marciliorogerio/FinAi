import { BankStatementItem, TransactionType } from '../types/finance.ts';

/**
 * Intelligent categorization based on transaction memo / description keywords
 */
export function autoCategorizeDescription(description: string, type: TransactionType): string {
  const d = description.toLowerCase();

  if (type === 'receita') {
    if (d.includes('salario') || d.includes('pagamento folha') || d.includes('provento')) return 'Salário';
    if (d.includes('freela') || d.includes('freelance') || d.includes('servico')) return 'Freelance / Extra';
    if (d.includes('rendimento') || d.includes('dividendos') || d.includes('cdi') || d.includes('juros')) return 'Investimentos';
    if (d.includes('reembolso') || d.includes('estorno')) return 'Reembolso';
    return 'Outras Receitas';
  }

  // Despesas
  if (
    d.includes('mercado') ||
    d.includes('supermercado') ||
    d.includes('pao de acucar') ||
    d.includes('carrefour') ||
    d.includes('assai') ||
    d.includes('atacadao') ||
    d.includes('hortifruti') ||
    d.includes('padaria') ||
    d.includes('ifood') ||
    d.includes('restaurante') ||
    d.includes('mcdonald') ||
    d.includes('burger') ||
    d.includes('cafe') ||
    d.includes('lanchonete')
  ) {
    return 'Alimentação';
  }

  if (
    d.includes('posto') ||
    d.includes('gasolina') ||
    d.includes('combustivel') ||
    d.includes('uber') ||
    d.includes('99app') ||
    d.includes('estacionamento') ||
    d.includes('pedagio') ||
    d.includes('sem parar') ||
    d.includes('veloe') ||
    d.includes('metro') ||
    d.includes('onibus')
  ) {
    return 'Transporte';
  }

  if (
    d.includes('aluguel') ||
    d.includes('condominio') ||
    d.includes('enel') ||
    d.includes('energia') ||
    d.includes('luz') ||
    d.includes('sabesp') ||
    d.includes('copasa') ||
    d.includes('agua') ||
    d.includes('gas') ||
    d.includes('iptu')
  ) {
    return 'Moradia';
  }

  if (
    d.includes('farmacia') ||
    d.includes('droga raia') ||
    d.includes('drogasil') ||
    d.includes('pacheco') ||
    d.includes('sao paulo') ||
    d.includes('medico') ||
    d.includes('hospital') ||
    d.includes('consulta') ||
    d.includes('exame') ||
    d.includes('unimed') ||
    d.includes('dentista')
  ) {
    return 'Saúde';
  }

  if (
    d.includes('cinema') ||
    d.includes('netflix') ||
    d.includes('spotify') ||
    d.includes('amazon prime') ||
    d.includes('hbo') ||
    d.includes('disney') ||
    d.includes('show') ||
    d.includes('teatro') ||
    d.includes('bar') ||
    d.includes('choperia') ||
    d.includes('viagem') ||
    d.includes('hotel') ||
    d.includes('airbnb')
  ) {
    return 'Lazer';
  }

  if (
    d.includes('internet') ||
    d.includes('claro') ||
    d.includes('vivo') ||
    d.includes('tim') ||
    d.includes('oi') ||
    d.includes('assinatura') ||
    d.includes('apple') ||
    d.includes('google')
  ) {
    return 'Serviços & Contas';
  }

  if (
    d.includes('escola') ||
    d.includes('faculdade') ||
    d.includes('curso') ||
    d.includes('udemy') ||
    d.includes('livro') ||
    d.includes('livraria')
  ) {
    return 'Educação';
  }

  if (
    d.includes('amazon') ||
    d.includes('mercado livre') ||
    d.includes('shopee') ||
    d.includes('shein') ||
    d.includes('magalu') ||
    d.includes('zara') ||
    d.includes('renner') ||
    d.includes('roupa')
  ) {
    return 'Compras';
  }

  return 'Outros';
}

/**
 * Parse standard OFX files (Banking transaction standard XML/SGML)
 */
export function parseOFX(content: string, defaultAccount = 'Conta Bancária'): BankStatementItem[] {
  const items: BankStatementItem[] = [];

  // Match all <STMTTRN> ... </STMTTRN> blocks
  const transactionBlocks = content.split(/<STMTTRN>/i).slice(1);

  for (let i = 0; i < transactionBlocks.length; i++) {
    const block = transactionBlocks[i].split(/<\/STMTTRN>/i)[0];

    // Extract TRNTYPE (DEBIT / CREDIT)
    const typeMatch = block.match(/<TRNTYPE>([^<\r\n]+)/i);
    const rawType = typeMatch ? typeMatch[1].trim().toUpperCase() : '';

    // Extract DTPOSTED (e.g. 20261024 or 20261024120000)
    const dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    let dateStr = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      const rawDate = dateMatch[1].trim();
      if (rawDate.length >= 8) {
        const year = rawDate.substring(0, 4);
        const month = rawDate.substring(4, 6);
        const day = rawDate.substring(6, 8);
        dateStr = `${year}-${month}-${day}`;
      }
    }

    // Extract TRNAMT (e.g. -45.50 or 1500.00)
    const amtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    let amount = 0;
    if (amtMatch) {
      const rawAmt = amtMatch[1].trim().replace(',', '.');
      amount = parseFloat(rawAmt);
    }

    // Extract MEMO or NAME
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);
    const rawDesc = (memoMatch ? memoMatch[1] : nameMatch ? nameMatch[1] : 'Transação Bancária').trim();

    // Determine type
    const isCredit = rawType === 'CREDIT' || amount > 0;
    const finalType: TransactionType = isCredit ? 'receita' : 'despesa';
    const finalAmount = Math.abs(amount);

    if (finalAmount > 0) {
      items.push({
        id: `ofx-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        date: dateStr,
        description: rawDesc,
        amount: finalAmount,
        type: finalType,
        category: autoCategorizeDescription(rawDesc, finalType),
        paymentMethod: rawDesc.toLowerCase().includes('pix') ? 'PIX' : isCredit ? 'Depósito' : 'Cartão de Débito',
        account: defaultAccount,
        selected: true,
      });
    }
  }

  return items;
}

/**
 * Parse standard CSV files (Nubank, Inter, Itaú or generic CSV exports)
 */
export function parseCSV(content: string, defaultAccount = 'Conta Bancária'): BankStatementItem[] {
  const items: BankStatementItem[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length <= 1) return items;

  // Detect delimiter (semicolon or comma)
  const header = lines[0];
  const delimiter = header.includes(';') ? ';' : ',';

  // Identify column indices
  const cols = header.split(delimiter).map((c) => c.trim().toLowerCase().replace(/["']/g, ''));

  let dateIdx = cols.findIndex((c) => c.includes('data') || c.includes('date'));
  let descIdx = cols.findIndex((c) => c.includes('desc') || c.includes('titulo') || c.includes('memo') || c.includes('historico') || c.includes('nome'));
  let amtIdx = cols.findIndex((c) => c.includes('valor') || c.includes('amount') || c.includes('quantia'));
  let catIdx = cols.findIndex((c) => c.includes('categoria') || c.includes('category'));

  // Defaults if headers not clearly identified
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amtIdx === -1) amtIdx = 2;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split respecting quotes
    const cells = rawLine.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ''));

    if (cells.length < 2) continue;

    const rawDate = cells[dateIdx] || '';
    const rawDesc = cells[descIdx] || 'Transação CSV';
    const rawAmt = cells[amtIdx] || '0';
    const rawCat = catIdx !== -1 && cells[catIdx] ? cells[catIdx] : '';

    // Parse date (supports DD/MM/YYYY or YYYY-MM-DD)
    let dateStr = new Date().toISOString().split('T')[0];
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    } else if (rawDate.includes('-')) {
      dateStr = rawDate.substring(0, 10);
    }

    // Parse amount
    const cleanAmtStr = rawAmt.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
    const parsedAmt = parseFloat(cleanAmtStr);

    if (isNaN(parsedAmt) || parsedAmt === 0) continue;

    const isCredit = parsedAmt > 0 && !rawDesc.toLowerCase().includes('pagamento');
    const finalType: TransactionType = parsedAmt < 0 ? 'despesa' : isCredit ? 'receita' : 'despesa';
    const finalAmount = Math.abs(parsedAmt);

    items.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      description: rawDesc,
      amount: finalAmount,
      type: finalType,
      category: rawCat || autoCategorizeDescription(rawDesc, finalType),
      paymentMethod: 'Importação Bancária',
      account: defaultAccount,
      selected: true,
    });
  }

  return items;
}

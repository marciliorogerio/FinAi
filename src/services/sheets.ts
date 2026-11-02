import { FinancialTransaction, SpreadsheetInfo } from '../types/finance.ts';

const EXPENSE_SHEET_TITLE = '💸 Despesas';
const REVENUE_SHEET_TITLE = '💰 Receitas';
const SUMMARY_SHEET_TITLE = '📊 Resumo';
const CATEGORY_SHEET_TITLE = '🏷️ Categorias';

export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetInfo[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,webViewLink,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Falha ao listar planilhas do Google Drive.');
  }

  const data = await response.json();
  return (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    modifiedTime: file.modifiedTime,
  }));
}

export async function createFinancialSpreadsheet(
  accessToken: string,
  title: string = 'Controle Financeiro Inteligente - IA'
): Promise<SpreadsheetInfo> {
  const requestBody = {
    properties: {
      title,
      locale: 'pt_BR',
      autoRecalc: 'ON_CHANGE',
    },
    sheets: [
      {
        properties: {
          title: SUMMARY_SHEET_TITLE,
          gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: EXPENSE_SHEET_TITLE,
          gridProperties: { rowCount: 1000, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: REVENUE_SHEET_TITLE,
          gridProperties: { rowCount: 1000, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: CATEGORY_SHEET_TITLE,
          gridProperties: { rowCount: 50, columnCount: 6, frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Não foi possível criar a planilha no Google Sheets.');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Populate headers and styling
  const initialDataUpdates = [
    {
      range: `${EXPENSE_SHEET_TITLE}!A1:G1`,
      values: [
        ['Data', 'Descrição', 'Valor (R$)', 'Categoria', 'Forma de Pagamento', 'Observações', 'Registrado por'],
      ],
    },
    {
      range: `${REVENUE_SHEET_TITLE}!A1:G1`,
      values: [
        ['Data', 'Descrição', 'Valor (R$)', 'Categoria', 'Forma de Recebimento', 'Observações', 'Registrado por'],
      ],
    },
    {
      range: `${SUMMARY_SHEET_TITLE}!A1:C6`,
      values: [
        ['Indicador', 'Valor (R$)', 'Fórmula / Descrição'],
        ['Total de Receitas', `=SOMA('${REVENUE_SHEET_TITLE}'!C2:C1000)`, 'Soma de todas as entradas'],
        ['Total de Despesas', `=SOMA('${EXPENSE_SHEET_TITLE}'!C2:C1000)`, 'Soma de todas as saídas'],
        ['Saldo Atual', '=B2-B3', 'Receitas menos Despesas'],
        ['Última Atualização', new Date().toLocaleDateString('pt-BR'), 'Data da última sincronização com IA'],
        ['Status', 'Sincronizado com Assistente IA', 'Pronto para receber novos dados por voz e foto'],
      ],
    },
    {
      range: `${CATEGORY_SHEET_TITLE}!A1:B13`,
      values: [
        ['Categoria', 'Tipo Padrão'],
        ['Alimentação', 'Despesa'],
        ['Transporte', 'Despesa'],
        ['Moradia', 'Despesa'],
        ['Saúde', 'Despesa'],
        ['Lazer', 'Despesa'],
        ['Educação', 'Despesa'],
        ['Compras', 'Despesa'],
        ['Serviços & Contas', 'Despesa'],
        ['Salário', 'Receita'],
        ['Freelance / Extra', 'Receita'],
        ['Investimentos', 'Receita'],
        ['Outros', 'Despesa'],
      ],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: initialDataUpdates,
    }),
  });

  return {
    id: spreadsheetId,
    name: title,
    url: createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    modifiedTime: new Date().toISOString(),
  };
}

export async function loadSpreadsheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  sheetTitle: string;
  transactions: FinancialTransaction[];
  sheetsFound: string[];
}> {
  // 1. Fetch metadata to discover sheets
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao acessar a planilha informada.');
  }

  const metaData = await metaRes.json();
  const sheetTitle = metaData.properties?.title || 'Planilha Financeira';
  const sheetList: Array<{ title: string; sheetId: number }> = (metaData.sheets || []).map((s: any) => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId,
  }));

  const sheetNames = sheetList.map((s) => s.title);

  // Identify expense and revenue sheets (or fallback to first sheet)
  const expenseSheetName =
    sheetNames.find((n) => n.includes('Despesa') || n.toLowerCase().includes('expense')) ||
    (sheetNames.includes(EXPENSE_SHEET_TITLE) ? EXPENSE_SHEET_TITLE : sheetNames[0]);

  const revenueSheetName =
    sheetNames.find((n) => n.includes('Receita') || n.toLowerCase().includes('income')) ||
    (sheetNames.includes(REVENUE_SHEET_TITLE) ? REVENUE_SHEET_TITLE : null);

  const transactions: FinancialTransaction[] = [];

  // Helper to parse values
  const parseRows = (rows: any[][], defaultType: 'despesa' | 'receita', sheetName: string) => {
    if (!rows || rows.length < 2) return;
    // Header is row 0
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const dateStr = String(row[0] || '').trim();
      const desc = String(row[1] || 'Sem descrição').trim();
      const rawVal = String(row[2] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      const amount = parseFloat(rawVal) || 0;
      const category = String(row[3] || 'Outros').trim();
      const paymentMethod = String(row[4] || 'Outro').trim();
      const notes = String(row[5] || '').trim();
      const registeredBy = String(row[6] || '').trim();

      if (amount > 0 || desc) {
        transactions.push({
          id: `${sheetName}-${i + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: defaultType,
          date: dateStr,
          description: desc,
          amount,
          category,
          paymentMethod,
          notes,
          registeredBy,
          sheetName,
          rowIndex: i + 1,
          syncedToGoogleSheets: true,
        });
      }
    }
  };

  if (expenseSheetName) {
    try {
      const expRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(expenseSheetName)}!A1:G1000`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (expRes.ok) {
        const expData = await expRes.json();
        parseRows(expData.values || [], 'despesa', expenseSheetName);
      }
    } catch (e) {
      console.warn('Could not load expense sheet values:', e);
    }
  }

  if (revenueSheetName && revenueSheetName !== expenseSheetName) {
    try {
      const revRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(revenueSheetName)}!A1:G1000`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (revRes.ok) {
        const revData = await revRes.json();
        parseRows(revData.values || [], 'receita', revenueSheetName);
      }
    } catch (e) {
      console.warn('Could not load revenue sheet values:', e);
    }
  }

  // Sort descending by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    sheetTitle,
    transactions,
    sheetsFound: sheetNames,
  };
}

export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  transaction: FinancialTransaction,
  userEmail?: string
): Promise<{ success: boolean; updatedRange?: string }> {
  // Determine target sheet
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error('Falha ao verificar as abas da planilha.');
  }

  const metaData = await metaRes.json();
  const sheets: Array<{ properties: { title: string; sheetId: number } }> = metaData.sheets || [];
  const sheetNames = sheets.map((s) => s.properties.title);

  let targetSheet = transaction.type === 'despesa' ? EXPENSE_SHEET_TITLE : REVENUE_SHEET_TITLE;

  // If exact sheet does not exist, look for any matching name
  if (!sheetNames.includes(targetSheet)) {
    const matched = sheetNames.find((name) =>
      transaction.type === 'despesa'
        ? name.includes('Despesa') || name.toLowerCase().includes('expense')
        : name.includes('Receita') || name.toLowerCase().includes('income')
    );

    if (matched) {
      targetSheet = matched;
    } else {
      // Create the missing sheet tab!
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetSheet,
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        }),
      });

      // Add headers to new sheet
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}!A1:G1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              ['Data', 'Descrição', 'Valor (R$)', 'Categoria', 'Forma de Pagamento', 'Observações', 'Registrado por'],
            ],
          }),
        }
      );
    }
  }

  // Format currency value or number
  const formattedAmount = Number(transaction.amount) || 0;

  const rowValues = [
    transaction.date,
    transaction.description,
    formattedAmount,
    transaction.category,
    transaction.paymentMethod,
    transaction.notes || '',
    userEmail ? `Assistente IA (${userEmail})` : 'Assistente IA',
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheet)}!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao gravar linha na planilha.');
  }

  const appendData = await appendRes.json();
  return {
    success: true,
    updatedRange: appendData.updates?.updatedRange,
  };
}

export async function deleteTransactionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number
): Promise<boolean> {
  // 1. Discover numerical sheetId for the sheetName
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    throw new Error('Falha ao obter metadados da planilha.');
  }

  const metaData = await metaRes.json();
  const sheets: Array<{ properties: { title: string; sheetId: number } }> = metaData.sheets || [];
  const target = sheets.find((s) => s.properties.title === sheetName);

  if (!target || target.properties.sheetId === undefined) {
    throw new Error(`Aba "${sheetName}" não foi localizada na planilha.`);
  }

  const sheetIdNum = target.properties.sheetId;

  // 2. Execute deleteDimension (0-indexed)
  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetIdNum,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    }),
  });

  if (!batchRes.ok) {
    const err = await batchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao excluir linha da planilha.');
  }

  return true;
}

export async function batchAppendTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: FinancialTransaction[],
  userEmail?: string
): Promise<number> {
  let count = 0;
  for (const tx of transactions) {
    try {
      await appendTransactionToSheet(accessToken, spreadsheetId, tx, userEmail);
      count++;
    } catch (e) {
      console.warn('Batch append item failed:', e);
    }
  }
  return count;
}


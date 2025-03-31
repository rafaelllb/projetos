// /frontend/js/reports/export-service.js
// Serviço para exportação de dados em diferentes formatos

import { DateUtils } from '../utils/date-utils.js';

/**
 * Classe responsável por exportar dados em diferentes formatos
 */
export class ExportService {
    /**
     * Exporta dados para formato CSV
     * @param {Array} data - Array de objetos a serem exportados
     * @param {Object} options - Opções de exportação
     * @param {Array<string>} options.columns - Colunas a serem exportadas (padrão: todas)
     * @param {Array<string>} options.headers - Títulos das colunas (padrão: nomes das colunas)
     * @param {boolean} options.includeHeaders - Se deve incluir cabeçalhos (padrão: true)
     * @param {string} options.delimiter - Delimitador de campos (padrão: ',')
     * @param {Function} options.transform - Função para transformar dados antes da exportação
     * @returns {string} - Conteúdo CSV
     */
    static exportToCSV(data, options = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }
        
        // Definir opções padrão
        const defaultOptions = {
            columns: null,
            headers: null,
            includeHeaders: true,
            delimiter: ',',
            transform: null
        };
        
        const opts = { ...defaultOptions, ...options };
        const delimiter = opts.delimiter;
        
        // Determinar colunas a serem exportadas
        const columns = opts.columns || Object.keys(data[0]);
        
        // Determinar cabeçalhos
        const headers = opts.headers || columns;
        
        // Aplicar transformação se fornecida
        const transformedData = opts.transform ? data.map(opts.transform) : data;
        
        // Construir linhas CSV
        const rows = [];
        
        // Adicionar cabeçalhos se necessário
        if (opts.includeHeaders) {
            rows.push(headers.join(delimiter));
        }
        
        // Adicionar dados
        transformedData.forEach(item => {
            const row = columns.map(column => {
                let value = item[column];
                
                // Formatar valor para CSV
                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'string') {
                    // Escapar aspas e envolver em aspas se contiver delimitador, quebra de linha ou aspas
                    value = value.replace(/"/g, '""');
                    if (value.includes(delimiter) || value.includes('\n') || value.includes('"')) {
                        value = `"${value}"`;
                    }
                    return value;
                } else if (value instanceof Date) {
                    return DateUtils.formatDate(value);
                } else {
                    return String(value);
                }
            });
            
            rows.push(row.join(delimiter));
        });
        
        return rows.join('\n');
    }
    
    /**
     * Exporta dados para formato JSON
     * @param {Array|Object} data - Dados a serem exportados
     * @param {Object} options - Opções de exportação
     * @param {boolean} options.pretty - Se deve formatar o JSON (padrão: true)
     * @param {Array<string>} options.exclude - Campos a serem excluídos
     * @param {Function} options.transform - Função para transformar dados antes da exportação
     * @returns {string} - Conteúdo JSON
     */
    static exportToJSON(data, options = {}) {
        if (!data) {
            return '';
        }
        
        // Definir opções padrão
        const defaultOptions = {
            pretty: true,
            exclude: [],
            transform: null
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Função para excluir campos
        const excludeFields = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(excludeFields);
            } else if (obj !== null && typeof obj === 'object') {
                const result = {};
                for (const key in obj) {
                    if (!opts.exclude.includes(key)) {
                        result[key] = excludeFields(obj[key]);
                    }
                }
                return result;
            } else {
                return obj;
            }
        };
        
        // Aplicar transformação se fornecida
        let transformedData = opts.transform ? (
            Array.isArray(data) ? data.map(opts.transform) : opts.transform(data)
        ) : data;
        
        // Excluir campos se necessário
        if (opts.exclude.length > 0) {
            transformedData = excludeFields(transformedData);
        }
        
        // Converter para JSON
        return JSON.stringify(transformedData, null, opts.pretty ? 2 : null);
    }
    
    /**
     * Exporta dados para formato HTML
     * @param {Array} data - Array de objetos a serem exportados
     * @param {Object} options - Opções de exportação
     * @param {Array<string>} options.columns - Colunas a serem exportadas (padrão: todas)
     * @param {Array<string>} options.headers - Títulos das colunas (padrão: nomes das colunas)
     * @param {string} options.title - Título da tabela
     * @param {string} options.className - Classe CSS para a tabela
     * @param {Function} options.formatCell - Função para formatar células (recebe valor, coluna e linha)
     * @param {boolean} options.includeStyles - Se deve incluir estilos básicos
     * @returns {string} - Conteúdo HTML
     */
    static exportToHTML(data, options = {}) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<table><tr><td>Sem dados</td></tr></table>';
        }
        
        // Definir opções padrão
        const defaultOptions = {
            columns: null,
            headers: null,
            title: 'Exportação de Dados',
            className: 'exported-table',
            formatCell: null,
            includeStyles: true
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Determinar colunas a serem exportadas
        const columns = opts.columns || Object.keys(data[0]);
        
        // Determinar cabeçalhos
        const headers = opts.headers || columns.map(column => 
            column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')
        );
        
        // Construir HTML
        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${opts.title}</title>
                ${opts.includeStyles ? `
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.5;
                        margin: 20px;
                    }
                    
                    h1 {
                        color: #333;
                        margin-bottom: 20px;
                    }
                    
                    .${opts.className} {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 20px;
                    }
                    
                    .${opts.className} th {
                        background-color: #f2f2f2;
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    
                    .${opts.className} td {
                        border: 1px solid #ddd;
                        padding: 8px;
                    }
                    
                    .${opts.className} tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    
                    .${opts.className} tr:hover {
                        background-color: #f5f5f5;
                    }
                </style>
                ` : ''}
            </head>
            <body>
                <h1>${opts.title}</h1>
                
                <table class="${opts.className}">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Adicionar linhas
        data.forEach((item, rowIndex) => {
            html += '<tr>';
            
            columns.forEach(column => {
                let value = item[column];
                
                // Formatar valor
                if (value === null || value === undefined) {
                    value = '';
                } else if (value instanceof Date) {
                    value = DateUtils.formatDate(value);
                } else if (typeof value === 'boolean') {
                    value = value ? 'Sim' : 'Não';
                }
                
                // Usar formatador personalizado se fornecido
                if (opts.formatCell) {
                    value = opts.formatCell(value, column, rowIndex);
                }
                
                html += `<td>${value}</td>`;
            });
            
            html += '</tr>';
        });
        
        // Finalizar HTML
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        return html;
    }
    
    /**
     * Exporta transações para CSV
     * @param {Array} transactions - Lista de transações
     * @param {Object} options - Opções adicionais
     * @returns {string} - Conteúdo CSV
     */
    static exportTransactionsToCSV(transactions, options = {}) {
        // Definir colunas e cabeçalhos
        const columns = ['date', 'type', 'description', 'amount', 'category', 'notes'];
        const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Observações'];
        
        // Transformar dados
        const transform = (transaction) => {
            const transformed = { ...transaction };
            
            // Formatar tipo
            transformed.type = transformed.type === 'income' ? 'Receita' : 'Despesa';
            
            // Formatar valor
            transformed.amount = parseFloat(transformed.amount).toFixed(2);
            
            return transformed;
        };
        
        // Opções específicas para transações
        const csvOptions = {
            columns,
            headers,
            transform,
            ...options
        };
        
        return this.exportToCSV(transactions, csvOptions);
    }
    
    /**
     * Exporta um conjunto de dados e inicia o download
     * @param {Array|Object} data - Dados a serem exportados
     * @param {string} filename - Nome do arquivo
     * @param {string} format - Formato de exportação ('csv', 'json', 'html')
     * @param {Object} options - Opções específicas do formato
     */
    static downloadExport(data, filename, format = 'csv', options = {}) {
        let content;
        let mimeType;
        
        // Determinar formato e gerar conteúdo
        switch (format.toLowerCase()) {
            case 'csv':
                content = this.exportToCSV(data, options);
                mimeType = 'text/csv;charset=utf-8';
                filename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
                break;
                
            case 'json':
                content = this.exportToJSON(data, options);
                mimeType = 'application/json;charset=utf-8';
                filename = filename.endsWith('.json') ? filename : `${filename}.json`;
                break;
                
            case 'html':
                content = this.exportToHTML(data, options);
                mimeType = 'text/html;charset=utf-8';
                filename = filename.endsWith('.html') ? filename : `${filename}.html`;
                break;
                
            default:
                throw new Error(`Formato de exportação não suportado: ${format}`);
        }
        
        // Criar blob e URL
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Criar link para download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Adicionar link ao DOM e clicar
        document.body.appendChild(link);
        link.click();
        
        // Limpar
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

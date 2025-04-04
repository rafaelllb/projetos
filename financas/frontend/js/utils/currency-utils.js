// /frontend/js/utils/currency-utils.js
// Utilitários robustos e consistentes para formatação e cálculos monetários

/**
 * Classe com métodos utilitários para manipulação de valores monetários
 * Implementação melhorada e à prova de falhas
 */
export class CurrencyUtils {
    /**
     * Formata um valor monetário no padrão brasileiro
     * Implementação robusta que lida com valores inválidos e opções
     * @param {number|string} value - Valor a ser formatado
     * @param {string} [currency='BRL'] - Código da moeda
     * @param {Object} options - Opções adicionais de formatação
     * @param {boolean} options.omitCurrency - Omitir símbolo da moeda
     * @param {number} options.minDigits - Mínimo de casas decimais
     * @param {number} options.maxDigits - Máximo de casas decimais
     * @returns {string} - Valor formatado
     */
    static formatCurrency(value, currency = 'BRL', options = {}) {
        // Sanitizar valor para garantir que é um número
        let safeValue;
        
        if (value === null || value === undefined || isNaN(value)) {
            safeValue = 0;
        } else {
            // Converter para número se for string
            safeValue = typeof value === 'string' 
                ? parseFloat(value.replace(/[^\d.,\-]/g, '').replace(',', '.')) 
                : Number(value);
            
            // Garantir que é número válido
            if (isNaN(safeValue) || !isFinite(safeValue)) {
                safeValue = 0;
            }
        }
        
        // Configurar opções de formatação
        const formatOptions = {
            minimumFractionDigits: options.minDigits || 2,
            maximumFractionDigits: options.maxDigits || 2
        };
        
        // Adicionar símbolo da moeda apenas se não for omitido
        if (!options.omitCurrency) {
            formatOptions.style = 'currency';
            formatOptions.currency = currency;
        }
        
        try {
            return new Intl.NumberFormat('pt-BR', formatOptions).format(safeValue);
        } catch (error) {
            console.error('Erro ao formatar valor:', error);
            // Implementação de fallback caso o Intl.NumberFormat falhe
            const formattedNumber = safeValue.toFixed(formatOptions.minimumFractionDigits);
            return options.omitCurrency ? formattedNumber : `R$ ${formattedNumber}`;
        }
    }
    
    /**
     * Versão segura e padronizada para formatação de moeda
     * Esta versão sempre retorna um resultado consistente, mesmo se o método formatCurrency falhar
     * @param {number|string} value - Valor a ser formatado
     * @param {string} [currency='BRL'] - Código da moeda
     * @param {boolean} [simpleFormat=false] - Se deve usar formato simplificado
     * @returns {string} - Valor formatado
     */
    static formatSafeCurrency(value, currency = 'BRL', simpleFormat = false) {
        try {
            return CurrencyUtils.formatCurrency(value, currency, { 
                omitCurrency: simpleFormat
            });
        } catch (error) {
            // Garantir que sempre retornamos algo utilizável
            const numValue = parseFloat(value) || 0;
            return simpleFormat ? numValue.toFixed(2) : `R$ ${numValue.toFixed(2)}`;
        }
    }
    
    /**
     * Converte uma string monetária para número
     * Implementação robusta que lida com diferentes formatos
     * @param {string} value - String com valor monetário
     * @param {number} [defaultValue=0] - Valor padrão para retornar em caso de erro
     * @returns {number} - Valor numérico
     */
    static parseMonetaryValue(value, defaultValue = 0) {
        if (!value && value !== 0) return defaultValue;
        
        try {
            // Converter para string se não for
            const stringValue = String(value);
            
            // Remover todos os caracteres não numéricos, exceto o ponto, vírgula e sinal negativo
            const cleanValue = stringValue
                .replace(/[^\d,.+\-]/g, '')  // Remover caracteres não numéricos
                .replace(/\./g, '')       // Remover pontos de milhar
                .replace(',', '.')        // Substituir vírgula decimal por ponto
                ;
            
            // Converter para número
            const parsedValue = parseFloat(cleanValue);
            
            // Retornar valor padrão se não for um número válido
            return isNaN(parsedValue) || !isFinite(parsedValue) ? defaultValue : parsedValue;
        } catch (error) {
            console.error('Erro ao parsear valor monetário:', error);
            return defaultValue;
        }
    }
    
    /**
     * Formata um percentual com símbolo de porcentagem
     * @param {number} value - Valor percentual
     * @param {number} [decimalPlaces=2] - Número de casas decimais
     * @param {boolean} [includeSign=false] - Se deve incluir sinal de + para valores positivos
     * @returns {string} - Percentual formatado
     */
    static formatPercentage(value, decimalPlaces = 2, includeSign = false) {
        if (value === null || value === undefined) {
            return '';
        }
        
        try {
            // Garantir que é um número
            const numValue = parseFloat(value);
            
            if (isNaN(numValue) || !isFinite(numValue)) {
                return '0%';
            }
            
            // Determinar sinal
            const sign = numValue > 0 && includeSign ? '+' : '';
            
            // Formatar
            return `${sign}${numValue.toFixed(decimalPlaces)}%`;
        } catch (error) {
            console.error('Erro ao formatar percentual:', error);
            return '0%';
        }
    }
    
    /**
     * Calcula o valor líquido (receitas - despesas)
     * @param {number} income - Total de receitas
     * @param {number} expense - Total de despesas
     * @returns {number} - Valor líquido
     */
    static calculateNetValue(income, expense) {
        // Garantir que os valores são números
        const safeIncome = parseFloat(income) || 0;
        const safeExpense = parseFloat(expense) || 0;
        
        return safeIncome - safeExpense;
    }
    
    /**
     * Calcula a taxa de poupança (saldo / receita) * 100
     * Implementação robusta que evita divisão por zero
     * @param {number} income - Total de receitas
     * @param {number} expense - Total de despesas
     * @returns {number} - Taxa de poupança (%)
     */
    static calculateSavingsRate(income, expense) {
        // Garantir que os valores são números
        const safeIncome = parseFloat(income) || 0;
        const safeExpense = parseFloat(expense) || 0;
        
        if (safeIncome <= 0) return 0;
        
        const balance = safeIncome - safeExpense;
        return (balance / safeIncome) * 100;
    }
    
    /**
     * Aplica uma taxa de juros composta a um valor
     * @param {number} principal - Valor inicial
     * @param {number} rate - Taxa de juros (% ao período)
     * @param {number} periods - Número de períodos
     * @returns {number} - Valor final
     */
    static calculateCompoundInterest(principal, rate, periods) {
        // Garantir que os valores são números
        const safePrincipal = parseFloat(principal) || 0;
        const safeRate = parseFloat(rate) || 0;
        const safePeriods = parseInt(periods) || 0;
        
        return safePrincipal * Math.pow(1 + (safeRate / 100), safePeriods);
    }
    
    /**
     * Calcula o valor futuro de um investimento periódico
     * Implementação robusta que lida com taxa zero
     * @param {number} payment - Valor do aporte periódico
     * @param {number} rate - Taxa de juros (% ao período)
     * @param {number} periods - Número de períodos
     * @returns {number} - Valor futuro
     */
    static calculateFutureValue(payment, rate, periods) {
        // Garantir que os valores são números
        const safePayment = parseFloat(payment) || 0;
        const safeRate = parseFloat(rate) || 0;
        const safePeriods = parseInt(periods) || 0;
        
        // Taxa em decimal
        const r = safeRate / 100;
        
        // Se a taxa for zero, é uma soma simples
        if (r === 0) return safePayment * safePeriods;
        
        // Fórmula do valor futuro para aportes periódicos
        return safePayment * ((Math.pow(1 + r, safePeriods) - 1) / r);
    }
    
    /**
     * Calcula a amortização de um empréstimo pelo sistema Price
     * @param {number} principal - Valor do empréstimo
     * @param {number} annualRate - Taxa de juros anual (%)
     * @param {number} months - Prazo em meses
     * @returns {Object} - Objeto com valor da parcela e plano de amortização
     */
    static calculateLoanAmortization(principal, annualRate, months) {
        // Garantir que os valores são números
        const safePrincipal = parseFloat(principal) || 0;
        const safeAnnualRate = parseFloat(annualRate) || 0;
        const safeMonths = parseInt(months) || 1;
        
        // Taxa mensal
        const monthlyRate = (safeAnnualRate / 100) / 12;
        
        // Se a taxa for zero, é uma divisão simples
        const payment = monthlyRate === 0 
            ? safePrincipal / safeMonths 
            : safePrincipal * (monthlyRate * Math.pow(1 + monthlyRate, safeMonths)) / (Math.pow(1 + monthlyRate, safeMonths) - 1);
        
        const amortizationSchedule = [];
        let remainingBalance = safePrincipal;
        
        for (let i = 1; i <= safeMonths; i++) {
            const interestPayment = remainingBalance * monthlyRate;
            const principalPayment = payment - interestPayment;
            remainingBalance -= principalPayment;
            
            amortizationSchedule.push({
                period: i,
                payment: payment,
                principalPayment: principalPayment,
                interestPayment: interestPayment,
                remainingBalance: Math.max(0, remainingBalance)
            });
        }
        
        return {
            payment: payment,
            totalInterest: amortizationSchedule.reduce((sum, period) => sum + period.interestPayment, 0),
            totalPayment: payment * safeMonths,
            schedule: amortizationSchedule
        };
    }
    
    /**
     * Formata um valor monetário para texto por extenso
     * @param {number} value - Valor a ser formatado
     * @returns {string} - Valor por extenso
     */
    static monetaryToWords(value) {
        // Implementação básica para valores até milhões
        // Em produção, usar biblioteca mais completa
        if (value === 0) return 'zero reais';
        
        const un = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dez = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const cent = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
        
        // Garantir que é um número
        const safeValue = Math.abs(parseFloat(value) || 0);
        
        // Separar parte inteira e decimal
        const intPart = Math.floor(safeValue);
        const decPart = Math.round((safeValue - intPart) * 100);
        
        // Funções auxiliares
        const getUnits = (num) => {
            if (num <= 9) return un[num];
            return '';
        };
        
        const getTens = (num) => {
            if (num < 10) return getUnits(num);
            if (num < 20) return dez[num - 10];
            
            const ten = Math.floor(num / 10);
            const unit = num % 10;
            
            return dezenas[ten] + (unit > 0 ? ` e ${un[unit]}` : '');
        };
        
        const getHundreds = (num) => {
            if (num < 100) return getTens(num);
            if (num === 100) return 'cem';
            
            const hundred = Math.floor(num / 100);
            const rest = num % 100;
            
            return cent[hundred] + (rest > 0 ? ` e ${getTens(rest)}` : '');
        };
        
        const getThousands = (num) => {
            if (num < 1000) return getHundreds(num);
            
            const thousand = Math.floor(num / 1000);
            const rest = num % 1000;
            
            const thousandText = thousand === 1 ? 'mil' : `${getHundreds(thousand)} mil`;
            return thousandText + (rest > 0 ? ` ${getHundreds(rest)}` : '');
        };
        
        // Gerar texto para parte inteira
        let result = '';
        if (intPart === 0) {
            result = 'zero';
        } else {
            result = getThousands(intPart);
        }
        
        // Adicionar "reais"
        result += intPart === 1 ? ' real' : ' reais';
        
        // Adicionar centavos
        if (decPart > 0) {
            result += ' e ' + getTens(decPart) + (decPart === 1 ? ' centavo' : ' centavos');
        }
        
        return value < 0 ? `menos ${result}` : result;
    }
    
    /**
     * Converte um número para um valor aproximado com sufixo (K, M, B)
     * @param {number} value - Valor a ser formatado
     * @param {number} [precision=1] - Casas decimais
     * @returns {string} - Valor formatado com sufixo
     */
    static formatCompactCurrency(value, precision = 1) {
        // Garantir que é um número positivo
        const safeValue = Math.abs(parseFloat(value) || 0);
        const sign = value < 0 ? '-' : '';
        
        if (safeValue < 1000) {
            return `${sign}R$ ${safeValue.toFixed(precision)}`;
        } else if (safeValue < 1000000) {
            return `${sign}R$ ${(safeValue / 1000).toFixed(precision)}K`;
        } else if (safeValue < 1000000000) {
            return `${sign}R$ ${(safeValue / 1000000).toFixed(precision)}M`;
        }
        
        return `${sign}R$ ${(safeValue / 1000000000).toFixed(precision)}B`;
    }
}

// Exportar funções individuais para permitir importação direta
export const formatCurrency = CurrencyUtils.formatCurrency;
export const formatSafeCurrency = CurrencyUtils.formatSafeCurrency;
export const parseMonetaryValue = CurrencyUtils.parseMonetaryValue;
export const formatPercentage = CurrencyUtils.formatPercentage;
export const calculateNetValue = CurrencyUtils.calculateNetValue;
export const calculateSavingsRate = CurrencyUtils.calculateSavingsRate;
export const calculateCompoundInterest = CurrencyUtils.calculateCompoundInterest;
export const calculateFutureValue = CurrencyUtils.calculateFutureValue;
export const calculateLoanAmortization = CurrencyUtils.calculateLoanAmortization;
export const monetaryToWords = CurrencyUtils.monetaryToWords;
export const formatCompactCurrency = CurrencyUtils.formatCompactCurrency;

// Exportar a classe para uso direto
export default CurrencyUtils;
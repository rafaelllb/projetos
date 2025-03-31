// /frontend/js/utils/currency-utils.js
// Utilitários para formatação e cálculos monetários

/**
 * Classe com métodos utilitários para manipulação de valores monetários
 */
export class CurrencyUtils {
    /**
     * Formata um valor monetário no padrão brasileiro
     * @param {number} value - Valor a ser formatado
     * @param {string} currency - Código da moeda (padrão: BRL)
     * @returns {string} - Valor formatado
     */
    static formatCurrency(value, currency = 'BRL') {
        if (value === null || value === undefined) {
            return '';
        }
        
        try {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency
            }).format(value);
        } catch (error) {
            console.error('Erro ao formatar valor:', error);
            return `R$ ${value.toFixed(2)}`;
        }
    }
    
    /**
     * Converte uma string monetária para número
     * @param {string} value - String com valor monetário
     * @returns {number} - Valor numérico ou NaN se inválido
     */
    static parseMonetaryValue(value) {
        if (!value) return 0;
        
        // Remover todos os caracteres não numéricos, exceto o ponto e a vírgula
        const cleanValue = value.replace(/[^\d,.]/g, '')
            .replace('.', '__POINT__')  // Substituir temporariamente o ponto
            .replace(/,/g, '.')         // Substituir vírgulas por pontos
            .replace('__POINT__', ','); // Restaurar o primeiro ponto como vírgula
        
        // Tratar o caso brasileiro onde vírgula é o separador decimal
        const normalizedValue = cleanValue.replace(',', '.');
        
        return parseFloat(normalizedValue);
    }
    
    /**
     * Formata um percentual
     * @param {number} value - Valor percentual
     * @param {number} decimalPlaces - Número de casas decimais
     * @returns {string} - Percentual formatado
     */
    static formatPercentage(value, decimalPlaces = 2) {
        if (value === null || value === undefined) {
            return '';
        }
        
        return `${value.toFixed(decimalPlaces)}%`;
    }
    
    /**
     * Calcula o valor líquido (receitas - despesas)
     * @param {number} income - Total de receitas
     * @param {number} expense - Total de despesas
     * @returns {number} - Valor líquido
     */
    static calculateNetValue(income, expense) {
        return income - expense;
    }
    
    /**
     * Calcula a taxa de poupança (saldo / receita) * 100
     * @param {number} income - Total de receitas
     * @param {number} expense - Total de despesas
     * @returns {number} - Taxa de poupança (%)
     */
    static calculateSavingsRate(income, expense) {
        if (income <= 0) return 0;
        
        const balance = income - expense;
        return (balance / income) * 100;
    }
    
    /**
     * Aplica uma taxa de juros composta a um valor
     * @param {number} principal - Valor inicial
     * @param {number} rate - Taxa de juros (% ao período)
     * @param {number} periods - Número de períodos
     * @returns {number} - Valor final
     */
    static calculateCompoundInterest(principal, rate, periods) {
        return principal * Math.pow(1 + (rate / 100), periods);
    }
    
    /**
     * Calcula o valor futuro de um investimento periódico
     * @param {number} payment - Valor do aporte periódico
     * @param {number} rate - Taxa de juros (% ao período)
     * @param {number} periods - Número de períodos
     * @returns {number} - Valor futuro
     */
    static calculateFutureValue(payment, rate, periods) {
        const r = rate / 100;
        if (r === 0) return payment * periods;
        return payment * ((Math.pow(1 + r, periods) - 1) / r);
    }
    
    /**
     * Calcula a amortização de um empréstimo pelo sistema Price
     * @param {number} principal - Valor do empréstimo
     * @param {number} annualRate - Taxa de juros anual (%)
     * @param {number} months - Prazo em meses
     * @returns {Object} - Objeto com valor da parcela e plano de amortização
     */
    static calculateLoanAmortization(principal, annualRate, months) {
        const monthlyRate = (annualRate / 100) / 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        
        const amortizationSchedule = [];
        let remainingBalance = principal;
        
        for (let i = 1; i <= months; i++) {
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
            schedule: amortizationSchedule
        };
    }
    
    /**
     * Calcula a média ponderada de valores
     * @param {Array<{value: number, weight: number}>} items - Array de objetos com valor e peso
     * @returns {number} - Média ponderada
     */
    static calculateWeightedAverage(items) {
        if (!items || items.length === 0) {
            return 0;
        }
        
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        
        if (totalWeight === 0) {
            return 0;
        }
        
        const weightedSum = items.reduce((sum, item) => sum + (item.value * item.weight), 0);
        
        return weightedSum / totalWeight;
    }
}

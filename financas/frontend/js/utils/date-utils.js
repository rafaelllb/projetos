// /frontend/js/utils/date-utils.js
// Utilitários para manipulação de datas

/**
 * Classe com métodos utilitários para manipulação de datas
 */
export class DateUtils {
    /**
     * Formata uma data no padrão brasileiro
     * @param {Date|string} date - Data a ser formatada
     * @param {boolean} includeTime - Se deve incluir o horário
     * @returns {string} - Data formatada
     */
    static formatDate(date, includeTime = false) {
        if (!date) {
            return '';
        }
        
        // Converter para objeto Date se for string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Verificar se é uma data válida
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        // Formatar data
        const options = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return dateObj.toLocaleDateString('pt-BR', options);
    }
    
    /**
     * Retorna a data atual no formato ISO (YYYY-MM-DD)
     * @returns {string} - Data atual no formato ISO
     */
    static getCurrentDateISO() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    
    /**
     * Converte uma data para o formato ISO (YYYY-MM-DD)
     * @param {Date|string} date - Data a ser convertida
     * @returns {string} - Data no formato ISO
     */
    static toISODate(date) {
        if (!date) {
            return '';
        }
        
        // Converter para objeto Date se for string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Verificar se é uma data válida
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        return dateObj.toISOString().split('T')[0];
    }
    
    /**
     * Retorna o primeiro dia do mês atual
     * @returns {Date} - Primeiro dia do mês atual
     */
    static getFirstDayOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    /**
     * Retorna o último dia do mês atual
     * @returns {Date} - Último dia do mês atual
     */
    static getLastDayOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    /**
     * Retorna o primeiro dia do mês anterior
     * @returns {Date} - Primeiro dia do mês anterior
     */
    static getFirstDayOfPreviousMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    
    /**
     * Retorna o último dia do mês anterior
     * @returns {Date} - Último dia do mês anterior
     */
    static getLastDayOfPreviousMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 0);
    }
    
    /**
     * Retorna o primeiro dia do ano atual
     * @returns {Date} - Primeiro dia do ano atual
     */
    static getFirstDayOfYear() {
        const now = new Date();
        return new Date(now.getFullYear(), 0, 1);
    }
    
    /**
     * Retorna o último dia do ano atual
     * @returns {Date} - Último dia do ano atual
     */
    static getLastDayOfYear() {
        const now = new Date();
        return new Date(now.getFullYear(), 11, 31);
    }
    
    /**
     * Adiciona dias a uma data
     * @param {Date} date - Data original
     * @param {number} days - Número de dias a adicionar
     * @returns {Date} - Nova data
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    /**
     * Adiciona meses a uma data
     * @param {Date} date - Data original
     * @param {number} months - Número de meses a adicionar
     * @returns {Date} - Nova data
     */
    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
    
    /**
     * Adiciona anos a uma data
     * @param {Date} date - Data original
     * @param {number} years - Número de anos a adicionar
     * @returns {Date} - Nova data
     */
    static addYears(date, years) {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }
    
    /**
     * Calcula a diferença em dias entre duas datas
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {number} - Diferença em dias
     */
    static diffInDays(date1, date2) {
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Calcula a diferença em meses entre duas datas
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {number} - Diferença em meses
     */
    static diffInMonths(date1, date2) {
        const months1 = date1.getFullYear() * 12 + date1.getMonth();
        const months2 = date2.getFullYear() * 12 + date2.getMonth();
        return Math.abs(months2 - months1);
    }
    
    /**
     * Calcula a diferença em anos entre duas datas
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {number} - Diferença em anos
     */
    static diffInYears(date1, date2) {
        return Math.abs(date2.getFullYear() - date1.getFullYear());
    }
    
    /**
     * Retorna o nome do mês
     * @param {number} month - Número do mês (0-11)
     * @param {boolean} short - Se deve retornar o nome abreviado
     * @returns {string} - Nome do mês
     */
    static getMonthName(month, short = false) {
        const date = new Date();
        date.setMonth(month);
        
        return date.toLocaleDateString('pt-BR', { 
            month: short ? 'short' : 'long' 
        }).replace(/\.$/, ''); // Remove o ponto final em abreviações
    }
    
    /**
     * Retorna um array com os nomes dos meses
     * @param {boolean} short - Se deve retornar nomes abreviados
     * @returns {Array<string>} - Array com nomes dos meses
     */
    static getMonthNames(short = false) {
        const monthNames = [];
        for (let i = 0; i < 12; i++) {
            monthNames.push(this.getMonthName(i, short));
        }
        return monthNames;
    }
    
    /**
     * Retorna o nome do dia da semana
     * @param {number} day - Número do dia da semana (0-6, sendo 0 = domingo)
     * @param {boolean} short - Se deve retornar o nome abreviado
     * @returns {string} - Nome do dia da semana
     */
    static getDayOfWeekName(day, short = false) {
        const date = new Date();
        date.setDate(date.getDate() - date.getDay() + day);
        
        return date.toLocaleDateString('pt-BR', { 
            weekday: short ? 'short' : 'long' 
        }).replace(/\.$/, ''); // Remove o ponto final em abreviações
    }
    
    /**
     * Retorna um array com os nomes dos dias da semana
     * @param {boolean} short - Se deve retornar nomes abreviados
     * @returns {Array<string>} - Array com nomes dos dias da semana
     */
    static getDayOfWeekNames(short = false) {
        const dayNames = [];
        for (let i = 0; i < 7; i++) {
            dayNames.push(this.getDayOfWeekName(i, short));
        }
        return dayNames;
    }
    
    /**
     * Verifica se uma data está entre duas outras
     * @param {Date} date - Data a verificar
     * @param {Date} start - Data de início
     * @param {Date} end - Data de fim
     * @returns {boolean} - Se a data está no intervalo
     */
    static isBetween(date, start, end) {
        return date >= start && date <= end;
    }
    
    /**
     * Verifica se duas datas são do mesmo dia
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {boolean} - Se as datas são do mesmo dia
     */
    static isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
    
    /**
     * Verifica se duas datas são do mesmo mês
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {boolean} - Se as datas são do mesmo mês
     */
    static isSameMonth(date1, date2) {
        return date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
    
    /**
     * Verifica se duas datas são do mesmo ano
     * @param {Date} date1 - Primeira data
     * @param {Date} date2 - Segunda data
     * @returns {boolean} - Se as datas são do mesmo ano
     */
    static isSameYear(date1, date2) {
        return date1.getFullYear() === date2.getFullYear();
    }
    
    /**
     * Formata uma data relativa (hoje, ontem, etc.)
     * @param {Date|string} date - Data a ser formatada
     * @returns {string} - Data formatada
     */
    static formatRelativeDate(date) {
        if (!date) {
            return '';
        }
        
        // Converter para objeto Date se for string
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Verificar se é uma data válida
        if (isNaN(dateObj.getTime())) {
            return '';
        }
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        
        if (dateOnly.getTime() === today.getTime()) {
            return 'Hoje';
        } else if (dateOnly.getTime() === yesterday.getTime()) {
            return 'Ontem';
        } else {
            return this.formatDate(date);
        }
    }
    
    /**
     * Retorna um array de datas entre duas datas
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @param {string} interval - Intervalo ('day', 'week', 'month', 'year')
     * @returns {Array<Date>} - Array de datas
     */
    static getDatesBetween(startDate, endDate, interval = 'day') {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Ajustar para início do dia
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        // Garantir que start <= end
        if (start > end) {
            return dates;
        }
        
        let current = new Date(start);
        
        while (current <= end) {
            dates.push(new Date(current));
            
            switch (interval) {
                case 'day':
                    current.setDate(current.getDate() + 1);
                    break;
                case 'week':
                    current.setDate(current.getDate() + 7);
                    break;
                case 'month':
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'year':
                    current.setFullYear(current.getFullYear() + 1);
                    break;
                default:
                    current.setDate(current.getDate() + 1);
            }
        }
        
        return dates;
    }
    
    /**
     * Retorna o primeiro e último dia da semana para uma data
     * @param {Date} date - Data de referência
     * @param {number} weekStartsOn - Dia que começa a semana (0 = domingo, 1 = segunda, etc.)
     * @returns {Object} - Objeto com firstDay e lastDay
     */
    static getWeekBounds(date, weekStartsOn = 0) {
        const dayOfWeek = date.getDay();
        const diff = (dayOfWeek < weekStartsOn ? 7 : 0) + dayOfWeek - weekStartsOn;
        
        const firstDay = new Date(date);
        firstDay.setDate(date.getDate() - diff);
        firstDay.setHours(0, 0, 0, 0);
        
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        lastDay.setHours(23, 59, 59, 999);
        
        return { firstDay, lastDay };
    }
    
    /**
     * Retorna o primeiro e último dia do mês para uma data
     * @param {Date} date - Data de referência
     * @returns {Object} - Objeto com firstDay e lastDay
     */
    static getMonthBounds(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        firstDay.setHours(0, 0, 0, 0);
        
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        
        return { firstDay, lastDay };
    }
    
    /**
     * Retorna o primeiro e último dia do trimestre para uma data
     * @param {Date} date - Data de referência
     * @returns {Object} - Objeto com firstDay e lastDay
     */
    static getQuarterBounds(date) {
        const quarter = Math.floor(date.getMonth() / 3);
        
        const firstDay = new Date(date.getFullYear(), quarter * 3, 1);
        firstDay.setHours(0, 0, 0, 0);
        
        const lastDay = new Date(date.getFullYear(), quarter * 3 + 3, 0);
        lastDay.setHours(23, 59, 59, 999);
        
        return { firstDay, lastDay };
    }
    
    /**
     * Retorna o primeiro e último dia do ano para uma data
     * @param {Date} date - Data de referência
     * @returns {Object} - Objeto com firstDay e lastDay
     */
    static getYearBounds(date) {
        const firstDay = new Date(date.getFullYear(), 0, 1);
        firstDay.setHours(0, 0, 0, 0);
        
        const lastDay = new Date(date.getFullYear(), 11, 31);
        lastDay.setHours(23, 59, 59, 999);
        
        return { firstDay, lastDay };
    }
    
    /**
     * Retorna os limites de uma data baseado no período
     * @param {string} period - Período ('day', 'week', 'month', 'quarter', 'year', 'all')
     * @param {Date} referenceDate - Data de referência (padrão: data atual)
     * @returns {Object} - Objeto com startDate e endDate
     */
    static getDateRangeFromPeriod(period, referenceDate = new Date()) {
        const today = new Date(referenceDate);
        today.setHours(0, 0, 0, 0);
        
        switch (period) {
            case 'day':
                return {
                    startDate: today,
                    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
                };
                
            case 'week':
                const weekBounds = this.getWeekBounds(today, 1); // Semana começando na segunda-feira
                return {
                    startDate: weekBounds.firstDay,
                    endDate: weekBounds.lastDay
                };
                
            case 'month':
                const monthBounds = this.getMonthBounds(today);
                return {
                    startDate: monthBounds.firstDay,
                    endDate: monthBounds.lastDay
                };
                
            case 'quarter':
                const quarterBounds = this.getQuarterBounds(today);
                return {
                    startDate: quarterBounds.firstDay,
                    endDate: quarterBounds.lastDay
                };
                
            case 'year':
                const yearBounds = this.getYearBounds(today);
                return {
                    startDate: yearBounds.firstDay,
                    endDate: yearBounds.lastDay
                };
                
            case 'all':
                return {
                    startDate: new Date(1970, 0, 1),
                    endDate: new Date(2100, 11, 31)
                };
                
            default:
                // Por padrão, retorna o intervalo para o mês atual
                const defaultBounds = this.getMonthBounds(today);
                return {
                    startDate: defaultBounds.firstDay,
                    endDate: defaultBounds.lastDay
                };
        }
    }
}

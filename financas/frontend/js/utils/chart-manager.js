// /frontend/js/utils/chart-manager.js
// Gerenciador centralizado de gráficos - Versão melhorada para maior robustez

import { singletonManager } from './singleton-manager.js';

/**
 * Classe responsável por gerenciar gráficos Chart.js de forma centralizada
 * Implementação Singleton para garantir consistência entre diferentes partes da aplicação
 */
class ChartManager {
    /**
     * Construtor do gerenciador de gráficos
     */
    constructor() {
        // Armazenar referências aos gráficos
        this.charts = {};
        
        // Lista de IDs de canvas comuns para busca e limpeza
        this.commonCanvasIds = [
            'overviewChart', 'expensesByCategoryChart', 'cashFlowChart',
            'incomeExpenseChart', 'categoryExpensesChart',
            'budgetDistributionChart', 'savingsProgressChart'
        ];
        
        // Mapeamento de configurações padrão por tipo de gráfico
        this.defaultOptions = {
            pie: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            },
            doughnut: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12 }
                        }
                    }
                }
            },
            line: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            },
            bar: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };
        
        // Estado de inicialização e disponibilidade do Chart.js
        this.isChartJsAvailable = false;
        this._isInitialized = false;
        this._initializationPromise = null;
        
        // Registrar no singletonManager imediatamente
        singletonManager.register('chartManager', this);
        
        // Inicializar automaticamente de forma assíncrona
        this._initializationPromise = this.init();
    }
    
    /**
     * Inicializa o gerenciador de gráficos
     * @returns {Promise<void>} Promise que resolve quando a inicialização for concluída
     */
    async init() {
        if (this._isInitialized) return Promise.resolve();
        
        try {
            // Verificar disponibilidade do Chart.js
            await this.waitForChartJs();
            
            // Registrar throttled resize handler para reajustar gráficos em redimensionamento
            this._setupResizeHandler();
            
            // Escutar por transições de página para limpar gráficos quando necessário
            document.addEventListener('routeRendered', (event) => {
                const { route, previousRoute } = event.detail;
                if (previousRoute === 'dashboard' && route !== 'dashboard') {
                    this.destroyAllCharts();
                }
            });
            
            // Escutar o evento dashboardRendered para recriar gráficos
            document.addEventListener('dashboardRendered', () => {
                console.log('ChartManager: Detectado evento dashboardRendered');
                // A inicialização dos gráficos agora é responsabilidade do DashboardManager
            });
            
            this._isInitialized = true;
            console.log('ChartManager: inicializado com sucesso');
            
            // Notificar outros componentes que ChartManager está pronto
            document.dispatchEvent(new CustomEvent('chartManagerReady', {
                detail: { instance: this }
            }));
            
            return Promise.resolve();
        } catch (error) {
            console.error('Erro ao inicializar ChartManager:', error);
            return Promise.reject(error);
        }
    }
    
    /**
     * Aguarda pelo carregamento da biblioteca Chart.js
     * @returns {Promise<void>}
     */
    async waitForChartJs() {
        return new Promise((resolve) => {
            // Verificar se Chart.js já está disponível
            if (typeof Chart !== 'undefined') {
                this.isChartJsAvailable = true;
                return resolve();
            }
            
            // Definir um contador de verificações e intervalo máximo de espera
            let checkCount = 0;
            const maxChecks = 20; // 5 segundos no total (250ms por verificação)
            
            const checkChartJs = () => {
                checkCount++;
                
                if (typeof Chart !== 'undefined') {
                    this.isChartJsAvailable = true;
                    clearInterval(checkInterval);
                    resolve();
                } else if (checkCount >= maxChecks) {
                    console.warn('ChartManager: Chart.js não foi carregado após tempo limite de espera');
                    clearInterval(checkInterval);
                    // Resolver mesmo assim, o ChartManager pode tentar carregar Chart.js dinamicamente
                    // ou operar em modo de fallback
                    resolve();
                }
            };
            
            // Verificar a cada 250ms
            const checkInterval = setInterval(checkChartJs, 250);
            
            // Verificar imediatamente também
            checkChartJs();
        });
    }
    
    /**
     * Configura um handler de redimensionamento com throttling
     * @private
     */
    _setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Atualizar tamanho de todos os gráficos registrados
                this.resizeAllCharts();
            }, 250);
        });
    }
    
    /**
     * Redimensiona todos os gráficos registrados
     */
    resizeAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                try {
                    chart.resize();
                } catch (error) {
                    console.warn(`ChartManager: Erro ao redimensionar gráfico:`, error);
                }
            }
        });
    }
    
    /**
     * Registra um gráfico no gerenciador
     * @param {string} id - Identificador do gráfico
     * @param {Object} chartInstance - Instância do gráfico Chart.js
     * @returns {Object} - Instância do gráfico
     */
    registerChart(id, chartInstance) {
        if (!id || !chartInstance) {
            console.warn('ChartManager: Tentativa de registrar gráfico inválido');
            return chartInstance;
        }
        
        // Destruir qualquer gráfico existente com o mesmo ID
        if (this.charts[id]) {
            this.destroyChart(id);
        }
        
        this.charts[id] = chartInstance;
        console.log(`ChartManager: Gráfico '${id}' registrado com sucesso`);
        
        return chartInstance;
    }
    
    /**
     * Obtém um gráfico pelo ID
     * @param {string} id - Identificador do gráfico
     * @returns {Object|null} - Instância do gráfico ou null
     */
    getChart(id) {
        return this.charts[id] || null;
    }
    
    /**
     * Verifica se um gráfico existe pelo ID
     * @param {string} id - Identificador do gráfico
     * @returns {boolean} - Se o gráfico existe
     */
    hasChart(id) {
        return !!this.charts[id];
    }
    
    /**
     * Destrói um gráfico específico
     * @param {string} id - Identificador do gráfico
     * @returns {boolean} - Se o gráfico foi destruído com sucesso
     */
    destroyChart(id) {
        if (!this.charts[id]) {
            return false;
        }
        
        try {
            if (typeof this.charts[id].destroy === 'function') {
                this.charts[id].destroy();
                console.log(`ChartManager: Gráfico '${id}' destruído com sucesso`);
            }
        } catch (error) {
            console.warn(`ChartManager: Erro ao destruir gráfico '${id}':`, error);
        } finally {
            delete this.charts[id];
        }
        
        return true;
    }
    
    /**
     * Destrói múltiplos gráficos por IDs
     * @param {Array<string>} ids - Array de IDs de gráficos
     * @returns {boolean} - Se todos os gráficos foram destruídos com sucesso
     */
    destroyCharts(ids) {
        if (!Array.isArray(ids)) {
            return false;
        }
        
        let success = true;
        ids.forEach(id => {
            if (!this.destroyChart(id)) {
                success = false;
            }
        });
        
        return success;
    }
    
    /**
     * Atualiza um gráfico existente com novos dados
     * @param {string} id - Identificador do gráfico
     * @param {Object} data - Novos dados para o gráfico
     * @param {Object} options - Novas opções para o gráfico (opcional)
     * @returns {boolean} - Se o gráfico foi atualizado com sucesso
     */
    updateChart(id, data, options = null) {
        const chart = this.getChart(id);
        
        if (!chart) {
            console.warn(`ChartManager: Gráfico '${id}' não encontrado para atualização`);
            return false;
        }
        
        try {
            // Atualizar dados
            if (data && data.datasets) {
                chart.data.labels = data.labels || chart.data.labels;
                chart.data.datasets = data.datasets;
            } else if (data) {
                chart.data = { ...chart.data, ...data };
            }
            
            // Atualizar opções (se fornecidas)
            if (options) {
                chart.options = this._mergeOptions(chart.options, options);
            }
            
            // Atualizar o gráfico
            chart.update();
            
            console.log(`ChartManager: Gráfico '${id}' atualizado com sucesso`);
            return true;
        } catch (error) {
            console.error(`ChartManager: Erro ao atualizar gráfico '${id}':`, error);
            return false;
        }
    }
    
    /**
     * Mescla opções de gráfico de forma recursiva
     * @param {Object} baseOptions - Opções base
     * @param {Object} newOptions - Novas opções
     * @returns {Object} - Opções mescladas
     * @private
     */
    _mergeOptions(baseOptions, newOptions) {
        const merged = { ...baseOptions };
        
        Object.keys(newOptions).forEach(key => {
            // Se ambos são objetos, mesclar recursivamente
            if (
                newOptions[key] && 
                typeof newOptions[key] === 'object' && 
                !Array.isArray(newOptions[key]) &&
                merged[key] && 
                typeof merged[key] === 'object' && 
                !Array.isArray(merged[key])
            ) {
                merged[key] = this._mergeOptions(merged[key], newOptions[key]);
            } else {
                // Caso contrário, substituir diretamente
                merged[key] = newOptions[key];
            }
        });
        
        return merged;
    }
    
    /**
     * Destrói todos os gráficos registrados
     */
    destroyAllCharts() {
        console.log('ChartManager: Destruindo todos os gráficos');
        
        // 1. Destruir os gráficos registrados no gerenciador
        const chartIds = Object.keys(this.charts);
        chartIds.forEach(id => {
            this.destroyChart(id);
        });
        
        // 2. Procurar por outros gráficos no DOM que possam existir
        this.cleanupUnregisteredCharts();
        
        console.log('ChartManager: Todos os gráficos foram destruídos com sucesso');
    }
    
    /**
     * Limpa gráficos não registrados que possam existir no DOM
     */
    cleanupUnregisteredCharts() {
        // Verificar se Chart.js está disponível
        if (!this.isChartJsAvailable) {
            return;
        }
        
        // Tente limpar todos os canvas conhecidos
        this.commonCanvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            
            if (canvas) {
                try {
                    // Verificar se o Chart.js tem uma função para obter gráficos
                    if (typeof Chart.getChart === 'function') {
                        const existingChart = Chart.getChart(canvas);
                        
                        if (existingChart) {
                            existingChart.destroy();
                            console.log(`ChartManager: Gráfico não registrado em '${canvasId}' destruído com sucesso`);
                        }
                    }
                } catch (error) {
                    console.warn(`ChartManager: Erro ao limpar gráfico não registrado em '${canvasId}':`, error);
                }
            }
        });
        
        // Se Chart.js 2.x estiver sendo usado, tente o método antigo também
        if (typeof Chart.instances === 'object') {
            try {
                Object.values(Chart.instances).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
            } catch (error) {
                console.warn('ChartManager: Erro ao limpar instâncias globais de Chart.js:', error);
            }
        }
    }
    
    /**
     * Verifica se Chart.js está disponível
     * @returns {boolean} - Se Chart.js está disponível
     */
    checkChartJsAvailability() {
        this.isChartJsAvailable = typeof Chart !== 'undefined';
        return this.isChartJsAvailable;
    }
    
    /**
     * Obtém a promessa de inicialização para aguardar a inicialização do ChartManager
     * @returns {Promise<void>} - Promessa que resolve quando o ChartManager estiver inicializado
     */
    getInitializationPromise() {
        return this._initializationPromise || Promise.resolve();
    }
    
    /**
     * Cria um novo gráfico com opções padrão otimizadas
     * @param {string} canvasId - ID do elemento canvas
     * @param {string} chartId - ID para registrar o gráfico
     * @param {string} type - Tipo de gráfico (pie, doughnut, line, bar)
     * @param {Object} data - Dados para o gráfico
     * @param {Object} customOptions - Opções customizadas (opcional)
     * @returns {Object|null} - Instância do gráfico criado ou null em caso de erro
     */
    createChart(canvasId, chartId, type, data, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`ChartManager: Canvas com ID '${canvasId}' não encontrado`);
            return null;
        }
        
        // Verificar se Chart.js está disponível
        if (!this.checkChartJsAvailability()) {
            console.error('ChartManager: Chart.js não está disponível');
            return null;
        }
        
        try {
            // Obter opções padrão para o tipo de gráfico
            const defaultOptions = this.defaultOptions[type] || {};
            
            // Mesclar com opções customizadas
            const options = this._mergeOptions(defaultOptions, customOptions);
            
            // Criar gráfico
            const ctx = canvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: type,
                data: data,
                options: options
            });
            
            // Registrar gráfico
            return this.registerChart(chartId || canvasId, chart);
        } catch (error) {
            console.error(`ChartManager: Erro ao criar gráfico '${chartId || canvasId}':`, error);
            return null;
        }
    }
    
    /**
     * Criar ou atualizar um gráfico
     * @param {string} canvasId - ID do elemento canvas
     * @param {string} chartId - ID para registrar o gráfico
     * @param {string} type - Tipo de gráfico
     * @param {Object} data - Dados para o gráfico
     * @param {Object} options - Opções para o gráfico (opcional)
     * @returns {Object|null} - Instância do gráfico
     */
    createOrUpdateChart(canvasId, chartId, type, data, options = {}) {
        // Usar chartId se fornecido, caso contrário usar canvasId
        const finalChartId = chartId || canvasId;
        
        // Verificar se o gráfico já existe
        const existingChart = this.getChart(finalChartId);
        
        if (existingChart) {
            // Atualizar dados e opções
            this.updateChart(finalChartId, data, options);
            return existingChart;
        } else {
            // Criar novo gráfico
            return this.createChart(canvasId, finalChartId, type, data, options);
        }
    }
    
    /**
     * Exibe um template vazio quando não há dados para mostrar
     * @param {string} canvasId - ID do elemento canvas
     * @param {string} message - Mensagem a exibir
     */
    showEmptyChartTemplate(canvasId, message = 'Sem dados para exibir') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Ocultar o canvas
        canvas.style.display = 'none';
        
        // Criar elemento de mensagem vazia
        const container = canvas.parentElement;
        if (container) {
            // Remover mensagem existente, se houver
            const existingMessage = container.querySelector('.empty-chart-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Criar nova mensagem
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-chart-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-chart-pie"></i>
                <p>${message}</p>
            `;
            
            container.appendChild(emptyMessage);
            
            // Destruir gráfico existente para liberar recursos
            if (this.hasChart(canvasId)) {
                this.destroyChart(canvasId);
            }
        }
    }
    
    /**
     * Remove o template vazio e restaura o canvas
     * @param {string} canvasId - ID do elemento canvas
     */
    removeEmptyChartTemplate(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Restaurar a exibição do canvas
        canvas.style.display = 'block';
        
        // Remover mensagem vazia, se houver
        const container = canvas.parentElement;
        if (container) {
            const emptyMessage = container.querySelector('.empty-chart-message');
            if (emptyMessage) {
                emptyMessage.remove();
            }
        }
    }
    
    /**
     * Atualiza todos os gráficos com os dados mais recentes
     * @param {Function} dataProvider - Função que retorna dados atualizados
     */
    refreshAllCharts(dataProvider) {
        if (typeof dataProvider !== 'function') return;
        
        try {
            const data = dataProvider();
            
            // Atualizar cada gráfico com novos dados
            Object.entries(this.charts).forEach(([id, chart]) => {
                if (data[id]) {
                    this.updateChart(id, data[id]);
                }
            });
            
            console.log('ChartManager: Todos os gráficos foram atualizados com sucesso');
        } catch (error) {
            console.error('ChartManager: Erro ao atualizar gráficos:', error);
        }
    }
}

// Exportar instância singleton
export const chartManager = new ChartManager();
export default chartManager;
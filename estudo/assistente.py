import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QPushButton, QLabel, QTextEdit, 
                           QComboBox, QSpinBox, QGroupBox, QProgressBar)
from PyQt5.QtCore import Qt, QTimer, pyqtSlot
from PyQt5.QtGui import QFont, QIcon
import json
from datetime import datetime
from screen_assistant import StudyAssistant

class StudyAssistantGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.assistant = StudyAssistant()
        self.initUI()
        
    def initUI(self):
        """Inicializa a interface gráfica"""
        self.setWindowTitle('Assistente de Estudos de Francês')
        self.setGeometry(100, 100, 1200, 800)
        
        # Widget central
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        # Área de controles
        controls_group = QGroupBox("Controles")
        controls_layout = QHBoxLayout()
        
        # Botões de controle
        self.start_button = QPushButton('Iniciar Monitoramento', self)
        self.start_button.clicked.connect(self.start_monitoring)
        self.stop_button = QPushButton('Parar', self)
        self.stop_button.clicked.connect(self.stop_monitoring)
        self.stop_button.setEnabled(False)
        
        # Configurações
        settings_group = QGroupBox("Configurações")
        settings_layout = QVBoxLayout()
        
        # Intervalo de captura
        interval_layout = QHBoxLayout()
        interval_label = QLabel('Intervalo de Captura (segundos):')
        self.interval_spin = QSpinBox()
        self.interval_spin.setRange(1, 60)
        self.interval_spin.setValue(5)
        interval_layout.addWidget(interval_label)
        interval_layout.addWidget(self.interval_spin)
        
        # Seleção de idioma
        lang_layout = QHBoxLayout()
        lang_label = QLabel('Idioma para OCR:')
        self.lang_combo = QComboBox()
        self.lang_combo.addItems(['Francês', 'Inglês', 'Espanhol', 'Alemão'])
        lang_layout.addWidget(lang_label)
        lang_layout.addWidget(self.lang_combo)
        
        # Adiciona layouts ao grupo de configurações
        settings_layout.addLayout(interval_layout)
        settings_layout.addLayout(lang_layout)
        settings_group.setLayout(settings_layout)
        
        # Adiciona botões e configurações ao layout de controles
        controls_layout.addWidget(self.start_button)
        controls_layout.addWidget(self.stop_button)
        controls_layout.addWidget(settings_group)
        controls_group.setLayout(controls_layout)
        
        # Área de visualização
        display_group = QGroupBox("Visualização em Tempo Real")
        display_layout = QVBoxLayout()
        
        # Texto original
        original_label = QLabel("Texto Original:")
        self.original_text = QTextEdit()
        self.original_text.setReadOnly(True)
        
        # Tradução
        translation_label = QLabel("Tradução:")
        self.translation_text = QTextEdit()
        self.translation_text.setReadOnly(True)
        
        # Resumo
        summary_label = QLabel("Resumo:")
        self.summary_text = QTextEdit()
        self.summary_text.setReadOnly(True)
        
        # Informações de ML
        ml_info_label = QLabel("Análise de ML:")
        self.ml_info_text = QTextEdit()
        self.ml_info_text.setReadOnly(True)
        
        # Adiciona elementos ao layout de visualização
        display_layout.addWidget(original_label)
        display_layout.addWidget(self.original_text)
        display_layout.addWidget(translation_label)
        display_layout.addWidget(self.translation_text)
        display_layout.addWidget(summary_label)
        display_layout.addWidget(self.summary_text)
        display_layout.addWidget(ml_info_label)
        display_layout.addWidget(self.ml_info_text)
        display_group.setLayout(display_layout)
        
        # Status bar
        self.statusBar().showMessage('Pronto')
        
        # Progress bar
        self.progress = QProgressBar()
        self.progress.setMaximum(100)
        
        # Adiciona todos os elementos ao layout principal
        layout.addWidget(controls_group)
        layout.addWidget(display_group)
        layout.addWidget(self.progress)
        
        # Timer para atualização
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_display)
        
    @pyqtSlot()
    def start_monitoring(self):
        """Inicia o monitoramento"""
        self.assistant.is_running = True
        self.start_button.setEnabled(False)
        self.stop_button.setEnabled(True)
        self.statusBar().showMessage('Monitorando...')
        
        # Configura o intervalo do timer
        interval = self.interval_spin.value() * 1000  # Converte para milissegundos
        self.timer.start(interval)
        
        # Configura o idioma
        lang_map = {
            'Francês': 'fra',
            'Inglês': 'eng',
            'Espanhol': 'spa',
            'Alemão': 'deu'
        }
        selected_lang = self.lang_combo.currentText()
        self.assistant.set_language(lang_map[selected_lang])
        
    @pyqtSlot()
    def stop_monitoring(self):
        """Para o monitoramento"""
        self.assistant.is_running = False
        self.timer.stop()
        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.statusBar().showMessage('Monitoramento parado')
        
        # Salva as anotações
        self.assistant.save_notes()
        
    def update_display(self):
        """Atualiza a exibição com os últimos dados capturados"""
        try:
            # Processa a tela atual
            self.assistant.process_screen()
            
            # Obtém a última nota
            if self.assistant.notes:
                last_note = self.assistant.notes[-1]
                
                # Atualiza os campos de texto
                self.original_text.setText(last_note['original_text'])
                self.translation_text.setText(last_note['translation'])
                self.summary_text.setText(last_note['summary'])
                
                # Formata e exibe informações de ML
                ml_info = (
                    f"Categoria: {last_note['category']}\n"
                    f"Confiança: {last_note['confidence']:.2f}\n"
                    f"Nível de Dificuldade: {last_note['complexity']['difficulty_level']}\n"
                    f"Sentimento: {last_note['complexity']['sentiment']}"
                )
                self.ml_info_text.setText(ml_info)
                
                # Atualiza a barra de progresso
                self.progress.setValue(int(last_note['confidence'] * 100))
                
            self.statusBar().showMessage('Última atualização: ' + datetime.now().strftime('%H:%M:%S'))
            
        except Exception as e:
            self.statusBar().showMessage(f'Erro: {str(e)}')
            
    def closeEvent(self, event):
        """Manipula o evento de fechamento da janela"""
        self.stop_monitoring()
        event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    
    # Aplica estilo moderno
    app.setStyle('Fusion')
    
    # Cria e exibe a janela
    gui = StudyAssistantGUI()
    gui.show()
    
    sys.exit(app.exec_())
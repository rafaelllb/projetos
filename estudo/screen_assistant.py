import pytesseract
from PIL import Image, ImageGrab
import time
import keyboard
import threading
from transformers import pipeline
import json
from datetime import datetime
import os
import sys

# Configuração do Tesseract
TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
TESSDATA_PATH = r'C:\Program Files\Tesseract-OCR\tessdata'

# Verifica se o Tesseract está instalado
if not os.path.exists(TESSERACT_PATH):
    raise RuntimeError(f"Tesseract não encontrado em: {TESSERACT_PATH}")

# Configura o Tesseract
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Configura o TESSDATA_PREFIX
os.environ['TESSDATA_PREFIX'] = TESSDATA_PATH

# Verifica se os arquivos de idioma estão disponíveis
try:
    available_langs = pytesseract.get_languages()
    print(f"Idiomas disponíveis: {available_langs}")
except Exception as e:
    print(f"Erro ao verificar idiomas: {e}")

class StudyAssistant:
    def __init__(self):
        """Inicializa o assistente de estudos"""
        print("Inicializando modelos de ML...")
        try:
            # Inicializa os modelos
            self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
            self.classifier = pipeline("text-classification", model="facebook/bart-large-mnli")
            self.sentiment_analyzer = pipeline("sentiment-analysis", 
                                            model="nlptown/bert-base-multilingual-uncased-sentiment")
            self.translator = pipeline("translation", 
                                     model="Helsinki-NLP/opus-mt-fr-pt_br")
            
            # Estado inicial
            self.is_running = False
            self.notes = []
            self.language = 'fra'  # idioma padrão: francês
            
            print("Inicialização concluída!")
        except Exception as e:
            print(f"Erro na inicialização dos modelos: {e}")
            sys.exit(1)

    def set_language(self, lang_code):
        """Define o idioma para o OCR"""
        if lang_code in pytesseract.get_languages():
            self.language = lang_code
            print(f"Idioma alterado para: {lang_code}")
        else:
            print(f"Erro: idioma {lang_code} não disponível")
            print(f"Idiomas disponíveis: {pytesseract.get_languages()}")
        
    def capture_screen(self):
        """Captura a tela atual"""
        try:
            screenshot = ImageGrab.grab()
            return screenshot
        except Exception as e:
            print(f"Erro na captura de tela: {e}")
            return None
    
    def extract_text(self, image):
        """Extrai texto da imagem usando OCR"""
        if image is None:
            return ""
            
        try:
            text = pytesseract.image_to_string(image, lang=self.language)
            return text.strip()
        except Exception as e:
            print(f"Erro na extração de texto: {e}")
            return ""
    
    def analyze_complexity(self, text):
        """Analisa a complexidade do texto usando ML"""
        if not text:
            return {
                'difficulty_level': 'desconhecido',
                'sentiment': 'desconhecido',
                'metrics': {}
            }
            
        try:
            # Análise de sentimento
            sentiment = self.sentiment_analyzer(text)[0]
            
            # Análise de complexidade léxica
            words = text.split()
            if not words:
                return {
                    'difficulty_level': 'desconhecido',
                    'sentiment': sentiment['label'],
                    'metrics': {}
                }
                
            unique_words = set(words)
            lexical_diversity = len(unique_words) / len(words)
            
            # Métricas do texto
            features = {
                'text_length': len(text),
                'word_count': len(words),
                'unique_words': len(unique_words),
                'avg_word_length': sum(len(word) for word in words) / len(words),
                'lexical_diversity': lexical_diversity,
                'sentiment_score': sentiment['score']
            }
            
            # Determinação do nível
            if lexical_diversity > 0.8:
                level = 'avançado'
            elif lexical_diversity > 0.6:
                level = 'intermediário'
            else:
                level = 'iniciante'
            
            return {
                'difficulty_level': level,
                'sentiment': sentiment['label'],
                'metrics': features
            }
        except Exception as e:
            print(f"Erro na análise de complexidade: {e}")
            return {
                'difficulty_level': 'erro',
                'sentiment': 'erro',
                'metrics': {}
            }

    def summarize_text(self, text):
        """Sumariza o texto extraído e analisa complexidade"""
        if not text or len(text) < 50:
            return text, self.analyze_complexity(text)
            
        try:
            summary = self.summarizer(text, max_length=130, min_length=30, do_sample=False)
            complexity = self.analyze_complexity(text)
            return summary[0]['summary_text'], complexity
        except Exception as e:
            print(f"Erro na sumarização: {e}")
            return text, self.analyze_complexity(text)
    
    def save_notes(self):
        """Salva as anotações em um arquivo JSON"""
        if not self.notes:
            print("Nenhuma anotação para salvar.")
            return
            
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"study_notes_{timestamp}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.notes, f, ensure_ascii=False, indent=4)
                
            print(f"Anotações salvas em {filename}")
        except Exception as e:
            print(f"Erro ao salvar anotações: {e}")
    
    def process_screen(self):
        """Processa a tela atual e extrai informações relevantes"""
        try:
            # Captura e extrai texto
            screenshot = self.capture_screen()
            text = self.extract_text(screenshot)
            
            if text:  # se encontrou algum texto
                # Classifica o conteúdo
                category = self.classifier(text, 
                    candidate_labels=["gramática", "vocabulário", "pronúncia", "cultura"])
                
                # Traduz o texto
                translation = self.translator(text)[0]['translation_text']
                
                # Gera o resumo e análise
                summary, complexity = self.summarize_text(text)
                
                # Cria a nota
                note = {
                    "timestamp": datetime.now().isoformat(),
                    "original_text": text,
                    "translation": translation,
                    "summary": summary,
                    "category": category[0]['label'],
                    "confidence": category[0]['score'],
                    "complexity": complexity
                }
                
                self.notes.append(note)
                
                # Exibe informações
                print("\nNova anotação criada:")
                print(f"Categoria: {note['category']} (confiança: {note['confidence']:.2f})")
                print(f"Nível: {complexity['difficulty_level']}")
                print(f"Tradução: {translation}")
                print(f"Resumo: {summary}\n")
                
        except Exception as e:
            print(f"Erro no processamento: {e}")
    
    def start_monitoring(self):
        """Inicia o monitoramento da tela"""
        self.is_running = True
        print("\nMonitoramento iniciado! Pressione 'Esc' para parar.")
        
        try:
            while self.is_running:
                self.process_screen()
                time.sleep(5)  # espera 5 segundos entre capturas
                
                if keyboard.is_pressed('esc'):
                    self.stop_monitoring()
        except Exception as e:
            print(f"Erro no monitoramento: {e}")
            self.stop_monitoring()
    
    def stop_monitoring(self):
        """Para o monitoramento e salva as anotações"""
        self.is_running = False
        self.save_notes()
        print("Monitoramento finalizado!")

if __name__ == "__main__":
    try:
        # Verifica se o Tesseract está funcionando
        print("Verificando Tesseract...")
        test_img = Image.new('RGB', (60, 30), color='white')
        pytesseract.image_to_string(test_img)
        print("Tesseract OK!")
        
        # Cria e inicia o assistente
        print("\nIniciando Assistente de Estudos...")
        assistant = StudyAssistant()
        
        # Inicia o monitoramento em uma thread separada
        monitor_thread = threading.Thread(target=assistant.start_monitoring)
        monitor_thread.start()
        
    except Exception as e:
        print(f"\nErro ao iniciar o programa: {e}")
        print("Verifique se o Tesseract está instalado corretamente e o PATH está configurado.")
        sys.exit(1)
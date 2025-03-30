import urllib.request
import os
import sys

def download_language_file(lang_code):
    """
    Download language training data for Tesseract
    """
    # URL base do repositório tessdata
    base_url = "https://github.com/tesseract-ocr/tessdata/raw/main/"
    
    # Caminho onde o Tesseract procura os arquivos de idioma
    tessdata_path = r"C:\Program Files\Tesseract-OCR\tessdata"
    
    # Nome do arquivo
    filename = f"{lang_code}.traineddata"
    
    # URL completa
    url = base_url + filename
    
    # Caminho completo para salvar
    save_path = os.path.join(tessdata_path, filename)
    
    print(f"Baixando dados do idioma {lang_code}...")
    
    try:
        # Cria o diretório se não existir
        os.makedirs(tessdata_path, exist_ok=True)
        
        # Baixa o arquivo
        urllib.request.urlretrieve(url, save_path)
        print(f"Arquivo salvo em: {save_path}")
        
    except Exception as e:
        print(f"Erro ao baixar arquivo: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # Lista de idiomas para baixar
    languages = ['fra', 'eng', 'spa', 'deu']
    
    for lang in languages:
        download_language_file(lang)
    
    print("Instalação concluída!")
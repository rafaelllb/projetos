import os
import sys
import pytesseract
from PIL import Image

def check_tesseract():
    """Verifica a instalação do Tesseract"""
    
    print("=== Verificação do Tesseract ===")
    
    # 1. Verifica o caminho do executável
    print("\n1. Caminho do Tesseract:")
    print(f"Configurado: {pytesseract.pytesseract.tesseract_cmd}")
    print(f"Existe: {os.path.exists(pytesseract.pytesseract.tesseract_cmd)}")
    
    # 2. Verifica variáveis de ambiente
    print("\n2. Variáveis de ambiente:")
    tessdata_prefix = os.getenv('TESSDATA_PREFIX')
    print(f"TESSDATA_PREFIX: {tessdata_prefix}")
    
    # 3. Verifica pasta tessdata
    print("\n3. Pasta tessdata:")
    tessdata_paths = [
        os.path.join(os.path.dirname(pytesseract.pytesseract.tesseract_cmd), 'tessdata'),
        tessdata_prefix if tessdata_prefix else '',
        r'C:\Program Files\Tesseract-OCR\tessdata',
        r'C:\Program Files (x86)\Tesseract-OCR\tessdata'
    ]
    
    for path in tessdata_paths:
        if path:
            print(f"\nVerificando: {path}")
            if os.path.exists(path):
                print("✓ Pasta existe")
                files = os.listdir(path)
                print(f"Arquivos encontrados: {files}")
            else:
                print("✗ Pasta não existe")
    
    # 4. Tenta listar idiomas disponíveis
    print("\n4. Idiomas disponíveis:")
    try:
        langs = pytesseract.get_languages()
        print(f"Idiomas: {langs}")
    except Exception as e:
        print(f"Erro ao listar idiomas: {str(e)}")
    
    # 5. Tenta fazer um OCR simples
    print("\n5. Teste de OCR:")
    try:
        # Cria uma imagem simples com texto
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (100, 30), color='white')
        d = ImageDraw.Draw(img)
        d.text((10,10), "Test", fill='black')
        
        # Tenta OCR
        text = pytesseract.image_to_string(img)
        print(f"Resultado OCR: {text}")
        
    except Exception as e:
        print(f"Erro no teste OCR: {str(e)}")

if __name__ == "__main__":
    check_tesseract()
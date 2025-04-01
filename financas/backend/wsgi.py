# /backend/wsgi.py
# Ponto de entrada para servidores WSGI

import os
from app import create_app

# Obter modo de execução do ambiente
config_name = os.environ.get('FLASK_CONFIG') or 'default'

# Criar aplicação com configuração apropriada
application = create_app(config_name)

if __name__ == '__main__':
    application.run()

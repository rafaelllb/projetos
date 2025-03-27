/**
 * Módulo para compressão e descompressão de dados
 * Utiliza uma combinação de técnicas para reduzir o tamanho dos dados
 */
class CompressionManager {
  
  /**
   * Comprime dados JSON para formato mais eficiente para armazenamento
   * @param {Object} data - Dados a serem comprimidos
   * @returns {String} - Dados comprimidos em formato string
   */
  compressData(data) {
    try {
      // Converte o objeto em string JSON
      const jsonString = JSON.stringify(data);
      
      // Compressão básica: substitui padrões comuns
      const compressed = this._basicCompression(jsonString);
      
      // Codifica em base64 para garantir compatibilidade
      return btoa(compressed);
    } catch (error) {
      console.error('Erro na compressão:', error);
      // Em caso de erro, retorna os dados originais em base64
      return btoa(JSON.stringify(data));
    }
  }
  
  /**
   * Descomprime dados previamente comprimidos
   * @param {String} compressedData - Dados comprimidos em formato string
   * @returns {Object} - Dados originais em formato objeto
   */
  decompressData(compressedData) {
    try {
      // Decodifica do base64
      const decoded = atob(compressedData);
      
      // Descomprime
      const decompressed = this._basicDecompression(decoded);
      
      // Converte de volta para objeto
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Erro na descompressão:', error);
      return null;
    }
  }
  
  /**
   * Implementa uma compressão básica substituindo padrões comuns
   * @private
   */
  _basicCompression(jsonString) {
    // Dicionário de substituições para compressão
    const replacements = [
      ['"id":', '~i:'],
      ['"title":', '~t:'],
      ['"amount":', '~a:'],
      ['"dueDate":', '~d:'],
      ['"date":', '~dt:'],
      ['"time":', '~tm:'],
      ['"category":', '~c:'],
      ['"status":', '~s:'],
      ['"notes":', '~n:'],
      ['"location":', '~l:'],
      ['"reminder":', '~r:'],
      ['"recurrence":', '~rc:'],
      ['"pending"', '~p'],
      ['"paid"', '~pd'],
      ['"monthly"', '~m'],
      ['"yearly"', '~y'],
      ['"none"', '~0'],
      ['"settings":', '~st:'],
      ['"bills":', '~b:'],
      ['"appointments":', '~ap:'],
      ['"notificationTime":', '~nt:'],
      ['"advanceDays":', '~ad:'],
      ['"emailNotification":', '~en:'],
      ['"browserNotification":', '~bn:'],
      ['"lastBackup":', '~lb:'],
      ['true', '~T'],
      ['false', '~F'],
      ['null', '~N']
    ];
    
    // Aplica todas as substituições
    let compressed = jsonString;
    for (const [pattern, replacement] of replacements) {
      compressed = compressed.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    return compressed;
  }
  
  /**
   * Descomprime dados previamente comprimidos com _basicCompression
   * @private
   */
  _basicDecompression(compressed) {
    // Dicionário inverso para descompressão
    const replacements = [
      ['~i:', '"id":'],
      ['~t:', '"title":'],
      ['~a:', '"amount":'],
      ['~d:', '"dueDate":'],
      ['~dt:', '"date":'],
      ['~tm:', '"time":'],
      ['~c:', '"category":'],
      ['~s:', '"status":'],
      ['~n:', '"notes":'],
      ['~l:', '"location":'],
      ['~r:', '"reminder":'],
      ['~rc:', '"recurrence":'],
      ['~p', '"pending"'],
      ['~pd', '"paid"'],
      ['~m', '"monthly"'],
      ['~y', '"yearly"'],
      ['~0', '"none"'],
      ['~st:', '"settings":'],
      ['~b:', '"bills":'],
      ['~ap:', '"appointments":'],
      ['~nt:', '"notificationTime":'],
      ['~ad:', '"advanceDays":'],
      ['~en:', '"emailNotification":'],
      ['~bn:', '"browserNotification":'],
      ['~lb:', '"lastBackup":'],
      ['~T', 'true'],
      ['~F', 'false'],
      ['~N', 'null']
    ];
    
    // Aplica todas as substituições inversas
    let decompressed = compressed;
    for (const [pattern, replacement] of replacements) {
      decompressed = decompressed.replace(new RegExp(pattern, 'g'), replacement);
    }
    
    return decompressed;
  }

  /**
   * Calcula a taxa de compressão
   * @param {Object} originalData - Dados originais
   * @param {String} compressedData - Dados comprimidos
   * @returns {Number} - Taxa de compressão (percentual de redução)
   */
  getCompressionRate(originalData, compressedData) {
    const originalSize = JSON.stringify(originalData).length;
    const compressedSize = compressedData.length;
    return ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  }
}

export default CompressionManager;
// src/utils/mediaUtils.ts

/**
 * Converte uma URL (ou Base64) em um objeto Blob
 */
export async function urlToBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return blob;
}

/**
 * Força o download de um Blob/URL no navegador
 */
export async function downloadImage(imageUrl: string, fileName: string) {
  try {
    const blob = await urlToBlob(imageUrl);
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    
    // Garante uma extensão padrão se não houver
    const extension = fileName.split('.').pop() || 'png';
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    link.download = nameWithoutExtension ? `${nameWithoutExtension}.${extension}` : `${fileName}.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpeza de memória Zen
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (error) {
    console.error('Erro no download:', error);
    return false;
  }
}

/**
 * Aciona o menu de compartilhamento nativo do dispositivo (Mobile/Mac)
 */
export async function shareImage(imageUrl: string, title: string, text: string) {
  try {
    const blob = await urlToBlob(imageUrl);
    
    // O Web Share API exige um objeto File, não apenas Blob
    const file = new File([blob], 'image.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: title,
        text: text,
        files: [file],
      });
      return true;
    } else {
      console.warn('Compartilhamento de arquivos não suportado neste navegador.');
      return false; // Fallback pode ser feito chamando downloadImage
    }
  } catch (error) {
    console.error('Erro ao compartilhar:', error);
    return false;
  }
}

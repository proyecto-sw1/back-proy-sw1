import { Injectable } from '@nestjs/common';

@Injectable()
export class ModeracionIAService {
  
  /**
   * Simula análisis de texto por IA
   * En producción, aquí harías llamada al microservicio de IA
   */
  async revisarTexto(texto: string): Promise<'aprobado' | 'rechazado'> {
    // Simulamos delay de procesamiento IA
    await this.delay(1000);
    
    // Lista de palabras prohibidas (ejemplo básico)
    const palabrasProhibidas = [
      'spam', 'ofensivo', 'inapropiado', 
      'violencia', 'drogas', 'estafa'
    ];
    
    const textoLower = texto.toLowerCase();
    const contieneProhibidas = palabrasProhibidas.some(palabra => 
      textoLower.includes(palabra)
    );
    
    // 90% probabilidad de aprobación si no tiene palabras prohibidas
    if (contieneProhibidas) {
      return 'rechazado';
    }
    
    return Math.random() > 0.1 ? 'aprobado' : 'rechazado';
  }

  /**
   * Simula análisis de imagen por IA
   * En producción, enviarías la imagen al microservicio de IA
   */
  async revisarImagen(rutaImagen: string): Promise<'aprobado' | 'rechazado'> {
    // Simulamos delay de procesamiento IA
    await this.delay(2000);
    
    // Validaciones básicas de ruta
    if (!rutaImagen || rutaImagen.length < 5) {
      return 'rechazado';
    }
    
    // Simulamos que rechaza archivos con nombres sospechosos
    const nombresSospechosos = ['virus', 'malware', 'hack'];
    const rutaLower = rutaImagen.toLowerCase();
    
    const esSospechoso = nombresSospechosos.some(nombre => 
      rutaLower.includes(nombre)
    );
    
    if (esSospechoso) {
      return 'rechazado';
    }
    
    // 85% probabilidad de aprobación para imágenes
    return Math.random() > 0.15 ? 'aprobado' : 'rechazado';
  }

  /**
   * Análisis completo de publicación (texto + imagen si existe)
   */
  async revisarPublicacion(contenidoTexto?: string, rutaMedia?: string): Promise<'aprobado' | 'rechazado'> {
    const promesas = [];
    
    if (contenidoTexto) {
      promesas.push(this.revisarTexto(contenidoTexto));
    }
    
    if (rutaMedia) {
      promesas.push(this.revisarImagen(rutaMedia));
    }
    
    const resultados = await Promise.all(promesas);
    
    // Si cualquier elemento es rechazado, toda la publicación se rechaza
    return resultados.every(resultado => resultado === 'aprobado') ? 'aprobado' : 'rechazado';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
import { 
    Controller, 
    Post, 
    UseInterceptors, 
    UploadedFile, 
    UploadedFiles,
    UseGuards,
    BadRequestException 
  } from '@nestjs/common';
  import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
  import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
  import { AwsS3Service } from '../common/services/aws-s3.service';
  import { AuthGuard } from '../auth/guard/auth.guard';
  
  @ApiTags('upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Controller('upload')
  export class UploadController {
    constructor(private readonly awsS3Service: AwsS3Service) {}
  
    @Post('single')
    @ApiOperation({ summary: 'Subir un archivo' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
          folder: {
            type: 'string',
            description: 'Carpeta destino (opcional)',
            default: 'publicaciones'
          }
        },
      },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadSingle(
      @UploadedFile() file: Express.Multer.File,
    ): Promise<{ url: string; message: string }> {
      if (!file) {
        throw new BadRequestException('No se proporcionó ningún archivo');
      }
  
      const folder = 'publicaciones'; // Carpeta específica para publicaciones
      const url = await this.awsS3Service.uploadFile(file, folder);
  
      return {
        url,
        message: 'Archivo subido exitosamente'
      };
    }
  
    @Post('multiple')
    @ApiOperation({ summary: 'Subir múltiples archivos' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    })
    @UseInterceptors(FilesInterceptor('files', 5)) // Máximo 5 archivos
    async uploadMultiple(
      @UploadedFiles() files: Array<Express.Multer.File>,
    ): Promise<{ urls: string[]; message: string }> {
      if (!files || files.length === 0) {
        throw new BadRequestException('No se proporcionaron archivos');
      }
  
      const folder = 'publicaciones';
      const urls = await this.awsS3Service.uploadMultipleFiles(files, folder);
  
      return {
        urls,
        message: `${files.length} archivos subidos exitosamente`
      };
    }
  }
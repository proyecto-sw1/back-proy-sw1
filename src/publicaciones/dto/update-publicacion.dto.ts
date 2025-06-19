import { PartialType } from '@nestjs/swagger';
import { CreatePublicacionDto } from './create-publicacion.dto';

export class UpdatePublicacionDto extends PartialType(CreatePublicacionDto) {}

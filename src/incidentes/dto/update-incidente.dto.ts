import { PartialType } from '@nestjs/swagger';
import { CreateIncidenteDto } from './create-incidente.dto';

export class UpdateIncidenteDto extends PartialType(CreateIncidenteDto) {}

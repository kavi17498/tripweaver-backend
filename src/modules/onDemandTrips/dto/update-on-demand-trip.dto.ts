import { PartialType } from '@nestjs/swagger';
import { CreateOnDemandTripDto } from './create-on-demand-trip.dto';

export class UpdateOnDemandTripDto extends PartialType(CreateOnDemandTripDto) {}
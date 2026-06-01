import { ApiProperty } from '@nestjs/swagger';

export class TripEarningsBreakdownEntity {
  @ApiProperty({ example: 'trip_12345' })
  tripId!: string;

  @ApiProperty({ example: 'Ella Hills Escape' })
  tripName!: string;

  @ApiProperty({ example: '2026-05-01' })
  startDate!: string;

  @ApiProperty({ example: '2026-05-03' })
  endDate!: string;

  @ApiProperty({ example: 'approved' })
  status!: string;

  @ApiProperty({ example: 12 })
  participantCount!: number;

  @ApiProperty({ example: 8 })
  onlineParticipantCount!: number;

  @ApiProperty({ example: 4 })
  payToGuideParticipantCount!: number;

  @ApiProperty({ example: 240000 })
  totalEarned!: number;

  @ApiProperty({ example: 160000 })
  onlineEarned!: number;

  @ApiProperty({ example: 80000 })
  payToGuideEarned!: number;

  @ApiProperty({ example: 0 })
  uncategorizedEarned!: number;

  @ApiProperty({ example: 5000 })
  pickupEarned!: number;

  @ApiProperty({ example: 235000 })
  baseTripEarned!: number;
}

export class OrganizerEarningsSummaryEntity {
  @ApiProperty({ example: 520000 })
  totalEarned!: number;

  @ApiProperty({ example: 300000 })
  onlineEarned!: number;

  @ApiProperty({ example: 220000 })
  payToGuideEarned!: number;

  @ApiProperty({ example: 0 })
  uncategorizedEarned!: number;

  @ApiProperty({ example: 15000 })
  totalPickupEarned!: number;

  @ApiProperty({ example: 505000 })
  totalBaseTripEarned!: number;

  @ApiProperty({ example: 3 })
  tripsCount!: number;


  @ApiProperty({ type: [TripEarningsBreakdownEntity] })
  trips!: TripEarningsBreakdownEntity[];
}
import { Injectable } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { TripStatus } from '../trips/entities/trip-status.enum';

@Injectable()
export class AdminService {
  constructor(private readonly tripsService: TripsService) {}

  async getAllTrips(status?: TripStatus) {
    return this.tripsService.findAll(status);
  }

  async getTripById(id: string) {
    return this.tripsService.findOne(id);
  }
}
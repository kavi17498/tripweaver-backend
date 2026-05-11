import { Injectable } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class AdminService {
  constructor(private readonly tripsService: TripsService) {}

  async getAllTrips() {
    return this.tripsService.findAll();
  }
}
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { AdminModule } from './modules/admin/admin.module';
import { TripPlannerModule } from './modules/tripPlaner/tripplanner.module';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { ItineraryModule } from './modules/itinerary/itinerary.module';
import { ChatGroupsModule } from './modules/chatgroups/chatgroups.module';
import { ChatMessagesModule } from './modules/chatmessages/chatmessages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    UsersModule,
    TripsModule,
    ChatGroupsModule,
    ChatMessagesModule,
    NotificationsModule,
    AdminModule,
    TripPlannerModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
})
export class AppModule {}

import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
const serviceAccount = require('../config/ser.json') as admin.ServiceAccount;

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          storageBucket: 'your-project-id.appspot.com', // optional
        });
        try {
          app.firestore().settings({ ignoreUndefinedProperties: true });
        } catch (e) {
          console.warn('Could not set ignoreUndefinedProperties on Firestore:', e);
        }
        return app;
      },
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_ADMIN', FirebaseService],
})
export class FirebaseModule {}

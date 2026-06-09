import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountJson) {
          try {
            const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
            const storageBucket =
              process.env.FIREBASE_STORAGE_BUCKET || 'tripwaver-c64f5.firebasestorage.app';

            const app = admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              storageBucket,
            });

            try {
              app.firestore().settings({ ignoreUndefinedProperties: true });
            } catch (e) {
              console.warn('Could not set ignoreUndefinedProperties on Firestore:', e);
            }
            return app;
          } catch (e) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON.');
          }
        }

        const projectId = process.env.FIREBASE_PROJECT_ID;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (!projectId || !privateKey || !clientEmail) {
          throw new Error(
            'Firebase service account credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in be/.env.',
          );
        }

        const serviceAccount: admin.ServiceAccount = {
          projectId,
          privateKey,
          clientEmail,
        };

        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'tripwaver-c64f5.firebasestorage.app';

        const app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: storageBucket,
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

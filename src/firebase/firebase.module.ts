import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';
import * as fs from 'fs';
import * as path from 'path';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        let serviceAccount: admin.ServiceAccount | undefined;

        // 1. Try to load from environment variable (JSON string)
        const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (saEnv) {
          try {
            serviceAccount = JSON.parse(saEnv) as admin.ServiceAccount;
          } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable as JSON:', e);
          }
        }

        // 2. Fallback to local config file if not loaded from environment variable
        if (!serviceAccount) {
          const configPath = path.resolve(__dirname, '../config/ser.json');
          if (fs.existsSync(configPath)) {
            try {
              const fileContent = fs.readFileSync(configPath, 'utf8');
              serviceAccount = JSON.parse(fileContent) as admin.ServiceAccount;
            } catch (e) {
              console.error('Failed to read or parse local ser.json config file:', e);
            }
          }
        }

        if (!serviceAccount) {
          throw new Error(
            'Firebase service account credentials missing. Please set the FIREBASE_SERVICE_ACCOUNT environment variable or place ser.json in be/src/config/',
          );
        }

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

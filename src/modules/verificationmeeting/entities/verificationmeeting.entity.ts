export class VerificationMeeting {
  id?: string;
  verificationId!: string;
  userId!: string;
  scheduledAt!: string;
  createdBy!: string;
  createdByName?: string;
  mailSentAt?: unknown;
  meetingSummary?: string;
  summarySubmittedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

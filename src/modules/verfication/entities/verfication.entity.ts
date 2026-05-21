export type VerificationStatus = 'pending' | 'in-review' | 'approved' | 'rejected';

export class Verfication {
    id?: string;
    userId!: string;
    sltdaGuideLicense!: string;
    nicImageFront!: string;
    nicImageBack!: string;
    registeredBusinessName?: string;
    taxOrBusinessRegistrationNumber?: string;
    socialLinks?: {
        facebook?: string;
        youtube?: string;
        tiktok?: string;
        instagram?: string;
        linkedin?: string;
    };
    status?: VerificationStatus;
    inReviewBy?: string;
    inReviewByName?: string;
    inReviewAssignedAt?: unknown;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: unknown;
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedByName?: string;
    rejectedAt?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
}

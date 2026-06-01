export class CreateVerficationDto {
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
}

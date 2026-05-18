import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({ description: 'User ID', example: '12345' })
  id?: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'User email address', example: 'john@example.com' })
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'User profile image URL',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profileImage?: string;

  @ApiProperty({
    description: "User's date of birth",
    example: '1990-05-20',
    required: false,
    type: String,
  })
  dateOfBirth?: Date;

  @ApiProperty({
    description: "User's gender",
    example: 'male',
    required: false,
  })
  gender?: string;

  @ApiProperty({
    description: 'User biography',
    example: 'Travel enthusiast',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main St',
    required: false,
  })
  street?: string;

  @ApiProperty({
    description: 'City name',
    example: 'New York',
    required: false,
  })
  city?: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY',
    required: false,
  })
  state?: string;

  @ApiProperty({
    description: 'Postal code',
    example: '10001',
    required: false,
  })
  postalCode?: string;

  @ApiProperty({
    description: 'Country name',
    example: 'USA',
    required: false,
  })
  country?: string;

  @ApiProperty({
    description: 'Whether the user is verified',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2026-03-20T10:30:00Z',
    required: false,
  })
  updatedAt?: Date;
}

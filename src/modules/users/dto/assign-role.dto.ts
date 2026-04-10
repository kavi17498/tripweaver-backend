import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AssignRoleDto {
  @ApiProperty({
    description: 'User ID or array of user IDs to assign role to',
    example: 'user_123',
    oneOf: [
      { type: 'string', example: 'user_123' },
      { type: 'array', items: { type: 'string' }, example: ['user_123', 'user_456'] },
    ],
  })
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return [value];
    }
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[] = [];

  @ApiProperty({
    description: 'Role to assign to the users',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  role: string = '';

  // Backward compatibility for clients sending userId instead of userIds
  @IsOptional()
  @IsString()
  userId?: string;
}

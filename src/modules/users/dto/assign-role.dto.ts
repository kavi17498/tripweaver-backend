import { IsNotEmpty, IsString, IsArray, MinLength } from 'class-validator';
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
  @MinLength(1)
  userIds: string[] = [];

  @ApiProperty({
    description: 'Role to assign to the users',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  role: string = '';
}

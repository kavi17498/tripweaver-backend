import { Test, TestingModule } from '@nestjs/testing';
import { VerficationService } from './verfication.service';

describe('VerficationService', () => {
  let service: VerficationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerficationService],
    }).compile();

    service = module.get<VerficationService>(VerficationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

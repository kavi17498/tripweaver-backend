import { Test, TestingModule } from '@nestjs/testing';
import { VerficationController } from './verfication.controller';
import { VerficationService } from './verfication.service';

describe('VerficationController', () => {
  let controller: VerficationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerficationController],
      providers: [VerficationService],
    }).compile();

    controller = module.get<VerficationController>(VerficationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Inject, Injectable } from '@nestjs/common';

import { BaseService } from '@/common/services/base.service';

import { RythmEntity } from '../entities/rythtms.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RythmsService extends BaseService<RythmEntity> {
  override repository = this._repository;
  constructor(
    @Inject('RYTHM_REPOSITORY')
    private _repository: Repository<RythmEntity>,
  ) {
    super();
  }
}

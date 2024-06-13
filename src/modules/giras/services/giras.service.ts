import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

import { BaseService } from '@/common/services/base.service';
import { LineServices } from '@/modules/lines/services/lines.service';

import { GirasEntity, GirasLinhasEntity } from '../entities/giras.entity';
import { AssignLineDTO, UpdateAssignLineDTO } from '../dto/assign.dto';

@Injectable()
export class GirasService extends BaseService<GirasEntity> {
  override repository = this._repository;
  constructor(
    @Inject('GIRAS_REPOSITORY')
    private _repository: Repository<GirasEntity>,
    @Inject('GIRAS_LINHA_REPOSITORY')
    private _linhasRepository: Repository<GirasLinhasEntity>,
    private readonly _linesService: LineServices,
  ) {
    super();
  }
  async findDetails(id: number) {
    return this._repository.findOneOrFail({
      where: { id },
      relations: {
        linhas: true,
      },
    });
  }

  async assignLine(id: number, data: AssignLineDTO[]) {
    try {
      await Promise.all(
        data.map(line => this._linesService.findBy({ id: line.linha })),
      );
      const details = this._linhasRepository.create(
        data.map(line => ({ ...line, gira: id })),
      );
      return this._linhasRepository.save(details);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }
  async updateAssignes(id: number, data: UpdateAssignLineDTO[]) {
    try {
      await Promise.all(
        data.map(line => this._linesService.findBy({ id: line.linha })),
      );
      await this._linhasRepository.delete({ gira: id });
      const details = this._linhasRepository.create(
        data.map(line => ({ ...line, gira: id })),
      );
      return this._linhasRepository.save(details);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }
}

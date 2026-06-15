import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseService } from './base.service';

type TestEntity = {
  id: string;
  name: string;
  active?: boolean;
};

class TestService extends BaseService<TestEntity> {
  constructor(repository: Repository<TestEntity>) {
    super();
    this.repository = repository;
  }
}

describe('BaseService', () => {
  const repository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  let service: TestService;

  beforeEach(() => {
    service = new TestService(repository as unknown as Repository<TestEntity>);
    jest.clearAllMocks();
  });

  it('finds all records', async () => {
    const records = [{ id: 'entity-id', name: 'entity' }];
    repository.find.mockResolvedValue(records);

    await expect(service.findAll()).resolves.toBe(records);

    expect(repository.find).toHaveBeenCalledWith();
  });

  it('finds records by where options', async () => {
    const records = [{ id: 'entity-id', name: 'entity' }];
    const options = { where: { active: true } };
    repository.find.mockResolvedValue(records);

    await expect(service.findBy(options)).resolves.toBe(records);

    expect(repository.find).toHaveBeenCalledWith(options);
  });

  it('finds one record by where options', async () => {
    const record = { id: 'entity-id', name: 'entity' };
    repository.findOneOrFail.mockResolvedValue(record);

    await expect(service.findOneBy({ id: 'entity-id' })).resolves.toBe(record);

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'entity-id' },
    });
  });

  it('wraps not found errors as bad request exceptions', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    repository.findOneOrFail.mockRejectedValue(new Error('not found'));

    await expect(service.findOneBy({ id: 'missing-id' })).rejects.toEqual(
      new BadRequestException('Entity not found'),
    );

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'missing-id' },
    });
  });

  it('stores a record using repository create and save', async () => {
    const payload = { id: 'entity-id', name: 'entity' };
    const created = { ...payload };
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.store(payload)).resolves.toBe(created);

    expect(repository.create).toHaveBeenCalledWith(payload);
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('updates an existing record using find, merge and save', async () => {
    const existing = { id: 'entity-id', name: 'old' };
    const payload = { name: 'new' };
    repository.findOneOrFail.mockResolvedValue(existing);
    repository.merge.mockImplementation((target, source) =>
      Object.assign(target, source),
    );
    repository.save.mockResolvedValue(existing);

    await expect(service.update('entity-id', payload)).resolves.toEqual({
      id: 'entity-id',
      name: 'new',
    });

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'entity-id' },
    });
    expect(repository.merge).toHaveBeenCalledWith(existing, payload);
    expect(repository.save).toHaveBeenCalledWith(existing);
  });

  it('does not merge or save when update target does not exist', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    repository.findOneOrFail.mockRejectedValue(new Error('not found'));

    await expect(service.update('missing-id', { name: 'new' })).rejects.toEqual(
      new BadRequestException('Entity not found'),
    );

    expect(repository.merge).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('destroys a record by id', async () => {
    repository.find.mockResolvedValue([{ id: 'entity-id', name: 'entity' }]);
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.destroy('entity-id')).resolves.toBeUndefined();

    expect(repository.find).toHaveBeenCalledWith({ id: 'entity-id' });
    expect(repository.delete).toHaveBeenCalledWith({ id: 'entity-id' });
  });
});

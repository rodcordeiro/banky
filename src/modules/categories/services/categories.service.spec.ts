import { BadRequestException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { CategoryClassification } from '../entities/categories.entity';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const repository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  const paginateService = {
    paginate: jest.fn(),
  };

  let service: CategoriesService;

  beforeEach(() => {
    service = new CategoriesService(
      repository as never,
      paginateService as never,
    );
    jest.clearAllMocks();
  });

  it('finds all categories as a paginated page', async () => {
    const categories = [{ id: 'category-id' }];
    const page = {
      items: categories,
      meta: {
        currentPage: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      },
    };
    paginateService.paginate.mockResolvedValue(page);

    await expect(service.findAll()).resolves.toBe(page);

    expect(paginateService.paginate).toHaveBeenCalledWith(
      repository,
      { page: 1, limit: 10 },
      undefined,
    );
  });

  it('finds categories by options', async () => {
    const categories = [{ id: 'category-id' }];
    const options = { where: { owner: { id: 'user-id' } } } as never;
    repository.find.mockResolvedValue(categories);

    await expect(service.findBy(options)).resolves.toBe(categories);

    expect(repository.find).toHaveBeenCalledWith(options);
  });

  it('finds one category by options', async () => {
    const category = { id: 'category-id' };
    repository.findOneOrFail.mockResolvedValue(category);

    await expect(service.findOneBy({ id: 'category-id' })).resolves.toBe(
      category,
    );

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'category-id' },
    });
  });

  it('throws bad request when category is not found', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    repository.findOneOrFail.mockRejectedValue(new Error('not found'));

    await expect(
      service.findOneBy({ id: 'missing-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'missing-id' },
    });
  });

  it('stores category using repository create and save', async () => {
    const payload = {
      name: 'Serviços de streaming',
      positive: false,
      classification: CategoryClassification.Optional,
      internal: false,
    };
    const entity = { ...payload };
    const saved = { id: 'category-id', ...payload };
    repository.create.mockReturnValue(entity);
    repository.save.mockResolvedValue(saved);

    await expect(service.store(payload as never)).resolves.toBe(saved);

    expect(repository.create).toHaveBeenCalledWith(payload);
    expect(repository.save).toHaveBeenCalledWith(entity);
  });

  it('updates existing category using merge and save', async () => {
    const existing = { id: 'category-id', name: 'Streaming' };
    const payload = { name: 'Serviços de streaming' };
    repository.findOneOrFail.mockResolvedValue(existing);
    repository.merge.mockImplementation((target, source) =>
      Object.assign(target, source),
    );
    repository.save.mockResolvedValue({ ...existing, ...payload });

    await expect(service.update('category-id', payload)).resolves.toEqual({
      id: 'category-id',
      name: 'Serviços de streaming',
    });

    expect(repository.merge).toHaveBeenCalledWith(existing, payload);
    expect(repository.save).toHaveBeenCalledWith(existing);
  });

  it('destroys category by id', async () => {
    repository.find.mockResolvedValue([{ id: 'category-id' }]);
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.destroy('category-id')).resolves.toBeUndefined();

    expect(repository.find).toHaveBeenCalledWith({ id: 'category-id' });
    expect(repository.delete).toHaveBeenCalledWith({ id: 'category-id' });
  });

  it('lists root categories with subcategories scoped by owner', async () => {
    const owner = 'user-id';
    const page = {
      items: [{ id: 'category-id', subcategories: [] }],
      meta: {
        currentPage: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      },
    };
    paginateService.paginate.mockResolvedValue(page);

    await expect(service.listAll(owner)).resolves.toBe(page);

    expect(paginateService.paginate).toHaveBeenCalledWith(
      repository,
      { page: 1, limit: 10 },
      {
        where: {
          owner: { id: owner },
          category: IsNull(),
        },
        relations: {
          owner: true,
          subcategories: true,
        },
      },
    );
  });
});

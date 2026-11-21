import { PaginationService } from './paginate.service';

describe('PaginationService', () => {
  const repository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  const service = new PaginationService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts without relations so OneToMany joins do not inflate totalItems', async () => {
    const items = [{ id: 'category-id' }];
    repository.find.mockResolvedValue(items);
    repository.count.mockResolvedValue(1);

    await expect(
      service.paginate(repository as never, { page: 1, limit: 10 }, {
        where: { name: 'Mercado' },
        relations: { subcategories: true },
        select: ['id', 'name'],
      } as never),
    ).resolves.toEqual({
      items,
      meta: {
        currentPage: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
      },
    });

    expect(repository.find).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: { name: 'Mercado' },
      relations: { subcategories: true },
      select: ['id', 'name'],
    });
    expect(repository.count).toHaveBeenCalledWith({
      where: { name: 'Mercado' },
      relations: undefined,
      select: undefined,
    });
  });
});

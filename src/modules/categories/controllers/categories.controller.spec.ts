import { CategoryClassification } from '../entities/categories.entity';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  const owner = 'user-id';
  const req = { user: { id: owner } } as AuthenticatedRequest;
  const service = {
    listAll: jest.fn(),
    findOneBy: jest.fn(),
    store: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  let controller: CategoriesController;

  beforeEach(() => {
    controller = new CategoriesController(service as never);
    jest.clearAllMocks();
  });

  it('lists category tree scoped by authenticated owner', async () => {
    const categories = [{ id: 'category-id', subcategories: [] }];
    service.listAll.mockResolvedValue(categories);

    await expect(controller.index(req)).resolves.toBe(categories);

    expect(service.listAll).toHaveBeenCalledWith(owner);
  });

  it('gets category by id', async () => {
    const category = { id: 'category-id' };
    service.findOneBy.mockResolvedValue(category);

    await expect(controller.view('category-id')).resolves.toBe(category);

    expect(service.findOneBy).toHaveBeenCalledWith({ id: 'category-id' });
  });

  it('creates category with authenticated owner', async () => {
    const payload = {
      name: 'Serviços de streaming',
      positive: false,
      classification: CategoryClassification.Optional,
      internal: false,
    };
    const created = { id: 'category-id', ...payload, owner };
    service.store.mockResolvedValue(created);

    await expect(controller.create(req, payload)).resolves.toBe(created);

    expect(service.store).toHaveBeenCalledWith({
      ...payload,
      owner,
    });
  });

  it('creates subcategory preserving parent category id', async () => {
    const payload = {
      name: 'Youtube Premium',
      positive: false,
      category: 'parent-id',
    };
    const created = { id: 'category-id', ...payload, owner };
    service.store.mockResolvedValue(created);

    await expect(controller.create(req, payload)).resolves.toBe(created);

    expect(service.store).toHaveBeenCalledWith({
      ...payload,
      owner,
    });
  });

  it('updates category by id with authenticated owner', async () => {
    const payload = {
      name: 'Streaming',
      classification: CategoryClassification.Important,
    };
    const updated = { id: 'category-id', ...payload, owner };
    service.update.mockResolvedValue(updated);

    await expect(controller.update(req, 'category-id', payload)).resolves.toBe(
      updated,
    );

    expect(service.update).toHaveBeenCalledWith('category-id', {
      ...payload,
      owner,
    });
  });

  it('removes category by id', async () => {
    service.destroy.mockResolvedValue(undefined);

    await expect(controller.remove('category-id')).resolves.toBeUndefined();

    expect(service.destroy).toHaveBeenCalledWith('category-id');
  });
});

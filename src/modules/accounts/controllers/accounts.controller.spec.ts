import { AccountsController } from './accounts.controller';

describe('AccountsController', () => {
  const owner = 'user-id';
  const req = { user: { id: owner } } as AuthenticatedRequest;
  const service = {
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    store: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  let controller: AccountsController;

  beforeEach(() => {
    controller = new AccountsController(service as never);
    jest.clearAllMocks();
  });

  it('lists accounts scoped by authenticated owner', async () => {
    const accounts = [{ id: 'account-id' }];
    service.findBy.mockResolvedValue(accounts);

    await expect(controller.index(req)).resolves.toBe(accounts);

    expect(service.findBy).toHaveBeenCalledWith({
      where: {
        owner: { id: owner },
      },
      relations: { owner: true },
    });
  });

  it('gets account by id', async () => {
    const account = { id: 'account-id' };
    service.findOneBy.mockResolvedValue(account);

    await expect(controller.view('account-id')).resolves.toBe(account);

    expect(service.findOneBy).toHaveBeenCalledWith({ id: 'account-id' });
  });

  it('creates account with authenticated owner', async () => {
    const payload = {
      name: 'nubank digo',
      ammount: 10,
      paymentType: 'payment-id',
      threshold: 100,
    };
    const created = { id: 'account-id', ...payload, owner };
    service.store.mockResolvedValue(created);

    await expect(controller.create(req, payload)).resolves.toBe(created);

    expect(service.store).toHaveBeenCalledWith({
      ...payload,
      owner,
    });
  });

  it('updates account by id with authenticated owner', async () => {
    const payload = { threshold: 250 };
    const updated = { id: 'account-id', ...payload, owner };
    service.update.mockResolvedValue(updated);

    await expect(controller.update(req, 'account-id', payload)).resolves.toBe(
      updated,
    );

    expect(service.update).toHaveBeenCalledWith('account-id', {
      ...payload,
      owner,
    });
  });

  it('removes account by id', async () => {
    service.destroy.mockResolvedValue(undefined);

    await expect(controller.remove('account-id')).resolves.toBeUndefined();

    expect(service.destroy).toHaveBeenCalledWith('account-id');
  });
});

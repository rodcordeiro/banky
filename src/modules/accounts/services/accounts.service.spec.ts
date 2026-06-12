import { BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  const repository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  let service: AccountsService;

  beforeEach(() => {
    service = new AccountsService(repository as never);
    jest.clearAllMocks();
  });

  it('finds all accounts', async () => {
    const accounts = [{ id: 'account-id' }];
    repository.find.mockResolvedValue(accounts);

    await expect(service.findAll()).resolves.toBe(accounts);

    expect(repository.find).toHaveBeenCalledWith();
  });

  it('finds accounts by options', async () => {
    const accounts = [{ id: 'account-id' }];
    const where = { owner: { id: 'user-id' } };
    repository.findBy.mockResolvedValue(accounts);

    await expect(service.findBy(where)).resolves.toBe(accounts);

    expect(repository.findBy).toHaveBeenCalledWith(where);
  });

  it('finds one account by options', async () => {
    const account = { id: 'account-id' };
    repository.findOneOrFail.mockResolvedValue(account);

    await expect(service.findOneBy({ id: 'account-id' })).resolves.toBe(
      account,
    );

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'account-id' },
    });
  });

  it('throws bad request when account is not found', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    repository.findOneOrFail.mockRejectedValue(new Error('not found'));

    await expect(
      service.findOneBy({ id: 'missing-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'missing-id' },
    });
  });

  it('stores account using repository create and save', async () => {
    const payload = {
      name: 'nubank digo',
      ammount: 10,
      paymentType: 'payment-id',
      threshold: 100,
    };
    const entity = { ...payload };
    const saved = { id: 'account-id', ...payload };
    repository.create.mockReturnValue(entity);
    repository.save.mockResolvedValue(saved);

    await expect(service.store(payload as never)).resolves.toBe(saved);

    expect(repository.create).toHaveBeenCalledWith(payload);
    expect(repository.save).toHaveBeenCalledWith(entity);
  });

  it('updates existing account using merge and save', async () => {
    const existing = { id: 'account-id', threshold: 100 };
    const payload = { threshold: 200 };
    repository.findOneOrFail.mockResolvedValue(existing);
    repository.merge.mockImplementation((target, source) =>
      Object.assign(target, source),
    );
    repository.save.mockResolvedValue({ ...existing, ...payload });

    await expect(service.update('account-id', payload)).resolves.toEqual({
      id: 'account-id',
      threshold: 200,
    });

    expect(repository.merge).toHaveBeenCalledWith(existing, payload);
    expect(repository.save).toHaveBeenCalledWith(existing);
  });

  it('destroys account by id', async () => {
    repository.findBy.mockResolvedValue([{ id: 'account-id' }]);
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.destroy('account-id')).resolves.toBeUndefined();

    expect(repository.findBy).toHaveBeenCalledWith({ id: 'account-id' });
    expect(repository.delete).toHaveBeenCalledWith({ id: 'account-id' });
  });
});

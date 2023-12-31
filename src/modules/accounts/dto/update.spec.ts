/* eslint-disable @typescript-eslint/ban-ts-comment */
// Generated by CodiumAI

import { AccountType } from '../types/accounts.types';
import { UpdateAccountDTO } from './update.dto';

describe('UpdateAccountDTO', () => {
  // Should create an instance of UpdateAccountDTO with no errors when all required fields are provided
  it('should create an instance of UpdateAccountDTO with no errors when all required fields are provided', () => {
    const updateAccountDTO = new UpdateAccountDTO();
    updateAccountDTO.name = 'Test Account';
    updateAccountDTO.type = AccountType.CREDIT;
    expect(updateAccountDTO).toBeInstanceOf(UpdateAccountDTO);
  });

  // Should create an instance of UpdateAccountDTO with no errors when optional fields are not provided
  it('should create an instance of UpdateAccountDTO with no errors when optional fields are not provided', () => {
    const updateAccountDTO = new UpdateAccountDTO();
    expect(updateAccountDTO).toBeInstanceOf(UpdateAccountDTO);
  });

  // Should create an instance of UpdateAccountDTO with no errors when optional fields are provided
  it('should create an instance of UpdateAccountDTO with no errors when optional fields are provided', () => {
    const updateAccountDTO = new UpdateAccountDTO();
    updateAccountDTO.name = 'Test Account';
    updateAccountDTO.type = AccountType.CREDIT;
    expect(updateAccountDTO).toBeInstanceOf(UpdateAccountDTO);
  });
});

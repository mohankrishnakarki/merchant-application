import {IUser} from './user.interface';

import {
  IMerchantApplication,
  ICreateMerchantApplication,
  IUpdateMerchantApplication,
} from './merchant-application.interface';

export interface IMerchantApplicationService {
  create(
    data: ICreateMerchantApplication,
    user: IUser,
  ): Promise<IMerchantApplication>;

  findOne(
    id: string,
    user: IUser,
  ): Promise<IMerchantApplication>;

  update(
    id: string,
    data: IUpdateMerchantApplication,
    user: IUser,
  ): Promise<IMerchantApplication>;

  submit(
    id: string,
    version: number,
    user: IUser,
  ): Promise<IMerchantApplication>;
}
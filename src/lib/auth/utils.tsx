import { getItem, removeItem, setItem } from '@/lib/storage';
import type { User } from '@/store/types';

const TOKEN = 'token';

export type TokenType = {
  access: string;
  refresh: string;
};

export type UserLoginResponse = {
  token: TokenType;
  user?: User;
};

export const getToken = () => getItem<TokenType>(TOKEN);
export const removeToken = () => removeItem(TOKEN);
export const setToken = (value: TokenType) => setItem<TokenType>(TOKEN, value);

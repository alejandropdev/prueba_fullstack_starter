import Decimal from 'decimal.js';

/**
 * Las columnas NUMERIC de Postgres llegan como string vía TypeORM (a propósito,
 * para no perder precisión). Usa estos helpers si necesitas sumar/restar/comparar
 * montos sin caer en errores de coma flotante de JS (nunca conviertas a `number`).
 */
export const MONEY_MAX = '999999999999.99';

export const toMoney = (value: string | number) => new Decimal(value);

export const addMoney = (a: string, b: string) => toMoney(a).plus(toMoney(b)).toFixed(2);

export const subtractMoney = (a: string, b: string) => toMoney(a).minus(toMoney(b)).toFixed(2);

export const isGreaterThan = (a: string, b: string) => toMoney(a).greaterThan(toMoney(b));

export const isEqualMoney = (a: string, b: string) => toMoney(a).equals(toMoney(b));

export const isPositiveMoney = (value: string) => toMoney(value).greaterThan(0);

export const isNegativeMoney = (value: string) => toMoney(value).isNegative();

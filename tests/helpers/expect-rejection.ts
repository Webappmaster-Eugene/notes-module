import { expect } from 'vitest';

type ErrorClass<T> = (abstract new (...args: never[]) => T) & { readonly name: string };

/**
 * Возвращает пойманную ошибку типизированной. Отдельная проверка на успешное
 * завершение нужна, чтобы «промис не упал» не проходил тест молча.
 */
export async function expectRejection<T>(
  promise: Promise<unknown>,
  errorClass: ErrorClass<T>,
): Promise<T> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(errorClass);

    return error as T;
  }

  return expect.fail(`ожидалась ошибка ${errorClass.name}, но промис завершился успешно`);
}

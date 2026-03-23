export async function apiJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload: unknown = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

    if (!res.ok) {
      let message = res.statusText || 'Erro desconhecido';
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const errorValue = (payload as { error?: unknown }).error;
        if (typeof errorValue === 'string' && errorValue.trim()) message = errorValue;
      }
      throw new Error(message);
    }

    return payload as T;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name?: unknown }).name === 'AbortError') {
      throw new Error('Tempo limite excedido. Tente novamente.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

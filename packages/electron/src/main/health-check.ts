export async function waitForHealth(
  baseUrl: string,
  token: string,
  timeoutMs: number,
): Promise<boolean> {
  const url = `${baseUrl}/api/health`;
  const start = Date.now();
  const intervalMs = 100;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Connection refused or timeout, keep trying
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

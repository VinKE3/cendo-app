type RateLimitConfig = {
  intervalMs: number;
  maxRequests: number;
};

type ClientRecord = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimiter {
  private cache = new Map<string, ClientRecord>();
  private intervalMs: number;
  private maxRequests: number;

  constructor({ intervalMs, maxRequests }: RateLimitConfig) {
    this.intervalMs = intervalMs;
    this.maxRequests = maxRequests;
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 5 * 60 * 1000).unref?.();
    }
  }

  public check(identifier: string): {
    success: boolean;
    limit: number;
    remaining: number;
    resetInSeconds: number;
  } {
    const now = Date.now();
    const record = this.cache.get(identifier);

    if (!record || now > record.resetAt) {
      this.cache.set(identifier, {
        count: 1,
        resetAt: now + this.intervalMs,
      });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetInSeconds: Math.ceil(this.intervalMs / 1000),
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (now > record.resetAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const authLimiter = new MemoryRateLimiter({ intervalMs: 60 * 1000, maxRequests: 5 });
export const mutationLimiter = new MemoryRateLimiter({ intervalMs: 10 * 1000, maxRequests: 10 });

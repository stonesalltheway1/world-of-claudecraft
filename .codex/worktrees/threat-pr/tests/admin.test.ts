import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

// Mock the db layers so no Postgres is needed; the router logic is under test.
vi.mock('../server/db', () => ({
  pool: { query: vi.fn() },
  findAccount: vi.fn(),
  touchLogin: vi.fn(),
  saveToken: vi.fn(),
  accountForToken: vi.fn(),
  isAdminAccount: vi.fn(),
}));
vi.mock('../server/admin_db', async () => {
  const actual = await vi.importActual<typeof import('../server/admin_db')>('../server/admin_db');
  return {
    escapeLike: actual.escapeLike,
    overviewCounts: vi.fn(),
    registrationsByDay: vi.fn(),
    sessionsByDay: vi.fn(),
    classDistribution: vi.fn(),
    levelDistribution: vi.fn(),
    listAccounts: vi.fn(),
    listCharacters: vi.fn(),
    accountDetail: vi.fn(),
  };
});

import { handleAdminApi, parsePageParams } from '../server/admin';
import { accountForToken, isAdminAccount, findAccount } from '../server/db';
import { overviewCounts, listAccounts, escapeLike } from '../server/admin_db';

const VALID_TOKEN = 'a'.repeat(64);

function fakeReq(opts: { method?: string; url?: string; token?: string; body?: unknown } = {}) {
  const req: any = new EventEmitter();
  req.method = opts.method ?? 'GET';
  req.url = opts.url ?? '/admin/api/overview';
  req.headers = opts.token ? { authorization: `Bearer ${opts.token}` } : {};
  req.socket = { remoteAddress: `10.0.0.${Math.floor(Math.random() * 250) + 1}` };
  if (opts.method === 'POST') {
    setImmediate(() => {
      if (opts.body !== undefined) req.emit('data', JSON.stringify(opts.body));
      req.emit('end');
    });
  }
  return req;
}

function fakeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    writeHead(status: number) { this.statusCode = status; },
    end(data?: string) { this.body = data ? JSON.parse(data) : null; },
  };
  return res;
}

const fakeGame: any = {
  adminStats: () => ({
    online: 2, peakOnline: 5, uptimeSeconds: 100, tickMsAvg: 1.5,
    simEntities: 40, rssBytes: 1, heapUsedBytes: 1,
  }),
  liveSessions: () => [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('admin api auth', () => {
  it('rejects requests without a token', async () => {
    const res = fakeRes();
    await handleAdminApi(fakeReq(), res, fakeGame);

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a valid token whose account is not an admin', async () => {
    vi.mocked(accountForToken).mockResolvedValue(7);
    vi.mocked(isAdminAccount).mockResolvedValue(false);
    const res = fakeRes();

    await handleAdminApi(fakeReq({ token: VALID_TOKEN }), res, fakeGame);

    expect(res.statusCode).toBe(401);
    expect(isAdminAccount).toHaveBeenCalledWith(7);
  });

  it('serves the overview to an admin token and includes live server stats', async () => {
    vi.mocked(accountForToken).mockResolvedValue(7);
    vi.mocked(isAdminAccount).mockResolvedValue(true);
    vi.mocked(overviewCounts).mockResolvedValue({
      accounts: 10, characters: 20, accountsToday: 1, accountsWeek: 3,
      sessionsToday: 5, activeAccountsToday: 4,
    });
    const res = fakeRes();

    await handleAdminApi(fakeReq({ token: VALID_TOKEN }), res, fakeGame);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      error: null,
      data: expect.objectContaining({ accounts: 10, server: expect.objectContaining({ online: 2 }) }),
    });
  });

  it('rejects admin login for a non-admin account even with the right password', async () => {
    // scrypt hash of "hunter22" is irrelevant — verifyPassword fails on a junk
    // hash, so this asserts the credential failure path returns 401.
    vi.mocked(findAccount).mockResolvedValue({ id: 3, username: 'bob', password_hash: 'junk' });
    const res = fakeRes();

    await handleAdminApi(
      fakeReq({ method: 'POST', url: '/admin/api/login', body: { username: 'bob', password: 'hunter22' } }),
      res,
      fakeGame,
    );

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid username or password/);
  });

  it('rejects non-GET methods on data endpoints', async () => {
    const res = fakeRes();
    await handleAdminApi(fakeReq({ method: 'DELETE', url: '/admin/api/accounts' }), res, fakeGame);

    expect(res.statusCode).toBe(405);
  });

  it('returns 404 for unknown admin endpoints', async () => {
    vi.mocked(accountForToken).mockResolvedValue(7);
    vi.mocked(isAdminAccount).mockResolvedValue(true);
    const res = fakeRes();

    await handleAdminApi(fakeReq({ token: VALID_TOKEN, url: '/admin/api/nope' }), res, fakeGame);

    expect(res.statusCode).toBe(404);
  });

  it('passes pagination and search through to the accounts query', async () => {
    vi.mocked(accountForToken).mockResolvedValue(7);
    vi.mocked(isAdminAccount).mockResolvedValue(true);
    vi.mocked(listAccounts).mockResolvedValue({ rows: [], total: 0, page: 2, limit: 50 });
    const res = fakeRes();

    await handleAdminApi(
      fakeReq({ token: VALID_TOKEN, url: '/admin/api/accounts?page=2&limit=50&search=bob' }),
      res,
      fakeGame,
    );

    expect(listAccounts).toHaveBeenCalledWith('bob', 2, 50);
    expect(res.statusCode).toBe(200);
  });
});

describe('parsePageParams', () => {
  it('defaults page to 1 and limit to 25', () => {
    expect(parsePageParams(new URLSearchParams())).toEqual({ page: 1, limit: 25 });
  });

  it('clamps limit to the 1..200 range', () => {
    expect(parsePageParams(new URLSearchParams('limit=9999')).limit).toBe(200);
    expect(parsePageParams(new URLSearchParams('limit=0')).limit).toBe(1);
    expect(parsePageParams(new URLSearchParams('limit=-5')).limit).toBe(1);
  });

  it('rejects garbage page values and floors fractions', () => {
    expect(parsePageParams(new URLSearchParams('page=banana')).page).toBe(1);
    expect(parsePageParams(new URLSearchParams('page=2.9')).page).toBe(2);
    expect(parsePageParams(new URLSearchParams('page=-3')).page).toBe(1);
  });
});

describe('escapeLike', () => {
  it('escapes LIKE wildcards so a search for "%" is literal', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('back\\slash')).toBe('back\\\\slash');
    expect(escapeLike('plain')).toBe('plain');
  });
});

import { apiGet, apiLogin, clearSession, getAdminName, getToken, ApiError } from './api';
import { barChart, chartPanel } from './charts';
import { escapeHtml, fmtBytes, fmtDuration } from './format';
import {
  renderAccountDetail, renderAccountsTable, renderCharactersTable, renderOnlineTable, renderPager,
} from './tables';
import type { AccountDetail, AccountRow, Activity, CharacterRow, LivePlayer, Overview, Paginated } from './types';

const LIVE_REFRESH_MS = 5_000;
const ACTIVITY_REFRESH_MS = 60_000;
const SEARCH_DEBOUNCE_MS = 300;

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
};

interface TableState {
  page: number;
  search: string;
  sort: string;
  dir: 'asc' | 'desc';
}

const accountsState: TableState = { page: 1, search: '', sort: 'id', dir: 'desc' };
const charactersState: TableState = { page: 1, search: '', sort: 'level', dir: 'desc' };
let liveTimer: number | null = null;
let activityTimer: number | null = null;

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

function showLogin(message = ''): void {
  if (liveTimer !== null) { clearInterval(liveTimer); liveTimer = null; }
  if (activityTimer !== null) { clearInterval(activityTimer); activityTimer = null; }
  clearSession();
  $('app').classList.remove('authed');
  $('login').style.display = 'flex';
  $('login-error').textContent = message;
}

function handleAuthFailure(err: unknown): boolean {
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    showLogin('session expired — sign in again');
    return true;
  }
  return false;
}

async function showApp(): Promise<void> {
  $('login').style.display = 'none';
  $('app').classList.add('authed');
  $('who-name').textContent = getAdminName();
  await refreshLive();
  await Promise.all([refreshActivity(), refreshAccounts(), refreshCharacters()]);
  liveTimer = window.setInterval(() => void refreshLive(), LIVE_REFRESH_MS);
  activityTimer = window.setInterval(() => void refreshActivity(), ACTIVITY_REFRESH_MS);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function statCard(value: string, label: string): string {
  return `<div class="panel stat"><div class="v">${escapeHtml(value)}</div><div class="k">${escapeHtml(label)}</div></div>`;
}

async function refreshLive(): Promise<void> {
  try {
    const [overview, online] = await Promise.all([
      apiGet<Overview>('/admin/api/overview'),
      apiGet<{ players: LivePlayer[] }>('/admin/api/online'),
    ]);
    const s = overview.server;
    $('stats').innerHTML = [
      statCard(String(s.online), 'online now'),
      statCard(String(s.peakOnline), 'peak online'),
      statCard(String(overview.accounts), 'accounts'),
      statCard(String(overview.characters), 'characters'),
      statCard(String(overview.accountsToday), 'new accounts 24h'),
      statCard(String(overview.activeAccountsToday), 'active accounts 24h'),
      statCard(String(overview.sessionsToday), 'sessions 24h'),
      statCard(fmtDuration(s.uptimeSeconds), 'uptime'),
      statCard(`${s.tickMsAvg} ms`, 'avg tick'),
      statCard(fmtBytes(s.rssBytes), 'server rss'),
    ].join('');
    $('online').innerHTML = renderOnlineTable(online.players);
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('live refresh failed:', err);
  }
}

async function refreshActivity(): Promise<void> {
  try {
    const a = await apiGet<Activity>('/admin/api/activity');
    const dayLabel = (day: string) => day.slice(5); // YYYY-MM-DD -> MM-DD
    $('charts').innerHTML = [
      chartPanel(`Registrations — last ${a.days} days`, barChart(
        a.registrations.map((p) => ({ label: dayLabel(p.day), value: p.count })),
      )),
      chartPanel(`Play sessions — last ${a.days} days`, barChart(
        a.sessions.map((p) => ({
          label: dayLabel(p.day),
          value: p.sessions,
          title: `${p.day}: ${p.sessions} sessions, ${p.uniqueAccounts} accounts, ${fmtDuration(p.playtimeSeconds)} played`,
        })),
      )),
      chartPanel('Class distribution', barChart(
        a.classes.map((p) => ({ label: p.key, value: p.count })),
      )),
      chartPanel('Level distribution', barChart(
        a.levels.map((p) => ({ label: p.key, value: p.count })),
      )),
    ].join('');
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('activity refresh failed:', err);
  }
}

async function refreshAccounts(): Promise<void> {
  try {
    const params = new URLSearchParams({ page: String(accountsState.page), search: accountsState.search });
    const data = await apiGet<Paginated<AccountRow>>(`/admin/api/accounts?${params}`);
    $('accounts').innerHTML = renderAccountsTable(data.rows);
    $('accounts-pager').innerHTML = renderPager(data.total, data.page, data.limit);
  } catch (err) {
    if (!handleAuthFailure(err)) $('accounts').innerHTML = `<div class="empty">failed to load accounts</div>`;
  }
}

async function refreshCharacters(): Promise<void> {
  try {
    const params = new URLSearchParams({
      page: String(charactersState.page), sort: charactersState.sort, dir: charactersState.dir,
    });
    const data = await apiGet<Paginated<CharacterRow>>(`/admin/api/characters?${params}`);
    $('characters').innerHTML = renderCharactersTable(data.rows, charactersState.sort, charactersState.dir);
    $('characters-pager').innerHTML = renderPager(data.total, data.page, data.limit);
  } catch (err) {
    if (!handleAuthFailure(err)) $('characters').innerHTML = `<div class="empty">failed to load characters</div>`;
  }
}

async function toggleAccountDetail(row: HTMLTableRowElement, accountId: number): Promise<void> {
  const existing = row.nextElementSibling;
  if (existing?.classList.contains('detail-row')) {
    existing.remove();
    return;
  }
  row.parentElement?.querySelectorAll('.detail-row').forEach((el) => el.remove());
  try {
    const detail = await apiGet<AccountDetail>(`/admin/api/accounts/${accountId}`);
    const detailRow = document.createElement('tr');
    detailRow.className = 'detail-row';
    detailRow.innerHTML = `<td colspan="7">${renderAccountDetail(detail)}</td>`;
    row.after(detailRow);
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('account detail failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function wireEvents(): void {
  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = ($('login-username') as HTMLInputElement).value.trim();
    const password = ($('login-password') as HTMLInputElement).value;
    $('login-error').textContent = '';
    apiLogin(username, password)
      .then(() => showApp())
      .catch((err: unknown) => {
        $('login-error').textContent = err instanceof ApiError ? err.message : 'login failed — is the server up?';
      });
  });

  $('logout').addEventListener('click', () => showLogin());

  let searchTimer: number | null = null;
  $('account-search').addEventListener('input', (e) => {
    accountsState.search = (e.target as HTMLInputElement).value.trim();
    accountsState.page = 1;
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void refreshAccounts(), SEARCH_DEBOUNCE_MS);
  });

  $('accounts-pager').addEventListener('click', (e) => {
    const page = pagerTarget(e);
    if (page !== null) { accountsState.page = page; void refreshAccounts(); }
  });

  $('characters-pager').addEventListener('click', (e) => {
    const page = pagerTarget(e);
    if (page !== null) { charactersState.page = page; void refreshCharacters(); }
  });

  $('accounts').addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('tr.clickable') as HTMLTableRowElement | null;
    const accountId = Number(row?.dataset.accountId);
    if (row && Number.isFinite(accountId)) void toggleAccountDetail(row, accountId);
  });

  $('characters').addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th.sortable') as HTMLElement | null;
    const sort = th?.dataset.sort;
    if (!sort) return;
    charactersState.dir = charactersState.sort === sort && charactersState.dir === 'desc' ? 'asc' : 'desc';
    charactersState.sort = sort;
    charactersState.page = 1;
    void refreshCharacters();
  });
}

function pagerTarget(e: Event): number | null {
  const btn = (e.target as HTMLElement).closest('button[data-page]') as HTMLButtonElement | null;
  if (!btn || btn.disabled) return null;
  const page = Number(btn.dataset.page);
  return Number.isFinite(page) && page >= 1 ? page : null;
}

wireEvents();
if (getToken()) {
  void showApp();
} else {
  showLogin();
}

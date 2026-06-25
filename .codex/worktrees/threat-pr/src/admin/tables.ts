import { escapeHtml, fmtCopper, fmtDate, fmtDuration, fmtRelative } from './format';
import type { AccountDetail, AccountRow, CharacterRow, LivePlayer } from './types';

// Pure HTML-string renderers for the dashboard tables. All dynamic values go
// through escapeHtml — usernames and character names are player-controlled.

export function renderOnlineTable(players: LivePlayer[]): string {
  if (players.length === 0) return '<div class="empty">nobody online right now</div>';
  const rows = players.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.class)}</td>
      <td class="num">${p.level}</td>
      <td>${escapeHtml(p.zone)}</td>
      <td class="num">${Math.round(p.x)}, ${Math.round(p.z)}</td>
      <td class="num">${p.hp}/${p.maxHp}</td>
      <td class="num">${fmtDuration(p.sessionSeconds)}</td>
      <td class="num">${fmtDuration(p.lastSaveSecondsAgo)} ago</td>
      <td class="num">${p.accountId}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      <th>Character</th><th>Class</th><th class="num">Lvl</th><th>Zone</th>
      <th class="num">Pos</th><th class="num">HP</th><th class="num">Session</th>
      <th class="num">Last save</th><th class="num">Acct</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export function renderAccountsTable(rows: AccountRow[]): string {
  if (rows.length === 0) return '<div class="empty">no accounts match</div>';
  const body = rows.map((a) => `
    <tr class="clickable" data-account-id="${a.id}">
      <td class="num">${a.id}</td>
      <td>${escapeHtml(a.username)}${a.isAdmin ? ' <span class="badge">admin</span>' : ''}</td>
      <td class="num">${a.characterCount}</td>
      <td class="num">${a.maxLevel}</td>
      <td class="num">${fmtDuration(a.playtimeSeconds)}</td>
      <td>${fmtDate(a.createdAt)}</td>
      <td>${fmtRelative(a.lastLogin)}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      <th class="num">ID</th><th>Username</th><th class="num">Chars</th><th class="num">Max lvl</th>
      <th class="num">Playtime</th><th>Registered</th><th>Last login</th>
    </tr></thead>
    <tbody>${body.join('')}</tbody>
  </table>`;
}

export function renderAccountDetail(d: AccountDetail): string {
  const chars = d.characters.length === 0
    ? '<div class="empty">no characters</div>'
    : `<table><thead><tr><th>Name</th><th>Class</th><th class="num">Lvl</th><th class="num">XP</th><th class="num">Money</th><th class="num">Pos</th><th>Last played</th></tr></thead><tbody>${
        d.characters.map((c) => `
          <tr>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.class)}</td>
            <td class="num">${c.level}</td>
            <td class="num">${c.xp}</td>
            <td class="num">${fmtCopper(c.copper)}</td>
            <td class="num">${c.pos ? `${Math.round(c.pos.x)}, ${Math.round(c.pos.z)}` : '—'}</td>
            <td>${fmtRelative(c.updatedAt)}</td>
          </tr>`).join('')
      }</tbody></table>`;
  const sessions = d.recentSessions.length === 0
    ? '<div class="empty">no sessions recorded</div>'
    : `<table><thead><tr><th>Character</th><th>Started</th><th class="num">Length</th></tr></thead><tbody>${
        d.recentSessions.map((s) => `
          <tr>
            <td>${escapeHtml(s.characterName)}</td>
            <td>${fmtDate(s.startedAt)}</td>
            <td class="num">${s.endedAt ? fmtDuration(s.seconds) : 'online now'}</td>
          </tr>`).join('')
      }</tbody></table>`;
  return `<div class="detail-grid">
    <div><h4>Characters</h4>${chars}</div>
    <div><h4>Recent sessions — total playtime ${fmtDuration(d.playtimeSeconds)}</h4>${sessions}</div>
  </div>`;
}

export function renderCharactersTable(rows: CharacterRow[], sort: string, dir: string): string {
  if (rows.length === 0) return '<div class="empty">no characters yet</div>';
  const arrow = (col: string) => (sort === col ? (dir === 'asc' ? ' ▲' : ' ▼') : '');
  const sortableHeader = (col: string, label: string, numeric = false) =>
    `<th class="sortable${numeric ? ' num' : ''}" data-sort="${col}">${label}${arrow(col)}</th>`;
  const body = rows.map((c) => `
    <tr>
      <td class="num">${c.id}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.class)}</td>
      <td class="num">${c.level}</td>
      <td class="num">${c.xp}</td>
      <td class="num">${fmtCopper(c.copper)}</td>
      <td>${escapeHtml(c.username)}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td>${fmtRelative(c.updatedAt)}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      ${sortableHeader('id', 'ID', true)}
      ${sortableHeader('name', 'Name')}
      ${sortableHeader('class', 'Class')}
      ${sortableHeader('level', 'Lvl', true)}
      <th class="num">XP</th><th class="num">Money</th><th>Account</th>
      ${sortableHeader('created_at', 'Created')}
      ${sortableHeader('updated_at', 'Last played')}
    </tr></thead>
    <tbody>${body.join('')}</tbody>
  </table>`;
}

export function renderPager(total: number, page: number, limit: number): string {
  const pages = Math.max(1, Math.ceil(total / limit));
  return `
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ prev</button>
    <span>page ${page} / ${pages} — ${total} total</span>
    <button data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>next ›</button>`;
}

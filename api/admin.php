<?php
/* ============================================================================
   EGAC CONSTRUCTION — REQUESTS ADMIN
   ----------------------------------------------------------------------------
   A single password-protected page that lists everything the contact form has
   collected, lets staff move a request through its statuses, add an internal
   note, and download the whole table as CSV or XLSX.

   Set the password in api/config.php → admin.password
   Reach it at:  https://your-domain.com/api/admin.php

   This is deliberately small: no user accounts, no framework, nothing to keep
   patched. If several people need separate logins, that is the point to move
   to a proper admin application.
   ========================================================================== */

declare(strict_types=1);

define('EGAC_APP', true);
require __DIR__ . '/lib.php';

$config = egac_config();
$admin  = $config['admin'] ?? [];

if (empty($admin['enabled'])) {
    http_response_code(404);
    exit('Not found');
}

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();

$notice = '';

/* ------------------------------------------------------------------ logout */
if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: admin.php');
    exit;
}

/* ------------------------------------------------------------------- login */
if (empty($_SESSION['egac_admin'])) {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['password'])) {
        $given = (string) $_POST['password'];
        $real  = (string) ($admin['password'] ?? '');

        /* A blank password in config must never unlock anything. */
        if ($real !== '' && hash_equals($real, $given)) {
            session_regenerate_id(true);
            $_SESSION['egac_admin'] = true;
            $_SESSION['egac_token'] = bin2hex(random_bytes(16));
            header('Location: admin.php');
            exit;
        }
        /* Slow down guessing without holding a worker for long. */
        usleep(400000);
        $notice = $real === ''
            ? 'No admin password is set in api/config.php.'
            : 'That password was not accepted.';
    }

    egac_admin_login($notice);
    exit;
}

$token = $_SESSION['egac_token'] ?? '';

/* -------------------------------------------------------------- mutations */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['action'])) {
    if (!hash_equals($token, (string) ($_POST['token'] ?? ''))) {
        http_response_code(400);
        exit('Bad request token.');
    }

    $id = (int) ($_POST['id'] ?? 0);

    if ($_POST['action'] === 'status' && $id > 0) {
        $allowed = ['New', 'In progress', 'Quoted', 'Won', 'Lost', 'Spam'];
        $status  = (string) ($_POST['status'] ?? '');
        if (in_array($status, $allowed, true)) {
            $stmt = egac_db()->prepare('UPDATE clients SET status = :s WHERE id = :id');
            $stmt->execute([':s' => $status, ':id' => $id]);
        }
    }

    if ($_POST['action'] === 'note' && $id > 0) {
        $note = mb_substr(trim((string) ($_POST['notes'] ?? '')), 0, 2000, 'UTF-8');
        $stmt = egac_db()->prepare('UPDATE clients SET notes = :n WHERE id = :id');
        $stmt->execute([':n' => $note !== '' ? $note : null, ':id' => $id]);
    }

    $back = 'admin.php?status=' . urlencode((string) ($_POST['filter'] ?? 'all'))
          . '&page=' . (int) ($_POST['page'] ?? 1);
    header('Location: ' . $back);
    exit;
}

/* ------------------------------------------------------------------ listing */
$perPage = 25;
$page    = max(1, (int) ($_GET['page'] ?? 1));
$filter  = (string) ($_GET['status'] ?? 'all');
$search  = trim((string) ($_GET['q'] ?? ''));

$where = [];
$params = [];
if ($filter !== 'all' && $filter !== '') {
    $where[] = 'status = :status';
    $params[':status'] = $filter;
}
if ($search !== '') {
    $where[] = '(full_name LIKE :q OR company_name LIKE :q OR email LIKE :q OR phone LIKE :q OR project_location LIKE :q)';
    $params[':q'] = '%' . $search . '%';
}
$clause = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

$countStmt = egac_db()->prepare('SELECT COUNT(*) FROM clients' . $clause);
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();
$pages = max(1, (int) ceil($total / $perPage));
$page  = min($page, $pages);

$listStmt = egac_db()->prepare(
    'SELECT * FROM clients' . $clause . ' ORDER BY id DESC LIMIT :limit OFFSET :offset'
);
foreach ($params as $key => $value) {
    $listStmt->bindValue($key, $value);
}
$listStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$listStmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
$listStmt->execute();
$rows = $listStmt->fetchAll();

$statsStmt = egac_db()->query('SELECT status, COUNT(*) AS n FROM clients GROUP BY status');
$counts = [];
foreach ($statsStmt->fetchAll() as $row) {
    $counts[$row['status']] = (int) $row['n'];
}

egac_admin_page($rows, $counts, $total, $page, $pages, $filter, $search, $token);


/* ========================================================== presentation */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function egac_admin_head(string $title): void
{
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="robots" content="noindex, nofollow">';
    echo '<title>' . e($title) . '</title><style>';
    echo '
    :root { --navy:#0B1C30; --gold:#BF882C; --paper:#F6F6F4; --line:#E1E3E6; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--navy);
           font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
    a { color:var(--navy); }
    header { background:var(--navy); color:#fff; padding:18px 22px; display:flex;
             align-items:center; gap:18px; flex-wrap:wrap; }
    header h1 { font-size:16px; letter-spacing:.14em; text-transform:uppercase; margin:0; font-weight:600; }
    header a { color:#fff; opacity:.75; text-decoration:none; font-size:13px; }
    header a:hover { opacity:1; }
    header .spacer { margin-left:auto; }
    main { padding:22px; max-width:1500px; margin:0 auto; }
    .bar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:18px; }
    .chip { display:inline-block; padding:7px 13px; border:1px solid var(--line); background:#fff;
            text-decoration:none; font-size:13px; border-radius:2px; }
    .chip.is-on { background:var(--navy); color:#fff; border-color:var(--navy); }
    .chip b { color:var(--gold); margin-left:6px; }
    .chip.is-on b { color:var(--gold); }
    input[type=text], input[type=password], textarea, select {
      font:inherit; padding:9px 11px; border:1px solid var(--line); background:#fff; border-radius:2px; }
    button { font:inherit; padding:9px 14px; background:var(--navy); color:#fff; border:0;
             border-radius:2px; cursor:pointer; }
    button.ghost { background:#fff; color:var(--navy); border:1px solid var(--line); }
    table { width:100%; border-collapse:collapse; background:#fff; font-size:14px; }
    th, td { text-align:left; padding:12px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
    th { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#6B7684; background:#fff; }
    tr:hover td { background:#FAFAF8; }
    .who b { display:block; font-size:15px; }
    .muted { color:#6B7684; font-size:13px; }
    .details { max-width:420px; white-space:pre-wrap; }
    .status { display:inline-block; padding:3px 9px; border-radius:2px; font-size:12px;
              background:#EEF0F2; }
    .status.New { background:var(--gold); color:#fff; }
    .status.Won { background:#1E6F44; color:#fff; }
    .status.Lost, .status.Spam { background:#8A8F96; color:#fff; }
    .row-actions { display:flex; gap:6px; flex-wrap:wrap; align-items:flex-start; }
    .empty { padding:60px 20px; text-align:center; color:#6B7684; background:#fff; }
    .login { max-width:340px; margin:14vh auto; background:#fff; padding:30px;
             border:1px solid var(--line); }
    .login h1 { font-size:15px; letter-spacing:.14em; text-transform:uppercase; }
    .login input { width:100%; margin:14px 0; }
    .login button { width:100%; }
    .notice { background:#FDECEC; border:1px solid #F3C6C6; padding:10px 12px; font-size:13px; }
    .pager { display:flex; gap:8px; margin-top:18px; align-items:center; }
    @media (max-width:900px){ td .details { max-width:none; } table, thead, tbody, th, td, tr { display:block; }
      thead { display:none; } td { border:0; } tr { display:block; border-bottom:1px solid var(--line); padding:8px 0; } }
    ';
    echo '</style></head><body>';
}

function egac_admin_login(string $notice): void
{
    egac_admin_head('EGAC — sign in');
    echo '<div class="login"><h1>EGAC requests</h1>';
    if ($notice !== '') {
        echo '<p class="notice">' . e($notice) . '</p>';
    }
    echo '<form method="post">';
    echo '<label for="p" class="muted">Admin password</label>';
    echo '<input id="p" type="password" name="password" autocomplete="current-password" autofocus required>';
    echo '<button type="submit">Sign in</button>';
    echo '</form></div></body></html>';
}

function egac_admin_page(array $rows, array $counts, int $total, int $page, int $pages,
                         string $filter, string $search, string $token): void
{
    $statuses = ['New', 'In progress', 'Quoted', 'Won', 'Lost', 'Spam'];

    egac_admin_head('EGAC — client requests');

    echo '<header><h1>EGAC client requests</h1>';
    echo '<span class="muted" style="color:#9FB0C2">' . (int) $total . ' shown</span>';
    echo '<span class="spacer"></span>';
    echo '<a href="export.php?status=' . urlencode($filter) . '">Download CSV</a>';
    echo '<a href="export.php?format=xlsx&status=' . urlencode($filter) . '">Download XLSX</a>';
    echo '<a href="admin.php?logout=1">Sign out</a>';
    echo '</header><main>';

    echo '<div class="bar">';
    echo '<a class="chip' . ($filter === 'all' ? ' is-on' : '') . '" href="admin.php">All</a>';
    foreach ($statuses as $s) {
        $on = $filter === $s ? ' is-on' : '';
        echo '<a class="chip' . $on . '" href="admin.php?status=' . urlencode($s) . '">' . e($s);
        if (!empty($counts[$s])) {
            echo '<b>' . (int) $counts[$s] . '</b>';
        }
        echo '</a>';
    }
    echo '<form method="get" style="margin-left:auto;display:flex;gap:8px">';
    echo '<input type="hidden" name="status" value="' . e($filter) . '">';
    echo '<input type="text" name="q" value="' . e($search) . '" placeholder="Name, company, email…" aria-label="Search">';
    echo '<button class="ghost" type="submit">Search</button>';
    echo '</form></div>';

    if (!$rows) {
        echo '<div class="empty">No requests here yet.</div>';
        echo '</main></body></html>';
        return;
    }

    echo '<table><thead><tr>';
    echo '<th>#</th><th>Client</th><th>Project</th><th>Details</th><th>Received</th><th>Status</th>';
    echo '</tr></thead><tbody>';

    foreach ($rows as $r) {
        $files = json_decode((string) ($r['attachments'] ?? ''), true);
        echo '<tr>';
        echo '<td class="muted">' . (int) $r['id'] . '</td>';

        echo '<td class="who"><b>' . e($r['full_name']) . '</b>';
        echo '<span class="muted">' . e($r['company_name']) . '</span><br>';
        echo '<a href="tel:' . e($r['phone']) . '">' . e($r['phone']) . '</a><br>';
        echo '<a href="mailto:' . e($r['email']) . '">' . e($r['email']) . '</a></td>';

        echo '<td>' . e($r['service']) . '<br><span class="muted">' . e($r['project_type']) . '</span><br>';
        echo '<span class="muted">' . e($r['project_location']) . '</span>';
        if (!empty($r['project_size'])) {
            echo '<br><span class="muted">' . e($r['project_size']) . '</span>';
        }
        echo '</td>';

        echo '<td><div class="details">' . e($r['project_details']) . '</div>';
        if (is_array($files) && $files) {
            echo '<p class="muted">Files: ';
            $links = [];
            foreach ($files as $f) {
                $links[] = e($f['original'] ?? $f['file'] ?? '');
            }
            echo implode(', ', $links) . ' <em>(in api/storage/uploads)</em></p>';
        }
        echo '<form method="post" style="margin-top:8px;display:flex;gap:6px">';
        echo '<input type="hidden" name="token" value="' . e($token) . '">';
        echo '<input type="hidden" name="action" value="note">';
        echo '<input type="hidden" name="id" value="' . (int) $r['id'] . '">';
        echo '<input type="hidden" name="filter" value="' . e($filter) . '">';
        echo '<input type="hidden" name="page" value="' . (int) $page . '">';
        echo '<input type="text" name="notes" value="' . e($r['notes']) . '" placeholder="Internal note" style="flex:1">';
        echo '<button class="ghost" type="submit">Save</button>';
        echo '</form></td>';

        echo '<td class="muted">' . e($r['created_at']) . '<br>' . e(strtoupper((string) $r['language'])) . '</td>';

        echo '<td><span class="status ' . e($r['status']) . '">' . e($r['status']) . '</span>';
        echo '<form method="post" class="row-actions" style="margin-top:8px">';
        echo '<input type="hidden" name="token" value="' . e($token) . '">';
        echo '<input type="hidden" name="action" value="status">';
        echo '<input type="hidden" name="id" value="' . (int) $r['id'] . '">';
        echo '<input type="hidden" name="filter" value="' . e($filter) . '">';
        echo '<input type="hidden" name="page" value="' . (int) $page . '">';
        echo '<select name="status" aria-label="Status">';
        foreach ($statuses as $s) {
            $sel = $s === $r['status'] ? ' selected' : '';
            echo '<option value="' . e($s) . '"' . $sel . '>' . e($s) . '</option>';
        }
        echo '</select><button type="submit">Set</button>';
        echo '</form></td>';
        echo '</tr>';
    }

    echo '</tbody></table>';

    if ($pages > 1) {
        echo '<div class="pager">';
        $base = 'admin.php?status=' . urlencode($filter) . '&q=' . urlencode($search) . '&page=';
        if ($page > 1) {
            echo '<a class="chip" href="' . e($base . (string) ($page - 1)) . '">Previous</a>';
        }
        echo '<span class="muted">Page ' . (int) $page . ' of ' . (int) $pages . '</span>';
        if ($page < $pages) {
            echo '<a class="chip" href="' . e($base . (string) ($page + 1)) . '">Next</a>';
        }
        echo '</div>';
    }

    echo '</main></body></html>';
}

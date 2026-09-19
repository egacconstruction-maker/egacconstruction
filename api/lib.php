<?php
/* ============================================================================
   EGAC CONSTRUCTION — SHARED BACKEND HELPERS
   Database connection, input handling, validation, rate limiting and uploads.
   Included by submit.php, admin.php and export.php. Never called directly.
   ========================================================================== */

declare(strict_types=1);

if (!defined('EGAC_APP')) {
    http_response_code(403);
    exit('Forbidden');
}

/* ---------------------------------------------------------------- mbstring
   Hostinger ships mbstring, but the site must not fall over on a host that
   does not. These stand-ins keep every call below working either way.
   ------------------------------------------------------------------------ */
if (!function_exists('mb_substr')) {
    function mb_substr($string, $start, $length = null, $encoding = null)
    {
        return $length === null ? substr($string, $start) : substr($string, $start, $length);
    }
}
if (!function_exists('mb_strlen')) {
    function mb_strlen($string, $encoding = null)
    {
        return strlen($string);
    }
}

/* ------------------------------------------------------------------ config */
function egac_config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/config.php';
        if (!is_file($path)) {
            egac_fail(500, 'The backend is not configured yet (api/config.php is missing).');
        }
        $config = require $path;
    }
    return $config;
}

/* ------------------------------------------------------------- JSON output */
function egac_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Generic failure. The visitor never sees database internals. */
function egac_fail(int $status, string $message, array $fields = []): void
{
    $payload = ['ok' => false, 'message' => $message];
    if ($fields) {
        $payload['fields'] = $fields;
    }
    egac_json($status, $payload);
}

/* -------------------------------------------------------------- database */
function egac_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = egac_config()['db'];
    if ($db['name'] === '' || $db['user'] === '') {
        egac_fail(500, 'The database is not configured yet. See api/config.php.');
    }

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $db['host'],
        $db['name'],
        $db['charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,   /* real prepared statements */
        ]);
    } catch (PDOException $e) {
        /* Log for the operator, stay vague for the visitor. */
        error_log('[EGAC] Database connection failed: ' . $e->getMessage());
        egac_fail(503, 'We could not save your request right now. Please try again shortly.');
    }

    return $pdo;
}

/* ----------------------------------------------------------------- input */
/** Trimmed POST field with control characters and line-break injection removed. */
function egac_field(string $key, int $max = 255, bool $multiline = false): string
{
    $value = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $value = str_replace("\0", '', $value);

    if ($multiline) {
        $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value);
        $value = preg_replace("/\r\n?/", "\n", $value);
    } else {
        $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value);
    }

    $value = trim(preg_replace('/[ \t]{2,}/', ' ', (string) $value));

    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
}

/** A value is only accepted when it is one of ours — never free text. */
function egac_in_list(string $value, array $allowed): bool
{
    return $value !== '' && in_array($value, $allowed, true);
}

function egac_valid_phone(string $phone): bool
{
    if (!preg_match('/^[+()\-\s.\d]{7,22}$/', $phone)) {
        return false;
    }
    return strlen(preg_replace('/\D/', '', $phone)) >= 7;
}

/* ------------------------------------------------------------------- client */
/** Binds the packed IP, or a real NULL when the address could not be read. */
function egac_bind_ip(PDOStatement $stmt, string $placeholder): void
{
    $ip = egac_ip();
    if ($ip === null) {
        $stmt->bindValue($placeholder, null, PDO::PARAM_NULL);
        return;
    }
    $stmt->bindValue($placeholder, $ip, PDO::PARAM_LOB);
}

function egac_ip(): ?string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $packed = @inet_pton($ip);
    return $packed === false ? null : $packed;
}

function egac_ip_readable(?string $packed): string
{
    if ($packed === null || $packed === '') {
        return '';
    }
    $ip = @inet_ntop($packed);
    return $ip === false ? '' : $ip;
}

/* --------------------------------------------------------------- logging */
function egac_log_attempt(string $outcome): void
{
    try {
        $stmt = egac_db()->prepare(
            'INSERT INTO submission_log (ip_address, outcome) VALUES (:ip, :outcome)'
        );
        egac_bind_ip($stmt, ':ip');
        $stmt->bindValue(':outcome', $outcome);
        $stmt->execute();
    } catch (PDOException $e) {
        error_log('[EGAC] submission_log write failed: ' . $e->getMessage());
    }
}

/* --------------------------------------------------------- rate limiting */
/** True when this IP has already sent more than its hourly allowance. */
function egac_rate_limited(): bool
{
    $limit = (int) (egac_config()['limits']['per_ip_per_hour'] ?? 6);
    if ($limit <= 0) {
        return false;
    }

    $ip = egac_ip();
    if ($ip === null) {
        return false;
    }

    try {
        $stmt = egac_db()->prepare(
            'SELECT COUNT(*) FROM submission_log
              WHERE ip_address = :ip
                AND outcome = "stored"
                AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 HOUR)'
        );
        $stmt->bindValue(':ip', $ip, PDO::PARAM_LOB);
        $stmt->execute();
        return (int) $stmt->fetchColumn() >= $limit;
    } catch (PDOException $e) {
        error_log('[EGAC] rate check failed: ' . $e->getMessage());
        return false;                        /* never block on our own error */
    }
}

/** Same person, same message, moments apart — a double-click, not two jobs. */
function egac_recent_duplicate(string $fingerprint): bool
{
    $minutes = (int) (egac_config()['limits']['duplicate_minutes'] ?? 5);
    if ($minutes <= 0) {
        return false;
    }

    try {
        $stmt = egac_db()->prepare(
            'SELECT COUNT(*) FROM clients
              WHERE fingerprint = :fp
                AND created_at > (UTC_TIMESTAMP() - INTERVAL :mins MINUTE)'
        );
        $stmt->bindValue(':fp', $fingerprint);
        $stmt->bindValue(':mins', $minutes, PDO::PARAM_INT);
        $stmt->execute();
        return (int) $stmt->fetchColumn() > 0;
    } catch (PDOException $e) {
        error_log('[EGAC] duplicate check failed: ' . $e->getMessage());
        return false;
    }
}

/* ------------------------------------------------------------- attachments */
/**
 * Stores whatever the visitor attached, under generated names.
 * Returns the stored file records; anything outside the whitelist is dropped
 * rather than rejected, so one odd file cannot lose the whole enquiry.
 */
function egac_store_uploads(): array
{
    $cfg = egac_config()['uploads'];
    if (empty($cfg['enabled']) || empty($_FILES['files'])) {
        return [];
    }

    $dir = $cfg['dir'];
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        error_log('[EGAC] upload directory could not be created: ' . $dir);
        return [];
    }

    $files  = $_FILES['files'];
    $names  = (array) ($files['name'] ?? []);
    $stored = [];
    $maxBytes = ((int) $cfg['max_mb']) * 1024 * 1024;

    foreach ($names as $i => $original) {
        if (count($stored) >= (int) $cfg['max_files']) {
            break;
        }
        if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }
        if (($files['size'][$i] ?? 0) <= 0 || $files['size'][$i] > $maxBytes) {
            continue;
        }
        if (!is_uploaded_file($files['tmp_name'][$i])) {
            continue;
        }

        $ext = strtolower(pathinfo((string) $original, PATHINFO_EXTENSION));
        if (!in_array($ext, $cfg['extensions'], true)) {
            continue;
        }

        $safeName = bin2hex(random_bytes(8)) . '-' . date('Ymd-His') . '.' . $ext;
        $target   = rtrim($dir, '/') . '/' . $safeName;

        if (!@move_uploaded_file($files['tmp_name'][$i], $target)) {
            error_log('[EGAC] could not move upload to ' . $target);
            continue;
        }
        @chmod($target, 0644);

        $stored[] = [
            'file'     => $safeName,
            'original' => function_exists('mb_substr')
                ? mb_substr((string) $original, 0, 120, 'UTF-8')
                : substr((string) $original, 0, 120),
            'bytes'    => (int) $files['size'][$i],
        ];
    }

    return $stored;
}

/* ------------------------------------------------------------------- mail */
function egac_notify(array $request, array $attachments): void
{
    $mail = egac_config()['mail'];
    if (empty($mail['enabled']) || empty($mail['to'])) {
        return;
    }

    $lines = [
        'A new request came in through the website.',
        '',
        'Name:      ' . $request['full_name'],
        'Company:   ' . $request['company_name'],
        'Phone:     ' . $request['phone'],
        'Email:     ' . $request['email'],
        'Service:   ' . $request['service'],
        'Type:      ' . $request['project_type'],
        'Location:  ' . $request['project_location'],
        'Size:      ' . ($request['project_size'] ?: '-'),
        'Language:  ' . $request['language'],
        'Files:     ' . (count($attachments) ?: 'none'),
        '',
        'Details:',
        $request['project_details'],
        '',
        '-- stored in the clients table, id ' . ($request['id'] ?? '?'),
    ];

    $from = $mail['from'] !== '' ? $mail['from'] : ('no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));

    $headers = [
        'From: EGAC Website <' . $from . '>',
        'Reply-To: ' . $request['email'],
        'Content-Type: text/plain; charset=utf-8',
        'X-Mailer: EGAC-Site',
    ];

    $sent = @mail(
        $mail['to'],
        '=?UTF-8?B?' . base64_encode($mail['subject']) . '?=',
        implode("\n", $lines),
        implode("\r\n", $headers)
    );

    if (!$sent) {
        /* The request is already safe in the database — mail is a bonus. */
        error_log('[EGAC] notification mail could not be sent.');
    }
}

<?php
/* ============================================================================
   EGAC CONSTRUCTION — EXPORT CLIENT REQUESTS
   ----------------------------------------------------------------------------
   Sign in at api/admin.php first, then:

       api/export.php              → CSV, opens straight in Excel
       api/export.php?format=xlsx  → real .xlsx workbook
       api/export.php?status=New   → only rows with that status
       api/export.php?from=2026-01-01&to=2026-03-31

   The CSV is written UTF-8 with a byte-order mark and CRLF line endings, so
   Arabic names survive the trip into Excel instead of turning into mojibake.
   ========================================================================== */

declare(strict_types=1);

define('EGAC_APP', true);
require __DIR__ . '/lib.php';

session_start();
if (empty($_SESSION['egac_admin'])) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Sign in at admin.php first.\n");
}

/* ------------------------------------------------------------ the query */
$where  = [];
$params = [];

$status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
if ($status !== '' && $status !== 'all') {
    $where[] = 'status = :status';
    $params[':status'] = $status;
}

if (!empty($_GET['from'])) {
    $where[] = 'created_at >= :from';
    $params[':from'] = substr((string) $_GET['from'], 0, 10) . ' 00:00:00';
}
if (!empty($_GET['to'])) {
    $where[] = 'created_at <= :to';
    $params[':to'] = substr((string) $_GET['to'], 0, 10) . ' 23:59:59';
}

$sql = 'SELECT id, full_name, company_name, phone, email, service, project_type,
               project_location, project_size, project_details, attachments,
               language, status, notes, created_at
          FROM clients';
if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY id DESC';

$stmt = egac_db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

$headings = [
    'ID', 'Full name', 'Company', 'Phone', 'Email', 'Service', 'Project type',
    'Location', 'Project size', 'Details', 'Attachments', 'Language',
    'Status', 'Notes', 'Received',
];

/** One export row, in the same order as $headings. */
function egac_export_row(array $r): array
{
    $files = [];
    if (!empty($r['attachments'])) {
        $decoded = json_decode((string) $r['attachments'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $file) {
                $files[] = $file['original'] ?? ($file['file'] ?? '');
            }
        }
    }

    return [
        $r['id'],
        $r['full_name'],
        $r['company_name'],
        $r['phone'],
        $r['email'],
        $r['service'],
        $r['project_type'],
        $r['project_location'],
        $r['project_size'] ?? '',
        $r['project_details'],
        implode(', ', $files),
        $r['language'],
        $r['status'],
        $r['notes'] ?? '',
        $r['created_at'],
    ];
}

$stamp  = date('Y-m-d');
$format = ($_GET['format'] ?? 'csv') === 'xlsx' ? 'xlsx' : 'csv';

/* ==================================================================== CSV */
if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="egac-requests-' . $stamp . '.csv"');
    header('Cache-Control: no-store');

    $out = fopen('php://output', 'w');
    echo "\xEF\xBB\xBF";                       /* BOM: Excel reads UTF-8 */

    fputcsv($out, $headings, ',', '"', '\\');
    foreach ($rows as $r) {
        $line = egac_export_row($r);
        /* Defuse anything Excel would run as a formula. */
        foreach ($line as $k => $cell) {
            if (is_string($cell) && $cell !== '' && strpos("=+-@\t\r", $cell[0]) !== false) {
                $line[$k] = "'" . $cell;
            }
        }
        fputcsv($out, $line, ',', '"', '\\');
    }
    fclose($out);
    exit;
}

/* =================================================================== XLSX
   A .xlsx file is a zip of XML parts. Writing the four minimal parts by hand
   keeps the site dependency-free — no Composer, no PhpSpreadsheet upload.
   ====================================================================== */
if (!class_exists('ZipArchive')) {
    http_response_code(501);
    header('Content-Type: text/plain; charset=utf-8');
    exit("XLSX export needs the PHP zip extension. Use the CSV export instead.\n");
}

function egac_xml(string $value): string
{
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value);
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

/** Column letter for a 1-based index: 1 → A, 27 → AA. */
function egac_column(int $index): string
{
    $letters = '';
    while ($index > 0) {
        $rem = ($index - 1) % 26;
        $letters = chr(65 + $rem) . $letters;
        $index = (int) (($index - $rem - 1) / 26);
    }
    return $letters;
}

function egac_sheet_row(int $rowNumber, array $cells, bool $header = false): string
{
    $xml = '<row r="' . $rowNumber . '">';
    $col = 1;
    foreach ($cells as $cell) {
        $ref = egac_column($col) . $rowNumber;
        if (is_int($cell) || (is_string($cell) && $cell !== '' && ctype_digit($cell) && strlen($cell) < 10)) {
            $xml .= '<c r="' . $ref . '"' . ($header ? ' s="1"' : '') . '><v>' . (int) $cell . '</v></c>';
        } else {
            $xml .= '<c r="' . $ref . '" t="inlineStr"' . ($header ? ' s="1"' : '') .
                    '><is><t xml:space="preserve">' . egac_xml((string) $cell) . '</t></is></c>';
        }
        $col++;
    }
    return $xml . '</row>';
}

$sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
       . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
       . '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
       . '<sheetData>';

$sheet .= egac_sheet_row(1, $headings, true);
$rowNumber = 2;
foreach ($rows as $r) {
    $sheet .= egac_sheet_row($rowNumber, egac_export_row($r));
    $rowNumber++;
}
$sheet .= '</sheetData></worksheet>';

$contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    . '<Default Extension="xml" ContentType="application/xml"/>'
    . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    . '</Types>';

$rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    . '</Relationships>';

$workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    . '<sheets><sheet name="Requests" sheetId="1" r:id="rId1"/></sheets></workbook>';

$workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    . '</Relationships>';

$styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
    . '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
    . '<fills count="3"><fill><patternFill patternType="none"/></fill>'
    . '<fill><patternFill patternType="gray125"/></fill>'
    . '<fill><patternFill patternType="solid"><fgColor rgb="FF0B1C30"/><bgColor indexed="64"/></patternFill></fill></fills>'
    . '<borders count="1"><border/></borders>'
    . '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
    . '<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs>'
    . '</styleSheet>';

$tmp = tempnam(sys_get_temp_dir(), 'egac');
$zip = new ZipArchive();
if ($tmp === false || $zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
    http_response_code(500);
    exit('Could not build the workbook.');
}

$zip->addFromString('[Content_Types].xml', $contentTypes);
$zip->addFromString('_rels/.rels', $rootRels);
$zip->addFromString('xl/workbook.xml', $workbook);
$zip->addFromString('xl/_rels/workbook.xml.rels', $workbookRels);
$zip->addFromString('xl/styles.xml', $styles);
$zip->addFromString('xl/worksheets/sheet1.xml', $sheet);
$zip->close();

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="egac-requests-' . $stamp . '.xlsx"');
header('Content-Length: ' . (string) filesize($tmp));
header('Cache-Control: no-store');
readfile($tmp);
@unlink($tmp);

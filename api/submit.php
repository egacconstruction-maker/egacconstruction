<?php
/* ============================================================================
   EGAC CONSTRUCTION — CLIENT REQUEST ENDPOINT
   ----------------------------------------------------------------------------
   Receives the inquiry form, validates every field again on the server,
   stores the request in MySQL through a prepared statement and optionally
   e-mails a notification.

   The browser is never trusted: the front-end validation in js/contact.js is
   for the visitor's comfort, this file is what actually decides.

   Responses
     200  {"ok":true,"id":123}
     422  {"ok":false,"fields":{"email":"…"}}   → painted back onto the form
     429  {"ok":false,"message":"…"}            → too many requests
     5xx  {"ok":false,"message":"…"}            → configuration or database
   ========================================================================== */

declare(strict_types=1);

define('EGAC_APP', true);
require __DIR__ . '/lib.php';

/* ------------------------------------------------------------ method guard */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    egac_fail(405, 'Method not allowed.');
}

$config = egac_config();
$lang   = egac_field('language', 2) === 'ar' ? 'ar' : 'en';

/** Messages the visitor sees, in the language they were using. */
function egac_msg(string $key, string $lang): string
{
    $strings = [
        'required'   => ['en' => 'This field is required.',            'ar' => 'هذا الحقل مطلوب.'],
        'email'      => ['en' => 'Enter a valid email address.',       'ar' => 'أدخل بريدًا إلكترونيًا صحيحًا.'],
        'phone'      => ['en' => 'Enter a valid phone number.',        'ar' => 'أدخل رقم هاتف صحيحًا.'],
        'short'      => ['en' => 'Please give us a little more detail.', 'ar' => 'من فضلك أضف مزيدًا من التفاصيل.'],
        'choose'     => ['en' => 'Choose one of the options.',         'ar' => 'اختر أحد الخيارات.'],
        'rate'       => ['en' => 'You have sent several requests already. Please try again later or call us.',
                         'ar' => 'لقد أرسلت عدة طلبات بالفعل. برجاء المحاولة لاحقًا أو الاتصال بنا.'],
        'save'       => ['en' => 'We could not save your request right now. Please try again shortly.',
                         'ar' => 'تعذّر حفظ طلبك الآن. برجاء المحاولة بعد قليل.'],
    ];
    return $strings[$key][$lang] ?? $strings[$key]['en'];
}

/* --------------------------------------------------------- 1. bot filters */
/* Honeypot: a real person never sees this field, so it must be empty. */
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    egac_log_attempt('spam');
    /* Answer as if all is well — a bot learns nothing from a success. */
    egac_json(200, ['ok' => true, 'id' => null]);
}

/* Timing: forms filled faster than a person can read are not people. */
$minSeconds = (int) ($config['limits']['min_seconds'] ?? 3);
$openedAt   = (int) ($_POST['form_time'] ?? 0);
if ($minSeconds > 0 && $openedAt > 0) {
    $elapsed = (int) floor((microtime(true) * 1000 - $openedAt) / 1000);
    if ($elapsed >= 0 && $elapsed < $minSeconds) {
        egac_log_attempt('spam');
        egac_json(200, ['ok' => true, 'id' => null]);
    }
}

/* ------------------------------------------------------ 2. rate limiting */
if (egac_rate_limited()) {
    egac_log_attempt('rate');
    egac_fail(429, egac_msg('rate', $lang));
}

/* --------------------------------------------------------- 3. read input */
$data = [
    'full_name'        => egac_field('name', 150),
    'company_name'     => egac_field('company', 150),
    'phone'            => egac_field('phone', 40),
    'email'            => egac_field('email', 190),
    'service'          => egac_field('service', 60),
    'project_type'     => egac_field('projectType', 60),
    'project_location' => egac_field('location', 190),
    'project_details'  => egac_field('message', 4000, true),
    'project_size'     => egac_field('area', 80),
    'language'         => $lang,
    'source_page'      => egac_field('page', 255),
];

/* ---------------------------------------------------------- 4. validation */
$errors = [];

foreach ([
    'name'        => 'full_name',
    'company'     => 'company_name',
    'phone'       => 'phone',
    'email'       => 'email',
    'location'    => 'project_location',
    'message'     => 'project_details',
] as $formField => $column) {
    if ($data[$column] === '') {
        $errors[$formField] = egac_msg('required', $lang);
    }
}

if (!isset($errors['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = egac_msg('email', $lang);
}
if (!isset($errors['phone']) && !egac_valid_phone($data['phone'])) {
    $errors['phone'] = egac_msg('phone', $lang);
}
if (!isset($errors['message']) && mb_strlen($data['project_details'], 'UTF-8') < 10) {
    $errors['message'] = egac_msg('short', $lang);
}

/* Selects are checked against our own lists — nothing else is accepted. */
$allowedServices = ['cladding', 'curtain-wall', 'aluminum', 'upvc', 'copista', 'advertising', 'other'];
$allowedTypes    = ['residential', 'commercial', 'administrative', 'hospitality', 'industrial', 'other'];

if (!egac_in_list($data['service'], $allowedServices)) {
    $errors['service'] = egac_msg('choose', $lang);
}
if (!egac_in_list($data['project_type'], $allowedTypes)) {
    $errors['projectType'] = egac_msg('choose', $lang);
}

if ($errors) {
    egac_log_attempt('invalid');
    egac_fail(422, egac_msg('required', $lang), $errors);
}

/* ------------------------------------------------------- 5. duplicate guard */
$fingerprint = hash('sha256', strtolower($data['email']) . '|' . $data['phone'] . '|' . $data['project_details']);

if (egac_recent_duplicate($fingerprint)) {
    /* Already have this exact request; treat it as delivered, store nothing. */
    egac_json(200, ['ok' => true, 'id' => null, 'duplicate' => true]);
}

/* ---------------------------------------------------------- 6. attachments */
$attachments = egac_store_uploads();

/* ------------------------------------------------------------- 7. store it */
$sql = 'INSERT INTO clients
          (full_name, phone, email, company_name, service, project_location,
           project_type, project_details, project_size, attachments, language,
           source_page, ip_address, user_agent, fingerprint)
        VALUES
          (:full_name, :phone, :email, :company_name, :service, :project_location,
           :project_type, :project_details, :project_size, :attachments, :language,
           :source_page, :ip_address, :user_agent, :fingerprint)';

try {
    $pdo  = egac_db();
    $stmt = $pdo->prepare($sql);

    $stmt->bindValue(':full_name',        $data['full_name']);
    $stmt->bindValue(':phone',            $data['phone']);
    $stmt->bindValue(':email',            $data['email']);
    $stmt->bindValue(':company_name',     $data['company_name']);
    $stmt->bindValue(':service',          $data['service']);
    $stmt->bindValue(':project_location', $data['project_location']);
    $stmt->bindValue(':project_type',     $data['project_type']);
    $stmt->bindValue(':project_details',  $data['project_details']);
    $stmt->bindValue(':project_size',     $data['project_size'] !== '' ? $data['project_size'] : null);
    $stmt->bindValue(':attachments',      $attachments ? json_encode($attachments, JSON_UNESCAPED_UNICODE) : null);
    $stmt->bindValue(':language',         $data['language']);
    $stmt->bindValue(':source_page',      $data['source_page'] !== '' ? $data['source_page'] : null);
    egac_bind_ip($stmt, ':ip_address');
    $stmt->bindValue(':user_agent',       mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255, 'UTF-8'));
    $stmt->bindValue(':fingerprint',      $fingerprint);

    $stmt->execute();
    $id = (int) $pdo->lastInsertId();
} catch (PDOException $e) {
    error_log('[EGAC] insert failed: ' . $e->getMessage());
    egac_fail(503, egac_msg('save', $lang));
}

egac_log_attempt('stored');

/* --------------------------------------------------------- 8. notification */
$data['id'] = $id;
egac_notify($data, $attachments);

egac_json(200, ['ok' => true, 'id' => $id]);

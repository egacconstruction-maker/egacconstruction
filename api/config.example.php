<?php
/* ============================================================================
   EGAC CONSTRUCTION — BACKEND CONFIGURATION (TEMPLATE)
   ----------------------------------------------------------------------------
   COPY THIS FILE TO  config.php  AND FILL IN YOUR OWN VALUES.

       cp api/config.example.php api/config.php

   config.php is the only file that holds credentials. It is listed in
   .gitignore and blocked from the web by api/.htaccess.

   NOTHING REAL BELONGS IN THIS TEMPLATE — leave the placeholders as they are.
   ========================================================================== */

return [

    /* ---- database (create it in hPanel → MySQL Databases) ---------------- */
    'db' => [
        'host'    => 'localhost',   // Hostinger: usually localhost
        'name'    => '',            // e.g. u123456789_egac
        'user'    => '',            // e.g. u123456789_egac
        'pass'    => '',            // the password you set when creating the user
        'charset' => 'utf8mb4',
    ],

    /* ---- notification e-mail -------------------------------------------- */
    /* Leave 'to' empty to store requests without sending any mail.
       The database is the record; e-mail is only a heads-up.               */
    'mail' => [
        'enabled' => false,
        'to'      => '',            // e.g. info@egacconstruction.com
        'from'    => '',            // must be an address ON your own domain
        'subject' => 'New project request — egacconstruction.com',
    ],

    /* ---- admin panel (api/admin.php) ------------------------------------ */
    /* Pick a long random password. Anyone with it can read every request. */
    'admin' => [
        'enabled'  => true,
        'password' => '',           // e.g. 32 random characters
    ],

    /* ---- attachments ----------------------------------------------------- */
    'uploads' => [
        'enabled'    => true,
        'dir'        => __DIR__ . '/storage/uploads',
        'max_files'  => 5,
        'max_mb'     => 8,
        'extensions' => ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif',
                         'dwg', 'dxf', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx'],
    ],

    /* ---- abuse protection ------------------------------------------------ */
    'limits' => [
        'per_ip_per_hour'   => 6,   // accepted submissions per IP, per hour
        'min_seconds'       => 3,   // a real person needs longer than this
        'duplicate_minutes' => 5,   // identical request within N minutes is ignored
    ],
];

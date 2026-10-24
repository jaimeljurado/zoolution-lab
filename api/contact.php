<?php
// Formulario de contacto de Zoolutions Lab. Envía la consulta a central@zoolutionslab.com.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function out($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(false, 405);
$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) $d = $_POST;
if (!empty($d['website'])) out(true);                       // trampa anti-spam: fingimos éxito
if ((int)($d['elapsed'] ?? 0) < 3) out(false, 400);         // enviado demasiado rápido: bot
$clean = function ($v, $max) { return mb_substr(trim(preg_replace('/[\r\n]+/', ' ', (string)$v)), 0, $max); };
$name = $clean($d['name'] ?? '', 100);
$email = $clean($d['email'] ?? '', 200);
$company = $clean($d['company'] ?? '', 200);
$message = mb_substr(trim((string)($d['message'] ?? '')), 0, 3000);
if ($name === '' || $company === '' || mb_strlen($message) < 15 || !filter_var($email, FILTER_VALIDATE_EMAIL) || ($d['privacy'] ?? '') !== 'yes') out(false, 400);
$to = 'central@zoolutionslab.com';
$subject = '=?UTF-8?B?' . base64_encode('Consulta desde la web · ' . $company) . '?=';
$body = "Nombre: $name\nCorreo: $email\nEmpresa: $company\n\n$message\n";
$host = preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'zoolutionslab.com');
$headers = "From: Web Zoolutions Lab <no-reply@$host>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
out(@mail($to, $subject, $body, $headers) ? true : false, 200);

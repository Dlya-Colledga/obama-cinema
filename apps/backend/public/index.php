<?php

declare(strict_types=1);

// Static file handling for PHP built-in web server
if (php_sapi_name() === 'cli-server') {
    $urlPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
    $file = __DIR__ . $urlPath;
    if ($urlPath !== '/' && is_file($file)) {
        return false;
    }
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Routes/api.php';

use App\Config\Env;
use App\Exceptions\HttpException;
use App\Http\Request;
use App\Http\Response;
use App\Middleware\CorsMiddleware;
use App\Routes\Router;
use function App\Routes\registerRoutes;

// Initialize Environment
Env::load(__DIR__ . '/../../../.env');

// Handle Cross-Origin Resource Sharing
if (!CorsMiddleware::handle()) {
    exit(0);
}

try {
    $request = Request::capture();
    $router = new Router();
    registerRoutes($router);
    $router->dispatch($request);
} catch (HttpException $e) {
    Response::error($e->getMessage(), $e->getStatusCode(), $e->getErrorCode(), $e->getDetails());
} catch (\Throwable $e) {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    $isDebug = Env::getBool('APP_DEBUG', true);

    Response::error(
        $isDebug ? $e->getMessage() : 'Внутренняя ошибка сервера',
        500,
        'INTERNAL_SERVER_ERROR',
        $isDebug ? ['file' => $e->getFile(), 'line' => $e->getLine()] : []
    );
}

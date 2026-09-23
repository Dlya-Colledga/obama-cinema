<?php

declare(strict_types=1);

namespace App\Routes;

use App\Exceptions\NotFoundException;
use App\Http\Request;

final class Router
{
    private array $routes = [];

    public function get(string $path, array $handler, array $middlewares = []): void
    {
        $this->add('GET', $path, $handler, $middlewares);
    }

    public function post(string $path, array $handler, array $middlewares = []): void
    {
        $this->add('POST', $path, $handler, $middlewares);
    }

    public function put(string $path, array $handler, array $middlewares = []): void
    {
        $this->add('PUT', $path, $handler, $middlewares);
    }

    public function delete(string $path, array $handler, array $middlewares = []): void
    {
        $this->add('DELETE', $path, $handler, $middlewares);
    }

    public function add(string $method, string $path, array $handler, array $middlewares = []): void
    {
        // Convert route like /api/content/{id} to regex #^/api/content/(?P<id>[^/]+)$#
        $regex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $path);
        $regex = '#^' . $regex . '$#';

        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $regex,
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
    }

    public function dispatch(Request $request): void
    {
        $requestMethod = strtoupper($request->method);
        $requestPath = rtrim($request->path, '/');
        if ($requestPath === '') {
            $requestPath = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            if (preg_match($route['pattern'], $requestPath, $matches)) {
                $params = [];
                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $params[$key] = $value;
                    }
                }
                $request->params = $params;

                // Execute route middlewares
                foreach ($route['middlewares'] as $middleware) {
                    $middleware::handle($request);
                }

                [$controller, $action] = $route['handler'];
                $controller->$action($request);
                return;
            }
        }

        throw new NotFoundException("Эндпоинт {$requestMethod} {$requestPath} не найден");
    }
}

<?php

declare(strict_types=1);

namespace App\Routes;

use App\Controllers\AnimeController;
use App\Controllers\AuthController;
use App\Controllers\BookmarkController;
use App\Controllers\CatalogController;
use App\Controllers\CommentController;
use App\Controllers\ContentController;
use App\Controllers\RatingController;
use App\Controllers\UserController;
use App\Controllers\WatchController;
use App\Middleware\AuthMiddleware;
use App\Middleware\OptionalAuthMiddleware;
use App\Providers\AnixartStreamProvider;
use App\Providers\DemoStreamProvider;
use App\Providers\ProviderManager;
use App\Repositories\BookmarkRepository;
use App\Repositories\CommentRepository;
use App\Repositories\ContentRepository;
use App\Repositories\RatingRepository;
use App\Repositories\UserRepository;
use App\Repositories\WatchRepository;
use App\Services\AnimeService;
use App\Services\Anixart\AnixartClient;
use App\Services\Anixart\Parsers\StreamResolver;
use App\Services\AuthService;
use App\Services\BookmarkService;
use App\Services\CatalogService;
use App\Services\CommentService;
use App\Services\RatingService;
use App\Services\WatchService;

function registerRoutes(Router $router): void
{
    // Dependency Injection & Wiring
    $userRepo = new UserRepository();
    $contentRepo = new ContentRepository();
    $commentRepo = new CommentRepository();
    $ratingRepo = new RatingRepository();
    $bookmarkRepo = new BookmarkRepository();
    $watchRepo = new WatchRepository();

    $anixartClient = new AnixartClient();
    $streamResolver = new StreamResolver();
    $animeService = new AnimeService($anixartClient, $streamResolver);
    $anixartStreamProvider = new AnixartStreamProvider($contentRepo, $animeService);

    $providerManager = new ProviderManager();
    $providerManager->registerProvider($anixartStreamProvider);
    $providerManager->registerProvider(new DemoStreamProvider($contentRepo));

    $authService = new AuthService($userRepo);
    $catalogService = new CatalogService($contentRepo, $providerManager, $animeService);
    $commentService = new CommentService($commentRepo, $contentRepo);
    $ratingService = new RatingService($ratingRepo, $contentRepo);
    $bookmarkService = new BookmarkService($bookmarkRepo, $contentRepo);
    $watchService = new WatchService($watchRepo, $contentRepo);

    $authController = new AuthController($authService);
    $userController = new UserController($authService);
    $catalogController = new CatalogController($catalogService);
    $contentController = new ContentController($catalogService);
    $commentController = new CommentController($commentService);
    $ratingController = new RatingController($ratingService);
    $bookmarkController = new BookmarkController($bookmarkService);
    $watchController = new WatchController($watchService);
    $animeController = new AnimeController($animeService);

    // Healthcheck
    $router->get('/api/health', [new class {
        public function check(): void {
            \App\Http\Response::json(['status' => 'ok', 'timestamp' => time()]);
        }
    }, 'check']);

    // Auth Routes
    $router->post('/api/auth/register', [$authController, 'register']);
    $router->post('/api/auth/login', [$authController, 'login']);
    $router->post('/api/auth/logout', [$authController, 'logout'], [AuthMiddleware::class]);
    $router->get('/api/auth/me', [$authController, 'me'], [AuthMiddleware::class]);

    // User Profile Routes
    $router->get('/api/users/profile', [$userController, 'profile'], [AuthMiddleware::class]);
    $router->put('/api/users/profile', [$userController, 'updateProfile'], [AuthMiddleware::class]);

    // Catalog & Content Routes
    $router->get('/api/catalog', [$catalogController, 'index'], [OptionalAuthMiddleware::class]);
    $router->get('/api/catalog/featured', [$catalogController, 'featured'], [OptionalAuthMiddleware::class]);
    $router->get('/api/filters/meta', [$catalogController, 'taxonomies']);
    $router->get('/api/content/{identifier}', [$contentController, 'show'], [OptionalAuthMiddleware::class]);
    $router->get('/api/content/{id}/seasons', [$contentController, 'seasons']);
    $router->get('/api/content/{id}/sources', [$contentController, 'sources']);

    // Anime API Routes (Anixart Open API)
    $router->get('/api/anime/search', [$animeController, 'search']);
    $router->get('/api/anime/popular', [$animeController, 'popular']);
    $router->get('/api/anime/{id}/dubbers', [$animeController, 'dubbers']);
    $router->get('/api/anime/{id}/episodes', [$animeController, 'episodes']);
    $router->get('/api/anime/{id}/streams', [$animeController, 'streams']);
    $router->get('/api/anime/{id}', [$animeController, 'show']);

    // Comments Routes
    $router->get('/api/content/{contentId}/comments', [$commentController, 'index']);
    $router->post('/api/content/{contentId}/comments', [$commentController, 'store'], [AuthMiddleware::class]);
    $router->put('/api/comments/{id}', [$commentController, 'update'], [AuthMiddleware::class]);
    $router->delete('/api/comments/{id}', [$commentController, 'destroy'], [AuthMiddleware::class]);

    // Ratings Routes
    $router->post('/api/content/{contentId}/ratings', [$ratingController, 'store'], [AuthMiddleware::class]);
    $router->delete('/api/content/{contentId}/ratings', [$ratingController, 'destroy'], [AuthMiddleware::class]);

    // Bookmarks Routes
    $router->get('/api/bookmarks', [$bookmarkController, 'index'], [AuthMiddleware::class]);
    $router->post('/api/bookmarks', [$bookmarkController, 'store'], [AuthMiddleware::class]);
    $router->delete('/api/bookmarks/{contentId}', [$bookmarkController, 'destroy'], [AuthMiddleware::class]);

    // Watch Progress & History Routes
    $router->post('/api/watch/progress', [$watchController, 'progress'], [AuthMiddleware::class]);
    $router->get('/api/watch/progress/{contentId}', [$watchController, 'getProgress'], [AuthMiddleware::class]);
    $router->get('/api/watch/unfinished', [$watchController, 'unfinished'], [AuthMiddleware::class]);
    $router->get('/api/watch/history', [$watchController, 'history'], [AuthMiddleware::class]);
    $router->delete('/api/watch/history', [$watchController, 'clear'], [AuthMiddleware::class]);
}

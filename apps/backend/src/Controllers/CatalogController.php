<?php

declare(strict_types=1);

namespace App\Controllers;

use App\DTO\CatalogFilterDTO;
use App\Http\Request;
use App\Http\Response;
use App\Services\CatalogService;

final class CatalogController
{
    public function __construct(
        private CatalogService $catalogService
    ) {}

    public function index(Request $request): void
    {
        $filter = CatalogFilterDTO::fromQueryParams($request->query);
        $userId = $request->user?->id;

        $result = $this->catalogService->getCatalog($filter, $userId);

        Response::json($result['items'], 200, $result['meta']);
    }

    public function featured(Request $request): void
    {
        $userId = $request->user?->id;
        $items = $this->catalogService->getFeatured($userId);

        Response::json($items, 200);
    }

    public function taxonomies(Request $request): void
    {
        $taxonomies = $this->catalogService->getTaxonomies();

        Response::json($taxonomies, 200);
    }
}

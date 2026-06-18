# {service-name} Inventory

> Scanned: {YYYY-MM-DD}
> Port: {port}
> Type: API Gateway / Internal Service

## Dependencies

| Target | Type |
|--------|------|
| {dependency-service} | Internal API call |
| {shared-library} | Shared DTO |

## Controllers

| Controller | Endpoints | Domain |
|------------|----------:|--------|
| {ControllerName} | {count} | {domain} |

## Endpoint Catalog

| # | HTTP | Path | Controller | Service Method | Summary |
|---|------|------|------------|----------------|---------|
| 1 | GET | /api/{version}/{service}/{resource} | {Controller} | {method}() | {description} |

## External Service Call Map

> Only applicable for API Gateway services that call Internal services.

| GW Endpoint | Target Service | Internal Endpoint | Transform |
|-------------|----------------|-------------------|-----------|
| GET /api/{gw-path} | {internal-svc}:{port} | GET /{internal-path} | {params identical / field mapping} |

## VO/DTO Catalog

| Class | Fields | @JsonNaming | Purpose |
|-------|--------|-------------|---------|
| {ClassName} | {count} | {snake_case / camelCase} | {request / response / internal} |

---

> **Inventory is the map for analysis.**
>
> - Never start domain analysis without a complete inventory scan
> - The External Service Call Map is the key artifact for GW services
> - Every endpoint must appear in the catalog (no gaps)

# Service Inventory Scan

Scan a backend service's complete structure to generate an inventory.
Must be run before `/analyze-api` to establish the analysis map.

Arguments: $ARGUMENTS

## Usage

```
/scan-service <service-path>           # Full scan of a service
/scan-service <service-path> --quick   # Controller list + EP counts only
/scan-service --all <services-root>    # Summary table of all services
```

## Execution

### --all mode

Traverse all service directories under the given root and output a summary table.

1. Find all directories matching the service pattern under the root path
2. For each service:
   - Count Controller files under `src/**/controllers/` or `src/**/adapter/port/in/web/`
   - Count endpoint annotations for Java or decorators for other frameworks
   - List domain folders
3. Check analysis status: does an analysis directory exist for this service?

### Full scan mode (service-path only)

1. **Project structure**
   - Read build config (build.gradle, pom.xml, package.json) for dependencies
   - Read app config (application.yml, .env) for port, profiles, external service URLs
   - Map the source package structure

2. **Controller exhaustive scan**
   - Find and read ALL controller files
   - Extract each endpoint: HTTP method, path, parameters, service method
   - Collect API documentation annotations if present

3. **Service layer mapping**
   - Public methods per service class
   - External service calls (injected API clients / HTTP calls to other services)
   - Key to GW-Internal dependency mapping

4. **Domain model / VO / DTO mapping**
   - List VO/DTO classes with field counts
   - Check for serialization name changes

5. **Output: INVENTORY.md** using `analysis/templates/INVENTORY.template.md`

### --quick mode

Controller list + endpoint counts only. No INVENTORY.md generation.

## Core Principle

> **The inventory is the map for analysis.**
> Scanning before analysis prevents scope gaps.
> The External Service Call Map is the critical artifact for gateway services.
> Every endpoint must appear in the catalog.

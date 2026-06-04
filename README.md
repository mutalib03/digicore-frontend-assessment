# Technical Assessment - Frontend Engineer

## Part A: Broken Banking Transaction UI

### 1. Identification of Issues
Reviewing the provided `TransactionsComponent` snippet, I identified several critical issues that would degrade performance and cause bugs in a production environment:

* **Template Syntax Error:** The template uses `<div ngFor...>` instead of the structural directive syntax `<div *ngFor...>`. This will cause an Angular compiler error.
* **Memory Leak (Subscription Issue):** The component calls `.subscribe()` inside `ngOnInit` without ever unsubscribing. Every time this component is destroyed and recreated, a new subscription is left hanging in memory, eventually causing the application to crash.
* **Change Detection Bottleneck:** The component relies on Angular's default change detection. For an array of transactions, the component will re-evaluate on every single DOM event.
* **Excessive Filtering & DOM Thrashing:** The `(input)` event fires on every keystroke, blocking the main thread. Additionally, the missing `trackBy` function in the `ngFor` loop forces Angular to destroy and recreate the entire DOM list on every keystroke.
* **State Handling & Type Safety:** The `filter()` logic is case-sensitive (`.includes(value)`). Furthermore, the state relies on implicitly typed arrays (`transactions = []`) and event typing uses `(event: any)`, bypassing TypeScript's compile-time safety.

### 2. The Solution (See `transactions.component.ts`)
To resolve these issues, I refactored the component using a declarative RxJS approach:
* Implemented `ChangeDetectionStrategy.OnPush` to prevent unnecessary render cycles.
* Replaced manual array mutations with reactive streams (`combineLatest`).
* Utilized `FormControl` with `debounceTime` to prevent UI thread blocking during searches.
* Utilized the `AsyncPipe` in the template to automatically handle subscriptions/unsubscriptions, fixing the memory leak.
* Added a `trackBy` function to optimize DOM rendering.

---

## Part B: Multi-Bank Custom UI Engine

To support 10+ banks from a single codebase where UI, workflows, and validation rules change dynamically, the architecture must be strictly metadata-driven. We cannot hardcode tenant logic into the components.

### 1. One Codebase Supports All Banks (Initialization Strategy)
* **Tenant Identification:** Identify the tenant at runtime using the hostname/subdomain (e.g., `banka.lucid.com`).
* **Configuration Fetching:** Utilize Angular's `APP_INITIALIZER` token. Before Angular bootstraps, the app makes an HTTP call to fetch a JSON configuration object specific to that tenant. 
* **State Management:** This JSON config (containing themes, feature flags, and form schemas) is stored in a Singleton service (e.g., `TenantConfigService`) that acts as the single source of truth.

### 2. UI Changes Dynamically Per Bank
* **Theming:** The JSON config dictates color hex codes, typography, and logos. Upon initialization, a service injects these into the DOM using CSS Custom Properties (`document.documentElement.style.setProperty('--primary', config.colors.primary)`).
* **Dynamic Component Loading:** For structural layout differences, we utilize Angular's `NgComponentOutlet`. The root template reads the config and dynamically renders the appropriate layout component string.

### 3. Different Validation Rules & Onboarding Flows
* **Schema-Driven Forms:** Forms are not hardcoded. The JSON config dictates the onboarding steps and fields. 
* **Dynamic Reactive Forms:** We build a generic `<app-dynamic-form [schema]="currentStep">` component that loops over the JSON schema, dynamically generating `FormControl` instances and mapping JSON validator strings to Angular's built-in `Validators`. This ensures validation rules change instantly without needing a rebuild.

### 4. Features Enabled/Disabled Per Bank
* **Structural Directives:** We create a custom directive (e.g., `*appFeatureToggle="'crypto'"`). The directive checks the injected config service; if the feature is not enabled, the element is removed from the DOM entirely.
* **Route Guards:** We implement a generic `FeatureGuard`. If a user attempts to navigate to a route their bank hasn't enabled, the guard intercepts the navigation and redirects them.

# Technical Assessment - Frontend Engineer

## Part A: Broken Banking Transaction UI

### 1. Issues Identified
Looking at the provided `TransactionsComponent`, there are several major blockers that would cause performance bottlenecks and bugs in production:

* **The Memory Leak:** Calling `.subscribe()` directly inside `ngOnInit` without a teardown mechanism is a classic memory leak. Every time the component is recreated, a new subscription stacks up in memory.
* **Change Detection & DOM Thrashing:** Relying on default change detection with an array is expensive. Worse, binding the filter directly to the `(input)` event means it fires synchronously on every keystroke, blocking the UI thread. The missing `trackBy` function also forces Angular to destroy and recreate the entire DOM list on every keystroke.
* **State, Unsafe Typings, & Missing Error Guards:** The `.includes(value)` filter is case-sensitive and lacks a null guard—if an API returns a transaction missing a category, the app will crash. Furthermore, unhandled HTTP errors would leave the user with a silently broken UI.

### 2. The Solution (See `transactions.component.ts`)
To fix this, I completely removed the manual state mutations and shifted to a fully declarative, reactive approach:
* **Declarative Initialization:** Removed `ngOnInit` entirely. The streams are built at field initialization for cleaner lifecycles.
* **Performance Optimizations:** Switched to `ChangeDetectionStrategy.OnPush`. Used `FormControl` with `debounceTime(300)` and `distinctUntilChanged()` to prevent UI thread blocking. Added a `trackBy` function for optimal DOM reuse.
* **Robust Data Handling:** Combined the streams using `combineLatest`. Applied `shareReplay(1)` to the HTTP call to cache the response and prevent redundant network requests.
* **Safety Nets:** Added `catchError` to gracefully handle API failures. Added a null guard (`?? ''`) in the filter logic to prevent runtime crashes if transaction categories are undefined.
* **Subscription Management:** Relied exclusively on the `async` pipe in the template, which delegates teardown entirely to Angular, permanently fixing the memory leak.

---

## Part B: Multi-Bank Custom UI Engine
(Note: Please see the part-b-architecture-snippets.ts file in this repository for a code-level demonstration of the core concepts described below). 

To support 10+ banks from a single codebase without hardcoding tenant logic, the architecture needs to be strictly metadata-driven. Everything should be resolved at runtime based on the bank's context.

### 1. Initialization & App Context
* **Tenant Identification:** First, we grab the tenant context from the hostname or subdomain (e.g., `bank-a.lucid.com`).
* **Configuration Fetching:** I would use Angular's `APP_INITIALIZER`. Before the app fully bootstraps, it makes an HTTP call to fetch a JSON configuration specific to that bank (containing feature flags, theme tokens, and form schemas).
* **State Management:** This config is cached in a singleton `TenantConfigService` that acts as the source of truth for the rest of the application.

### 2. Dynamic Theming & Layouts
* **Theming:** The JSON config dictates the color palette and typography. We inject these into the DOM as CSS Custom Properties (e.g., `document.documentElement.style.setProperty('--primary-brand', config.colors.primary)`). This changes the look instantly without shipping different stylesheets.
* **Layouts:** If Bank A and Bank B need fundamentally different layout wrappers, we can map layout strings from the config to actual components using `NgComponentOutlet` for dynamic rendering.

### 3. Dynamic Validation & Onboarding Flows
* **Schema-Driven Forms:** We can't afford to build 10 different onboarding components. Instead, the JSON config dictates the steps, fields, and validation rules. 
* We build a generic dynamic form component that parses this JSON schema, dynamically generates `FormControl` instances, and maps string validators (like `"required"` or `"pattern"`) to Angular's built-in `Validators`. This way, if a bank wants to add a new BVN validation rule, we just update the database config—no code deployment needed.

### 4. Feature Toggling
* **Structural Directives:** I'd write a custom directive (like `*featureToggle="'crypto_trading'"`). It checks the `TenantConfigService`, and if the bank hasn't enabled that feature, the element is never rendered in the DOM.
* **Routing:** Similarly, a generic route guard (`CanActivate`) checks the same config to prevent users from navigating to unauthorized feature modules by typing in the URL.

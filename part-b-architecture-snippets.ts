/**
 * PART B: MULTI-BANK ARCHITECTURE SNIPPETS
 * * Note: These are conceptual snippets demonstrating how the metadata-driven 
 * architecture described in the README would be implemented in Angular.
 */

import { Injectable, APP_INITIALIZER, Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export interface TenantConfig {
  tenantId: string;
  theme: {
    primaryColor: string;
    logoUrl: string;
  };
  enabledFeatures: string[]; 
}

// 2. Singleton State Manager for the Tenant
@Injectable({ providedIn: 'root' })
export class TenantConfigService {
  private config: TenantConfig | null = null;

  constructor(private http: HttpClient) {}

  loadConfig(): ReturnType<HttpClient['get']> {
    // In production, the tenant ID would be parsed from window.location.hostname
    const currentTenant = 'bank-a'; 
    return this.http.get<TenantConfig>(`/api/configs/${currentTenant}`).pipe(
      tap(config => {
        this.config = config;
        this.applyTheme(config.theme);
      })
    );
  }

  hasFeature(featureName: string): boolean {
    return this.config?.enabledFeatures.includes(featureName) ?? false;
  }

  private applyTheme(theme: TenantConfig['theme']): void {
    // Dynamically inject CSS variables at runtime
    document.documentElement.style.setProperty('--primary-brand', theme.primaryColor);
  }
}

// 3. The APP_INITIALIZER Factory (Provides the config before Angular boots)
export function initializeTenantApp(configService: TenantConfigService) {
  return () => configService.loadConfig();
}

export const TENANT_INITIALIZER_PROVIDER = {
  provide: APP_INITIALIZER,
  useFactory: initializeTenantApp,
  deps: [TenantConfigService],
  multi: true
};

// 4. The Structural Directive for Feature Toggling (*featureToggle="'crypto'")
@Directive({
  selector: '[featureToggle]',
  standalone: true
})
export class FeatureToggleDirective {
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private configService: TenantConfigService
  ) {}

  @Input() set featureToggle(featureName: string) {
    const isEnabled = this.configService.hasFeature(featureName);

    if (isEnabled && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isEnabled && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

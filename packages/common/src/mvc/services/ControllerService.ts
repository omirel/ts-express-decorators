import {ProxyMap, Type} from "@tsed/core";
import {Injectable, InjectorService, ProviderScope, ProviderType} from "@tsed/di";
import * as Express from "express";
import {$log} from "ts-log-debug";
import {ServerSettingsService} from "../../config/services/ServerSettingsService";
import {IComponentScanned} from "../../server/interfaces";
import {ControllerBuilder} from "../class/ControllerBuilder";
import {ControllerProvider} from "../class/ControllerProvider";
import {ExpressApplication} from "../decorators";
import {RouteService} from "./RouteService";

@Injectable({
  scope: ProviderScope.SINGLETON,
  global: true
})
export class ControllerService extends ProxyMap<Type<any> | any, ControllerProvider> {
  /**
   *
   * @param expressApplication
   * @param injectorService
   * @param settings
   * @param routeService
   */
  constructor(
    private injectorService: InjectorService,
    @ExpressApplication private expressApplication: Express.Application,
    private settings: ServerSettingsService,
    private routeService: RouteService
  ) {
    super(injectorService as any, {filter: {type: ProviderType.CONTROLLER}});

    this.buildRouters();
  }

  get routes(): {route: string; provider: any}[] {
    return this.routeService.routes || [];
  }

  /**
   *
   * @param components
   */
  public $onRoutesInit(components: {file: string; endpoint: string; classes: any[]}[]) {
    $log.info("Map controllers");
    this.mapComponents(components);
  }

  /**
   * Build routers and con
   */
  private buildRouters() {
    const defaultRoutersOptions = this.settings.routers;

    this.forEach((provider: ControllerProvider) => {
      if (!provider.router && !provider.hasParent()) {
        new ControllerBuilder(provider, defaultRoutersOptions).build(this.injectorService);
      }
    });
  }

  /**
   *
   * @param components
   */
  private mapComponents(components: IComponentScanned[]) {
    components.forEach(component => {
      Object.keys(component.classes)
        .map(clazzName => component.classes[clazzName])
        .filter(clazz => component.endpoint && this.has(clazz))
        .map(clazz => this.get(clazz))
        .forEach((provider: ControllerProvider) => {
          if (!provider.hasParent()) {
            this.mountRouter(component.endpoint!, provider);
          }
        });
    });
  }

  /**
   *
   * @param {string} endpoint
   * @param {ControllerProvider} provider
   */
  private mountRouter(endpoint: string, provider: ControllerProvider) {
    const route = provider.getEndpointUrl(endpoint!);
    this.routeService.addRoute({provider, route});
    this.expressApplication.use(route, provider.router);
  }
}

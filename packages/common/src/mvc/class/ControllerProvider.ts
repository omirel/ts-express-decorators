import {Enumerable, NotEnumerable, Type} from "@tsed/core";
import {Provider} from "@tsed/di";
import * as Express from "express";
import {IRouterSettings} from "../../config/interfaces/IServerSettings";

import {IControllerMiddlewares, IControllerOptions} from "../interfaces";
import {EndpointRegistry} from "../registries/EndpointRegistry";
import {EndpointMetadata} from "./EndpointMetadata";

export interface IChildrenController extends Type<any> {
  $parentCtrl?: ControllerProvider;
}

export class ControllerProvider extends Provider<any> implements IControllerOptions {
  @NotEnumerable()
  public router: Express.Router;
  /**
   * The path for the controller
   */
  @Enumerable()
  public path: string;
  /**
   * Controllers that depend to this controller.
   * @type {Array}
   * @private
   */
  @NotEnumerable()
  private _dependencies: IChildrenController[] = [];

  constructor(provide: any) {
    super(provide);
    this.type = "controller";
  }

  /**
   *
   * @returns {Endpoint[]}
   */
  get endpoints(): EndpointMetadata[] {
    return EndpointRegistry.getEndpoints(this.provide);
  }

  /**
   *
   * @returns {Type<any>[]}
   */
  get dependencies(): IChildrenController[] {
    return this._dependencies;
  }

  /**
   *
   * @param dependencies
   */
  @Enumerable()
  set dependencies(dependencies: IChildrenController[]) {
    this._dependencies = dependencies;
    this._dependencies.forEach(d => (d.$parentCtrl = this));
  }

  /**
   *
   * @returns {IRouterSettings}
   */
  get routerOptions(): IRouterSettings {
    return this.store.get("routerOptions");
  }

  /**
   *
   * @param value
   */
  set routerOptions(value: IRouterSettings) {
    this.store.set("routerOptions", value);
  }

  /**
   *
   * @returns {ControllerProvider}
   */
  get parent() {
    return this.provide.$parentCtrl;
  }

  /**
   *
   * @returns {any[]}
   */
  get middlewares(): IControllerMiddlewares {
    return Object.assign(
      {
        use: [],
        useAfter: [],
        useBefore: []
      },
      this.store.get("middlewares") || {}
    );
  }

  /**
   *
   * @param middlewares
   */
  set middlewares(middlewares: IControllerMiddlewares) {
    const mdlwrs = this.middlewares;
    const concat = (key: string, a: any, b: any) => (a[key] = a[key].concat(b[key]));

    Object.keys(middlewares).forEach((key: string) => {
      concat(key, mdlwrs, middlewares);
    });
    this.store.set("middlewares", mdlwrs);
  }

  /**
   * Resolve final endpoint url.
   */
  public getEndpointUrl(routerPath: string): string {
    return (routerPath === this.path ? this.path : (routerPath || "") + this.path).replace(/\/\//gi, "/");
  }

  /**
   *
   */
  public hasEndpointUrl() {
    return !!this.path;
  }

  /**
   *
   * @returns {boolean}
   */
  public hasDependencies(): boolean {
    return !!this.dependencies.length;
  }

  /**
   *
   * @returns {boolean}
   */
  public hasParent(): boolean {
    return !!this.provide.$parentCtrl;
  }
}

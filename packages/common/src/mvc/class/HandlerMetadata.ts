import {NotEnumerable, Store} from "@tsed/core";
import {GlobalProviders, ProviderType} from "@tsed/di";
import {ParamMetadata} from "../../filters/class/ParamMetadata";
import {EXPRESS_ERR, EXPRESS_NEXT_FN, EXPRESS_REQUEST, EXPRESS_RESPONSE} from "../../filters/constants";
import {ParamRegistry} from "../../filters/registries/ParamRegistry";
import {MiddlewareType} from "../interfaces";
import {HandlerType} from "../interfaces/HandlerType";

export class HandlerMetadata {
  /**
   *
   */
  @NotEnumerable()
  private _type: HandlerType = HandlerType.FUNC;
  /**
   *
   * @type {boolean}
   * @private
   */
  @NotEnumerable()
  private _errorParam: boolean = false;
  /**
   *
   */
  @NotEnumerable()
  private _injectable: boolean = false;
  /**
   *
   */
  @NotEnumerable()
  private _nextFunction: boolean;
  /**
   *
   */
  @NotEnumerable()
  private _useClass: any;

  constructor(private _target: any, private _methodClassName?: string) {
    this.resolve();
  }

  get type() {
    return this._type;
  }

  get errorParam(): boolean {
    return this._errorParam;
  }

  get injectable(): boolean {
    return this._injectable;
  }

  get nextFunction(): boolean {
    return this._nextFunction;
  }

  get methodClassName(): string | undefined {
    return this._methodClassName;
  }

  get target(): any {
    return this._target;
  }

  get services(): ParamMetadata[] {
    if (this.injectable) {
      return ParamRegistry.getParams(this._useClass, this.methodClassName);
    }

    const parameters: any[] = [{service: EXPRESS_REQUEST}, {service: EXPRESS_RESPONSE}];

    if (this.errorParam) {
      parameters.unshift({service: EXPRESS_ERR});
    }

    if (this.nextFunction) {
      parameters.push({service: EXPRESS_NEXT_FN});
    }

    return parameters;
  }

  /**
   *
   */
  private resolve() {
    this._useClass = this._target;

    let handler = this._target;
    let target = this._target;

    if (GlobalProviders.has(this._target)) {
      const provider = GlobalProviders.get(this._target)!;
      this._type = HandlerType.CONTROLLER;

      if (provider.type === ProviderType.MIDDLEWARE) {
        this._type = HandlerType.MIDDLEWARE;
        this._errorParam = Store.from(provider.provide).get("middlewareType") === MiddlewareType.ERROR;
        this._methodClassName = "use";
        this._useClass = target = provider.useClass;
      }
    }

    if (this._methodClassName) {
      this._injectable = ParamRegistry.isInjectable(target, this._methodClassName);
      this._nextFunction = ParamRegistry.hasNextFunction(target, this._methodClassName);

      handler = target.prototype[this._methodClassName];
    }

    if (!this._injectable) {
      this._errorParam = handler.length === 4;
      this._nextFunction = handler.length >= 3;
    }
  }
}

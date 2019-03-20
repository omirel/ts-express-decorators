import {nameOf} from "@tsed/core";
import {InjectorService} from "@tsed/di";
import * as Express from "express";
import {FilterBuilder} from "../../filters/class/FilterBuilder";
import {ParamMetadata} from "../../filters/class/ParamMetadata";
import {IFilterPreHandler} from "../../filters/interfaces/IFilterPreHandler";
import {HandlerType} from "../interfaces/HandlerType";
import {EndpointMetadata} from "./EndpointMetadata";
import {HandlerMetadata} from "./HandlerMetadata";

/**
 * @stable
 */
export class HandlerBuilder {
  private filters: any[];
  private injector: InjectorService;
  private debug: boolean;

  constructor(private handlerMetadata: HandlerMetadata) {}

  /**
   *
   * @param obj
   * @returns {HandlerBuilder}
   */
  static from(obj: any | EndpointMetadata) {
    if (obj instanceof EndpointMetadata) {
      // Endpoint
      return new HandlerBuilder(new HandlerMetadata(obj.target, obj.methodClassName));
    }

    // Middleware
    return new HandlerBuilder(new HandlerMetadata(obj));
  }

  /**
   *
   * @returns {any}
   */
  public build(injector: InjectorService) {
    this.injector = injector;
    this.debug = injector.settings.debug;

    this.filters = this.handlerMetadata.services.map((param: ParamMetadata) => new FilterBuilder(injector).build(param));

    if (this.handlerMetadata.errorParam) {
      return (err: any, request: any, response: any, next: any) => this.invoke(request, response, next, err);
    } else {
      return (request: any, response: any, next: any) => this.invoke(request, response, next);
    }
  }

  /**
   *
   */
  private getHandler(locals: Map<string | Function, any> = new Map<string | Function, any>()): Function {
    if (this.handlerMetadata.type === HandlerType.FUNC) {
      return this.handlerMetadata.target;
    }

    const instance: any = this.injector.invoke(this.handlerMetadata.target, locals, {useScope: true});

    return instance[this.handlerMetadata.methodClassName!].bind(instance);
  }

  /**
   *
   * @returns {Promise<TResult2|TResult1>}
   * @param request
   * @param response
   * @param next
   * @param err
   */
  private async invoke(request: Express.Request, response: Express.Response, next: any, err?: any): Promise<any> {
    next = this.buildNext(request, response, next);

    try {
      this.log(request, {event: "invoke.start"});
      const args = this.runFilters(request, response, next, err);
      const result = await this.getHandler(request.getContainer())(...args);

      if (!next.isCalled) {
        if (this.handlerMetadata.type !== "function" && result !== undefined) {
          request.storeData(result);
        }

        if (!this.handlerMetadata.nextFunction) {
          next();
        }
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   *
   * @param {Express.Request} request
   * @param o
   * @returns {string}
   */
  private log(request: Express.Request, o: any = {}) {
    if (request.id && this.debug) {
      const target = this.handlerMetadata.target;
      const injectable = this.handlerMetadata.injectable;
      const methodName = this.handlerMetadata.methodClassName;

      request.log.debug({
        type: this.handlerMetadata.type,
        target: (target ? nameOf(target) : target.name) || "anonymous",
        methodName,
        injectable,
        data: request && request.getStoredData ? request.getStoredData() : undefined,
        ...o
      });
    }
  }

  /**
   *
   * @param {Express.Request} request
   * @param {Express.Response} response
   * @param {Express.NextFunction} next
   * @returns {any}
   */
  private buildNext(request: Express.Request, response: Express.Response, next: any): any {
    next.isCalled = false;

    return (error?: any) => {
      next.isCalled = true;
      if (response.headersSent) {
        return;
      }

      /* istanbul ignore else */
      this.log(request, {event: "invoke.end", error});

      return next(error);
    };
  }

  /**
   *
   * @param request
   * @param response
   * @param next
   * @param err
   */
  private runFilters(request: Express.Request, response: Express.Response, next: Express.NextFunction, err: any) {
    return this.filters.map((filter: IFilterPreHandler) => {
      return filter({
        request,
        response,
        next,
        err
      });
    });
  }
}

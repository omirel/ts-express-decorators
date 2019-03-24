import {Type} from "@tsed/core";
import {IProvider} from "@tsed/di";
import {Partial} from "ts-log-debug/lib/appenders/interfaces/AppenderConfiguration";
import {IRouterSettings} from "../../config/interfaces/IServerSettings";
import {IControllerMiddlewares} from "./IControllerMiddlewares";
import {PathParamsType} from "./PathParamsType";

/**
 *
 */
export interface IControllerOptions extends Partial<IProvider<any>> {
  path?: PathParamsType;
  children?: Type<any>[];
  routerOptions?: IRouterSettings;
  middlewares?: IControllerMiddlewares;
}

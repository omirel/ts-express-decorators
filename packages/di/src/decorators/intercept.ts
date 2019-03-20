import {Store, Type} from "@tsed/core";
import {IInjectableProperties, InjectablePropertyType} from "../interfaces";
import {IInterceptor} from "../interfaces/IInterceptor";

/**
 * Attaches interceptor to method call and executes the before and after methods
 *
 * @param interceptor
 * @param options
 * @decorator
 */
export function Intercept<T extends IInterceptor>(interceptor: Type<T>, options?: any): Function {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Store.from(target).merge("injectableProperties", {
      [propertyKey]: {
        bindingType: InjectablePropertyType.INTERCEPTOR,
        propertyKey,
        useType: interceptor,
        options
      }
    } as IInjectableProperties);

    return descriptor;
  };
}

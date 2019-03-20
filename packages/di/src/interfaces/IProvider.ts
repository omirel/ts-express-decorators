import {Type} from "@tsed/core";
import {ProviderType} from "./ProviderType";
import {TokenProvider} from "./TokenProvider";

/**
 *
 */
export interface IProvider<T> {
  /**
   * An injection token. (Typically an instance of `Type` or `InjectionToken`, but can be `any`).
   */
  provide: TokenProvider;
  /**
   * Provider type
   */
  type: ProviderType | any;
  /**
   * Instance build by the injector
   */
  instance?: T;
  /**
   * Define dependencies to build the provider
   */
  deps?: TokenProvider[];
  /**
   * Class to instantiate for the `token`.
   */
  useClass?: Type<T>;
  /**
   * Provide a function to build the provider
   */
  useFactory?: Function;
  /**
   * Provide predefined value
   */
  useValue?: any;

  /**
   *
   */
  [key: string]: any;
}

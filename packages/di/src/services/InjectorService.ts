import {deepClone, getClass, getClassOrSymbol, Metadata, nameOf, prototypeOf, Store, Type} from "@tsed/core";
import {Container} from "../class/Container";
import {LocalsContainer} from "../class/LocalsContainer";
import {Provider} from "../class/Provider";
import {Injectable} from "../decorators/injectable";
import {
  IDISettings,
  IInjectableProperties,
  IInjectablePropertyService,
  IInjectablePropertyValue,
  IInterceptor,
  IInterceptorContext,
  IInvokeOptions,
  ILocalsContainer,
  InjectablePropertyType,
  IProvider,
  ProviderScope,
  TokenProvider
} from "../interfaces";
import {GlobalProviders} from "../registries/GlobalProviders";

interface IInvokeSettings {
  token: TokenProvider;
  parent?: TokenProvider;
  scope: ProviderScope;
  useScope: boolean;
  isBindable: boolean;
  deps: any[];

  construct(deps: TokenProvider[]): any;
}

/**
 * This service contain all services collected by `@Service` or services declared manually with `InjectorService.factory()` or `InjectorService.service()`.
 *
 * ### Example:
 *
 * ```typescript
 * import {InjectorService} from "@tsed/common";
 *
 * // Import the services (all services are decorated with @Service()";
 * import MyService1 from "./services/service1";
 * import MyService2 from "./services/service2";
 * import MyService3 from "./services/service3";
 *
 * // When all services is imported you can load InjectorService.
 * const injector = new InjectorService()
 * injector.load();
 *
 * const myService1 = injector.get<MyService1>(MyServcice1);
 * ```
 *
 * > Note: `ServerLoader` make this automatically when you use `ServerLoader.mount()` method (or settings attributes) and load services and controllers during the starting server.
 *
 */
@Injectable({
  scope: ProviderScope.SINGLETON,
  global: true
})
export class InjectorService extends Container {
  public settings: IDISettings = new Map();
  private _scopes: {[key: string]: ProviderScope} = {};

  constructor() {
    super();
    const provider = this.addProvider(InjectorService).getProvider(InjectorService)!;
    provider.instance = this;
  }

  /**
   *
   */
  get scopes(): {[key: string]: ProviderScope} {
    return this._scopes || {};
  }

  /**
   *
   * @param scopes
   */
  set scopes(scopes: {[key: string]: ProviderScope}) {
    this._scopes = scopes;
  }

  /**
   * Retrieve default scope for a given provider.
   * @param provider
   */
  public scopeOf(provider: Provider<any>) {
    return provider.scope || this.scopes[provider.type] || ProviderScope.SINGLETON;
  }

  /**
   * Add a provider to the
   * @param token
   * @param settings
   */
  public addProvider(token: TokenProvider, settings: Partial<IProvider<any>> = {}): this {
    return super.add(token, settings);
  }

  /**
   *
   * @param token
   */
  public hasProvider(token: TokenProvider) {
    return super.has(token);
  }

  /**
   * Add a provider to the
   * @param token
   * @param provider
   */
  public setProvider(token: TokenProvider, provider: Provider<any>) {
    return super.set(token, provider);
  }

  /**
   * The getProvider() method returns a specified element from a Map object.
   * @returns {T} Returns the element associated with the specified key or undefined if the key can't be found in the Map object.
   * @param token
   */
  public getProvider(token: TokenProvider): Provider<any> | undefined {
    return super.get(token);
  }

  /**
   * Clone a provider from GlobalProviders and the given token. forkProvider method build automatically the provider if the instance parameter ins't given.
   * @param token
   * @param instance
   */
  public async forkProvider(token: TokenProvider, instance?: any): Promise<Provider<any>> {
    const provider = this.addProvider(token).getProvider(token)!;

    if (!instance) {
      instance = await this.invoke(token);
    }

    provider.instance = instance;

    return provider;
  }

  /**
   * Return a list of instance build by the injector.
   */
  public toArray(): any[] {
    return super.toArray().map(provider => provider.instance);
  }

  /**
   * Get a service or factory already constructed from his symbol or class.
   *
   * #### Example
   *
   * ```typescript
   * import {InjectorService} from "@tsed/common";
   * import MyService from "./services";
   *
   * class OtherService {
   *      constructor(injectorService: InjectorService) {
   *          const myService = injectorService.get<MyService>(MyService);
   *      }
   * }
   * ```
   *
   * @param target The class or symbol registered in InjectorService.
   * @returns {boolean}
   */
  public get<T>(target: Type<T> | symbol | any): T | undefined {
    return (super.has(target) && super.get(getClassOrSymbol(target))!.instance) || undefined;
  }

  /**
   * The has() method returns a boolean indicating whether an element with the specified key exists or not.
   * @param key
   * @returns {boolean}
   */
  public has(key: TokenProvider): boolean {
    return super.has(getClassOrSymbol(key)) && !!this.get(key);
  }

  /**
   * Invoke the class and inject all services that required by the class constructor.
   *
   * #### Example
   *
   * ```typescript
   * import {InjectorService} from "@tsed/common";
   * import MyService from "./services";
   *
   * class OtherService {
   *     constructor(injectorService: InjectorService) {
   *          const myService = injectorService.invoke<MyService>(MyService);
   *      }
   *  }
   * ```
   *
   * @param token The injectable class to invoke. Class parameters are injected according constructor signature.
   * @param locals  Optional object. If preset then any argument Class are read from this object first, before the `InjectorService` is consulted.
   * @param options
   * @returns {T} The class constructed.
   */
  public async invoke<T>(
    token: TokenProvider,
    locals: ILocalsContainer = new LocalsContainer(),
    options: Partial<IInvokeOptions<T>> = {}
  ): Promise<T> {
    const provider = this.getProvider(token);
    let instance: any;

    if (locals.has(token)) {
      instance = locals.get(token);
    } else if (!provider || options.rebuild) {
      instance = await this._invoke(token, locals, options);
    } else {
      switch (this.scopeOf(provider)) {
        case ProviderScope.SINGLETON:
          if (!this.has(token)) {
            provider.instance = await this._invoke(token, locals, options);
          }

          instance = this.get<T>(token)!;
          break;

        case ProviderScope.REQUEST:
          instance = await this._invoke(token, locals, options);
          locals.set(token, instance);
          break;

        case ProviderScope.INSTANCE:
          instance = await this._invoke(provider.provide, locals, options);
          break;
      }
    }

    if (!instance) {
      // throw new InjectionError(token, nameOf(dependency), "injection failed", er);
      throw new Error("Unable to create new instance from provided token (" + nameOf(token) + ")");
    }

    return instance;
  }

  /**
   * Build all providers from GlobalProviders or from given providers parameters and emit `$onInit` event.
   *
   * @param container
   */
  async load(container: Map<TokenProvider, Provider<any>> = GlobalProviders): Promise<LocalsContainer<any>> {
    const locals = new LocalsContainer();

    // Clone all providers in the container
    container.forEach((provider, token) => {
      if (!this.hasProvider(token)) {
        this.setProvider(token, provider.clone());
      }
    });

    const providers = super.toArray();

    for (const provider of providers) {
      if (!locals.has(provider.provide) && this.scopeOf(provider) === ProviderScope.SINGLETON) {
        await this.invoke(provider.provide, locals);
      }

      if (provider.instance) {
        locals.set(provider.provide, provider.instance);
      }
    }

    await locals.emit("$onInit");

    return locals;
  }

  /**
   *
   * @param instance
   */
  public bindInjectableProperties(instance: any) {
    const store = Store.from(getClass(instance));

    if (store && store.has("injectableProperties")) {
      const properties: IInjectableProperties = store.get("injectableProperties") || [];

      Object.keys(properties)
        .map(key => properties[key])
        .forEach(definition => {
          switch (definition.bindingType) {
            case InjectablePropertyType.METHOD:
              this.bindMethod(instance, definition);
              break;
            case InjectablePropertyType.PROPERTY:
              this.bindProperty(instance, definition);
              break;
            case InjectablePropertyType.CONSTANT:
              this.bindConstant(instance, definition);
              break;
            case InjectablePropertyType.VALUE:
              this.bindValue(instance, definition);
              break;
            case InjectablePropertyType.INTERCEPTOR:
              this.bindInterceptor(instance, definition);
              break;
          }
        });
    }
  }

  /**
   *
   * @param instance
   * @param {string} propertyKey
   */
  public bindMethod(instance: any, {propertyKey}: IInjectablePropertyService) {
    const target = getClass(instance);
    const originalMethod = instance[propertyKey];
    const deps = Metadata.getParamTypes(prototypeOf(target), propertyKey);

    instance[propertyKey] = () => {
      const services = deps.map((dependency: any) => this.get(dependency));

      return originalMethod.call(instance, ...services);
    };
  }

  /**
   *
   * @param instance
   * @param {string} propertyKey
   * @param {any} useType
   */
  public bindProperty(instance: any, {propertyKey, useType}: IInjectablePropertyService) {
    Object.defineProperty(instance, propertyKey, {
      get: () => {
        return this.get(useType);
      }
    });
  }

  /**
   *
   * @param instance
   * @param {string} propertyKey
   * @param {any} useType
   */
  public bindValue(instance: any, {propertyKey, expression, defaultValue}: IInjectablePropertyValue) {
    const descriptor = {
      get: () => this.settings.get(expression) || defaultValue,
      set: (value: any) => this.settings.set(expression, value),
      enumerable: true,
      configurable: true
    };
    Object.defineProperty(instance, propertyKey, descriptor);
  }

  /**
   *
   * @param instance
   * @param {string} propertyKey
   * @param {any} useType
   */
  public bindConstant(instance: any, {propertyKey, expression, defaultValue}: IInjectablePropertyValue) {
    const clone = (o: any) => {
      if (o) {
        return Object.freeze(deepClone(o));
      }

      return defaultValue;
    };

    const descriptor = {
      get: () => clone(this.settings.get(expression)),

      enumerable: true,
      configurable: true
    };
    Object.defineProperty(instance, propertyKey, descriptor);

    return descriptor;
  }

  /**
   *
   * @param instance
   * @param propertyKey
   * @param useType
   * @param options
   */
  public bindInterceptor(instance: any, {propertyKey, useType, options}: IInjectablePropertyService) {
    const target = getClass(instance);
    const originalMethod = instance[propertyKey];

    instance[propertyKey] = (...args: any[]) => {
      const context: IInterceptorContext<any> = {
        target,
        method: propertyKey,
        propertyKey,
        args,
        proceed(err?: Error) {
          if (!err) {
            return originalMethod.apply(instance, args);
          }

          throw err;
        }
      };

      return this.get<IInterceptor>(useType)!.aroundInvoke(context, options);
    };
  }

  /**
   *
   * @param target
   * @param locals
   * @param options
   * @private
   */
  private async _invoke<T>(target: TokenProvider, locals: ILocalsContainer, options: Partial<IInvokeOptions<T>> = {}): Promise<T> {
    const {token, deps, construct, isBindable} = this.mapInvokeOptions(target, options);

    const {onInvoke} = GlobalProviders.getRegistrySettings(target); // FIXME should not be used
    const provider = this.getProvider(target);

    if (provider && onInvoke) {
      onInvoke(provider, locals, deps);
    }

    const services = [];
    for (const dependency of deps) {
      const service = await this.invoke(dependency, locals, {parent: token});
      services.push(service);
    }

    const instance = construct(services);

    if (instance && isBindable) {
      this.bindInjectableProperties(instance);
    }

    return instance;
  }

  /**
   * Create options to invoke a provider or class.
   * @param token
   * @param options
   */
  private mapInvokeOptions(token: TokenProvider, options: Partial<IInvokeOptions<any>>): IInvokeSettings {
    const {useScope = false} = options;
    let deps: TokenProvider[] | undefined = options.deps;
    let scope = options.scope;
    let construct = (deps: TokenProvider[]) => new token(...deps);
    let isBindable = false;

    if (this.hasProvider(token)) {
      const provider = this.getProvider(token)!;

      scope = scope || this.scopeOf(provider);
      deps = deps || provider.deps;

      if (provider.useValue) {
        construct = (deps: TokenProvider[]) => provider.useValue;
      } else if (provider.useFactory) {
        construct = (deps: TokenProvider[]) => provider.useFactory(...deps);
      } else if (provider.useClass) {
        isBindable = true;
        deps = deps || Metadata.getParamTypes(provider.useClass);
        construct = (deps: TokenProvider[]) => new provider.useClass(...deps);
      }
    } else {
      deps = deps || Metadata.getParamTypes(token);
    }

    return {
      token,
      scope: scope || Store.from(token).get("scope") || ProviderScope.SINGLETON,
      deps: deps! || [],
      useScope,
      isBindable,
      construct
    };
  }
}

import {Container, GlobalProviders, Provider, ProviderType, TokenProvider} from "@tsed/di";

export class ProviderContainer extends Container<Provider<any>> {
  /**
   *
   * @param token
   * @param value
   */
  public add(token: TokenProvider, value?: Provider<any>): this {
    value = value || (GlobalProviders.get(token)! as any);

    if (GlobalProviders.has(token)) {
      value = GlobalProviders.get(token)!.clone();
    }

    return super.set(token, value!);
  }

  /**
   * Get all providers registered in the injector container.
   *
   * @param {ProviderType} type Filter the list by the given ProviderType.
   * @returns {[RegistryKey , Provider<any>][]}
   */
  public getProviders(type?: ProviderType | string): Provider<any>[] {
    return Array.from(this)
      .filter(([key, provider]) => (type ? provider.type === type : true))
      .map(([key, provider]) => provider);
  }
}

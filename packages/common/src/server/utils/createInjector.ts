import {GlobalProviders, InjectorService, ProviderType} from "@tsed/di";
import {ServerSettingsService} from "../../config/services/ServerSettingsService";

export async function createInjector(settings: any): Promise<InjectorService> {
  const injector = new InjectorService();

  // Init settings
  injector.settings = await createSettingsService(injector);

  injector.scopes = {
    ...(settings.scopes || {}),
    [ProviderType.CONTROLLER]: settings.controllerScope
  };

  return injector;
}

async function createSettingsService(injector: InjectorService): Promise<ServerSettingsService> {
  const provider = GlobalProviders.get(ServerSettingsService)!.clone();

  provider.instance = await injector.invoke<ServerSettingsService>(provider.useClass);
  injector.addProvider(ServerSettingsService, provider);

  return provider.instance;
}

# Override Authentication

The annotation [`@Authenticated()`](/api/common/mvc/decorators/method/authenticated.md) use the [`AuthenticatedMiddleware`](/api/common/mvc/components/AuthenticatedMiddleware.md)
to check the authentication strategy. 

To customise this behavior, the right way is to override the default `AuthenticatedMiddleware` then implement directly 
your authentication strategy (with [passport.js for example](/tutorials/passport.md)).

## Use case

```typescript
@ControllerProvider("/mypath")
class MyCtrl {
  @Get("/")
  @Authenticated({role: "admin"})
  public getResource(){}
}
```

## Example

```typescript
import {OverrideMiddleware, AuthenticatedMiddleware} from "@tsed/common";
import {Forbidden} from "ts-httpexceptions";

@OverrideMiddleware(AuthenticatedMiddleware)
export class MyAuthMiddleware implements IMiddleware {
    public use(@EndpointInfo() endpoint: EndpointMetadata,
               @Request() request: Express.Request,
               @Response() response: Express.Response,
               @Next() next: Express.NextFunction) { // next is optional
        
        // options given to the @Authenticated decorator
        const options = endpoint.get(AuthenticatedMiddleware) || {};
        // options => {role: 'admin'}
        
        if (!request.isAuthenticated()) { // passport.js
          throw new Forbidden("Forbidden")  
        }
        
        next();
    }
}
```

::: tip
By default, the server import automatically your middlewares matching with this rules `${rootDir}/middlewares/**/*.ts` (See [componentScan configuration](/configuration.md)).

```
.
├── src
│   ├── controllers
│   ├── services
│   ├── middlewares
│   └── Server.ts
└── package.json
```

If not, just import your middleware in your server or edit the [componentScan configuration](/configuration.md).

```typescript
import {ServerLoader, ServerSettings} from "@tsed/common";
import "./src/other/directory/MyAuthMiddleware";

@ServerSettings({
    ...
})
export class Server extends ServerLoader {
  
 
}
```
:::

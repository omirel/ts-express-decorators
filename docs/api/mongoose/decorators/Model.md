---
sidebar: auto
meta:
 - name: keywords
   description: api typescript node.js documentation Model decorator
---
# Model <Badge text="Decorator" type="decorator"/>
<!-- Summary -->
<section class="symbol-info"><table class="is-full-width"><tbody><tr><th>Module</th><td><div class="lang-typescript"><span class="token keyword">import</span> { Model }&nbsp;<span class="token keyword">from</span>&nbsp;<span class="token string">"@tsed/mongoose"</span></div></td></tr><tr><th>Source</th><td><a href="https://github.com/Romakita/ts-express-decorators/blob/v4.30.1/src//mongoose/decorators/model.ts#L0-L0">/mongoose/decorators/model.ts</a></td></tr></tbody></table></section>

<!-- Overview -->
## Overview


<pre><code class="typescript-lang ">function <span class="token function">Model</span><span class="token punctuation">(</span>options<span class="token punctuation">:</span> <a href="/api/mongoose/interfaces/MongooseModelOptions.html"><span class="token">MongooseModelOptions</span></a><span class="token punctuation"> = </span><span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  return <span class="token punctuation">(</span>target<span class="token punctuation">:</span> <span class="token keyword">any</span><span class="token punctuation">)</span> =&gt<span class="token punctuation">;</span> <span class="token punctuation">{</span>
    <span class="token keyword">const</span> schema<span class="token punctuation"> = </span><span class="token function">createSchema</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> options.schemaOptions<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token function">applySchemaOptions</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> options<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token function">registerModel</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> <span class="token function">createModel</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> schema<span class="token punctuation">,</span> options.name<span class="token punctuation">,</span> options.collection<span class="token punctuation">,</span> options.skipInit<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>



<!-- Description -->
## Description

::: v-pre

Define a class a Mongoose Model. The model can be injected to the Service, Controller, Middleware, Converters or Filter with
`@Inject` annotation.

### Example

```typescript
@Model()
export class EventModel {
  @Property()
  field: string;
}
```

Then inject the model into a service:

```typescript
class MyService {
   constructor(@Inject(EventModel) eventModel: MongooseModel<EventModel>) {
       eventModel.find().exec();
   }
}
```

### Options

- `schemaOptions` (mongoose.SchemaOptions): Option to configure the schema behavior.
- `name` (String): model name.
- `collection` (String): collection (optional, induced from model name).
- `skipInit` (Boolean): skipInit whether to skip initialization (defaults to false).


:::
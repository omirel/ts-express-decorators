import "@tsed/ajv";
import {InjectorService, ProviderType} from "@tsed/di";
import {inject} from "@tsed/testing";
import {expect} from "chai";
import * as Sinon from "sinon";
import {BadRequest} from "ts-httpexceptions";
import {FakeRequest} from "../../../../../test/helper/FakeRequest";
import {FakeResponse} from "../../../../../test/helper/FakeResponse";
import {$logStub, restore} from "../../../../../test/helper/tools";
import {FilterBuilder} from "../../../src/filters/class/FilterBuilder";
import {EndpointMetadata} from "../../../src/mvc/class/EndpointMetadata";
import {HandlerBuilder} from "../../../src/mvc/class/HandlerBuilder";

class Test {
  get() {
  }

  use() {
  }
}

describe("HandlerBuilder", () => {
  describe("from()", () => {
    describe("from Endpoint", () => {
      before(() => {
        this.builder = HandlerBuilder.from(new EndpointMetadata(Test, "get"));
      });

      it("should create builder", () => {
        expect(this.builder.handlerMetadata.target).to.eq(Test);
        expect(this.builder.handlerMetadata.methodClassName).to.eq("get");
      });
    });
    describe("from class", () => {
      before(() => {
        this.builder = HandlerBuilder.from(Test);
      });

      it("should create builder", () => {
        expect(this.builder.handlerMetadata.target).to.eq(Test);
      });
    });
    describe("from function", () => {
      before(() => {
        this.builder = HandlerBuilder.from(() => {
        });
      });

      it("should create builder", () => {
        expect(this.builder.handlerMetadata.target).to.be.a("function");
      });
    });
  });
  describe("build()", () => {
    before(() => {
      this.invokeStub = Sinon.stub(HandlerBuilder.prototype as any, "invoke");
    });

    after(() => {
      this.invokeStub.restore();
    });

    describe("when is a middleware", () => {
      before(
        inject([InjectorService], (injector: InjectorService) => {
          this.response = new FakeResponse();
          this.request = new FakeRequest();
          this.nextSpy = Sinon.spy();
          this.stub = Sinon.stub();

          this.metadata = {
            nextFunction: false,
            errorParam: false,
            target: (req: any, res: any) => {
              this.stub(req, res);
            },
            services: [{param: "param"}]
          };

          this.filterBuildStub = Sinon.stub(FilterBuilder.prototype, "build");

          this.middleware = new HandlerBuilder(this.metadata).build(injector);
          this.middleware({request: "request"}, {response: "response"}, "function");
        })
      );

      after(() => {
        this.filterBuildStub.restore();
      });

      it("should have called invoke method with the correct parameters", () => {
        this.invokeStub.should.have.been.calledWithExactly({request: "request"}, {response: "response"}, "function");
      });

      it("should have called FilterBuilder.build method", () => {
        this.filterBuildStub.should.have.been.calledWithExactly({param: "param"});
      });
    });

    describe("when is an error middleware", () => {
      before(
        inject([InjectorService], (injector: InjectorService) => {
          this.response = new FakeResponse();
          this.request = new FakeRequest();
          this.nextSpy = Sinon.spy();
          this.stub = Sinon.stub();

          this.metadata = {
            nextFunction: false,
            errorParam: true,
            target: (req: any, res: any) => {
              this.stub(req, res);
            },
            services: [{param: "param"}]
          };

          this.middleware = new HandlerBuilder(this.metadata).build(injector);
          this.middleware("error", {request: "request"}, {response: "response"}, "function");
        })
      );

      after(() => {
        this.filterBuildStub.restore();
      });

      it("should call invoke method with the correct parameters", () => {
        this.invokeStub.should.have.been.calledWithExactly({request: "request"}, {response: "response"}, "function", "error");
      });

      it("should have called FilterBuilder.build method", () => {
        this.filterBuildStub.should.have.been.calledWithExactly({param: "param"});
      });
    });
  });
  describe("buildNext()", () => {
    describe("when header is not sent", () => {
      before(() => {
        $logStub.reset();
        this.handlerMetadata = {};
        this.handlerBuilder = new HandlerBuilder(this.handlerMetadata);

        this.nextStub = Sinon.stub();
        this.infoStub = Sinon.stub(this.handlerBuilder, "log").returns("log");

        this.handlerBuilder.buildNext({tagId: "1"}, {}, this.nextStub)();
      });

      it("should change the nextCalled state", () => {
        expect(this.nextStub.isCalled).to.eq(true);
      });
      it("should have called the info method", () => {
        this.infoStub.should.have.been.calledWithExactly({tagId: "1"}, {error: undefined, event: "invoke.end"});
      });
    });

    describe("when header is sent", () => {
      before(() => {
        $logStub.reset();
        this.handlerMetadata = {};
        this.handlerBuilder = new HandlerBuilder(this.handlerMetadata);

        this.nextStub = Sinon.stub();
        this.infoStub = Sinon.stub(this.handlerBuilder, "log").returns("log");

        this.handlerBuilder.buildNext({tagId: "1"}, {headersSent: true}, this.nextStub)();
      });

      it("should change the nextCalled state", () => {
        expect(this.nextStub.isCalled).to.eq(true);
      });
      it("should have called the info method", () => {
        this.infoStub.should.not.have.been.called;
      });
      it("should have called the log.debug with the correct parameters", () => {
        $logStub.debug.should.not.have.been.called;
      });
    });
  });
  describe("log", () => {
    before(() => {
      this.metadata = {
        target: class Test {
        },
        type: "type",
        nextFunction: false,
        injectable: false,
        methodClassName: "methodName"
      };
      this.request = {
        id: "id",
        log: {
          debug: Sinon.stub()
        },
        getStoredData() {
          return "data";
        }
      };
      const handlerBuilder: any = new HandlerBuilder(this.metadata);
      (handlerBuilder as any).debug = true;
      handlerBuilder.log(this.request);
    });

    it("should create a log", () => {
      this.request.log.debug.should.be.calledWithExactly({
        data: "data",
        injectable: false,
        methodName: "methodName",
        target: "Test",
        type: "type"
      });
    });
  });
  describe("invoke()", () => {
    describe("when handler return data", () => {
      before(() => {
        this.response = new FakeResponse();
        this.request = {
          storeData: Sinon.stub(),
          getContainer: Sinon.stub()
        };
        this.nextSpy = Sinon.stub();
        this.getStub = Sinon.stub(Test.prototype, "get").returns({response: "body"} as any);

        this.metadata = {
          type: "controller",
          nextFunction: false
        };

        const handlerBuilder: any = new HandlerBuilder(this.metadata);
        this.buildNextStub = Sinon.stub(handlerBuilder, "buildNext").returns(this.nextSpy);
        this.runFiltersStub = Sinon.stub(handlerBuilder, "runFilters").returns(["parameters"]);
        this.handlerStub = Sinon.stub().returns("someData");
        this.getHandlerStub = Sinon.stub(handlerBuilder, "getHandler").returns(this.handlerStub);

        return handlerBuilder.invoke(this.request, this.response, this.nextSpy);
      });

      after(() => {
        restore(Test.prototype.get);
      });

      it("should have called the buildNext method", () => {
        this.buildNextStub.should.have.been.calledWithExactly(this.request, this.response, this.nextSpy);
      });

      it("should have called the locals method", () => {
        return this.runFiltersStub.should.have.been.calledOnce.and.calledWithExactly(this.request, this.response, this.nextSpy, undefined);
      });

      it("should have called the handler", () => {
        this.handlerStub.should.have.been.calledWithExactly("parameters");
      });

      it("should have called the next callback", () => this.nextSpy.should.have.been.calledWithExactly());

      it("should store data", () => {
        return this.request.storeData.should.have.been.calledWithExactly("someData");
      });

      it("should call getContainer", () => {
        return this.request.getContainer.should.have.been.calledWithExactly();
      });
    });
    describe("when handler return data (nextFunction && function type)", () => {
      before(() => {
        $logStub.reset();
        this.response = new FakeResponse();
        this.request = {
          tagId: "1",
          storeData: Sinon.stub(),
          getContainer: Sinon.stub()
        };
        this.nextSpy = Sinon.stub();
        this.getStub = Sinon.stub(Test.prototype, "get").returns({response: "body"} as any);

        this.metadata = {
          tagId: "1",
          type: "function",
          nextFunction: true
        };

        const handlerBuilder: any = new HandlerBuilder(this.metadata);
        this.logStub = Sinon.stub(handlerBuilder, "log").returns("log");
        this.buildNextStub = Sinon.stub(handlerBuilder, "buildNext").returns(this.nextSpy);
        this.runFiltersStub = Sinon.stub(handlerBuilder, "runFilters").returns(["parameters"]);
        this.handlerStub = Sinon.stub().returns("someData");
        this.getHandlerStub = Sinon.stub(handlerBuilder, "getHandler").returns(this.handlerStub);

        return handlerBuilder.invoke(this.request, this.response, this.nextSpy);
      });

      after(() => {
        restore(Test.prototype.get);
      });
      it("should have called the buildNext method", () => {
        this.buildNextStub.should.have.been.calledWithExactly(this.request, this.response, this.nextSpy);
      });

      it("should have called the locals method", () => {
        return this.runFiltersStub.should.have.been.calledOnce.and.calledWithExactly(this.request, this.response, this.nextSpy, undefined);
      });

      it("should have called the handler", () => {
        this.handlerStub.should.have.been.calledWithExactly("parameters");
      });

      it("should not have called the next callback", () => this.nextSpy.should.not.have.been.called);

      it("should not store data", () => {
        return this.request.storeData.should.not.have.been.called;
      });
    });
    describe("when next isCalled", () => {
      before(() => {
        $logStub.reset();
        this.response = new FakeResponse();
        this.request = {
          tagId: "1",
          storeData: Sinon.stub(),
          getContainer: Sinon.stub()
        };
        this.nextSpy = Sinon.stub();
        this.getStub = Sinon.stub(Test.prototype, "get").returns({response: "body"} as any);

        this.metadata = {
          tagId: "1",
          type: "controller",
          nextFunction: false
        };

        const handlerBuilder: any = new HandlerBuilder(this.metadata);
        this.logStub = Sinon.stub(handlerBuilder, "log").returns("log");
        this.buildNextStub = Sinon.stub(handlerBuilder, "buildNext").returns(this.nextSpy);
        this.runFiltersStub = Sinon.stub(handlerBuilder, "runFilters").returns(["parameters"]);
        this.handlerStub = Sinon.stub().returns("someData");

        this.getHandlerStub = Sinon.stub(handlerBuilder, "getHandler").returns((...args: any[]) => {
          this.nextSpy.isCalled = true;

          return this.handlerStub(...args);
        });

        return handlerBuilder.invoke(this.request, this.response, this.nextSpy);
      });

      after(() => {
        restore(Test.prototype.get);
      });
      it("should have called the buildNext method", () => {
        this.buildNextStub.should.have.been.calledWithExactly(this.request, this.response, this.nextSpy);
      });

      it("should have called the locals method", () => {
        return this.runFiltersStub.should.have.been.calledOnce.and.calledWithExactly(this.request, this.response, this.nextSpy, undefined);
      });

      it("should have called the handler", () => {
        this.handlerStub.should.have.been.calledWithExactly("parameters");
      });

      it("should not have called the next callback", () => this.nextSpy.should.not.have.been.called);

      it("should not store data", () => {
        return this.request.storeData.should.not.have.been.called;
      });
    });
    describe("when handler thrown an error", () => {
      before(() => {
        this.response = new FakeResponse();
        this.request = {
          storeData: Sinon.stub(),
          getContainer: Sinon.stub()
        };
        this.error = new Error("test");
        this.nextSpy = Sinon.stub();
        this.getStub = Sinon.stub(Test.prototype, "get").returns({response: "body"} as any);

        this.metadata = {
          type: "controller",
          nextFunction: false,
          target: Test,
          methodClassName: "get",
          services: []
        };

        const handlerBuilder: any = new HandlerBuilder(this.metadata);
        this.buildNextStub = Sinon.stub(handlerBuilder, "buildNext").returns(this.nextSpy);
        this.runFiltersStub = Sinon.stub(handlerBuilder, "runFilters").returns(["parameters"]);
        this.handlerStub = Sinon.stub().throws(this.error);
        this.getHandlerStub = Sinon.stub(handlerBuilder, "getHandler").returns(this.handlerStub);

        return handlerBuilder.invoke(this.request, this.response, this.nextSpy);
      });

      after(() => {
        restore(Test.prototype.get);
      });

      it("should have called the buildNext method", () => {
        this.buildNextStub.should.have.been.calledWithExactly(this.request, this.response, this.nextSpy);
      });

      it("shoudl have called the getHandler method", () => {
        return this.getHandlerStub.should.have.been.calledOnce;
      });

      it("should have called the locals method", () => {
        return this.runFiltersStub.should.have.been.calledOnce.and.calledWithExactly(this.request, this.response, this.nextSpy, undefined);
      });

      it("should have called the handler", () => {
        this.handlerStub.should.have.been.calledWithExactly("parameters");
      });

      it("should call next spy", () => this.nextSpy.should.have.been.calledWithExactly(this.error));

      it("should not store data", () => {
        return this.request.storeData.should.not.have.been.called;
      });
    });
  });
  describe("getHandler()", () => {
    describe("function", () => {
      it("should return the function handler", async () => {
        // GIVEN
        const handlerMetadata = {
          type: "function",
          target: "target"
        };

        const handlerBuilder: any = new HandlerBuilder(handlerMetadata as any);

        // WHEN
        const handler = await handlerBuilder.getHandler();

        // THEN
        handler.should.eq("target");
      });
    });

    describe("component (middleware)", () => {
      it("should return the handler", async () => {
        // GIVEN
        const handlerMetadata = {
          type: ProviderType.MIDDLEWARE,
          methodClassName: "test",
          target: class Test {
            test() {
            }
          }
        };

        const handlerBuilder = new HandlerBuilder(handlerMetadata as any);
        (handlerBuilder as any).injector = {
          invoke: Sinon.stub().returns(new handlerMetadata.target)
        };

        // WHEN
        const result = await (handlerBuilder as any).getHandler();

        // THEN
        (handlerBuilder as any).injector.invoke.should.have.been.calledWithExactly(
          handlerMetadata.target,
          Sinon.match.instanceOf(Map)
        );

        result.should.instanceof(Function);
      });
    });

    describe("component (controller)", () => {
      it("should return the handler", async () => {
        // GIVEN
        const handlerMetadata = {
          type: ProviderType.CONTROLLER,
          methodClassName: "test",
          target: class Test {
            test() {
            }
          }
        };

        const handlerBuilder = new HandlerBuilder(handlerMetadata as any);
        (handlerBuilder as any).injector = {
          invoke: Sinon.stub().returns(new handlerMetadata.target)
        };

        // WHEN
        const result = await (handlerBuilder as any).getHandler();

        // THEN
        (handlerBuilder as any).injector.invoke.should.have.been.calledWithExactly(
          handlerMetadata.target,
          Sinon.match.instanceOf(Map)
        );

        result.should.instanceof(Function);
      });
    });
  });

  describe("runFilters()", () => {
    describe("when success", () => {
      before(() => {
        this.handlerMetadata = {};
        this.handlerBuilder = new HandlerBuilder(this.handlerMetadata);
        this.handlerBuilder.filters = [Sinon.stub().returns("value1"), Sinon.stub().returns("value2")];

        this.result = this.handlerBuilder.runFilters("request", "response", "next", "err");
      });

      it("should call the filters", () => {
        this.handlerBuilder.filters[0].should.have.been.calledWithExactly({
          request: "request",
          response: "response",
          next: "next",
          err: "err"
        });
        this.handlerBuilder.filters[1].should.have.been.calledWithExactly({
          request: "request",
          response: "response",
          next: "next",
          err: "err"
        });
      });
      it("should return a list of values for each param", () => {
        expect(this.result).to.deep.eq(["value1", "value2"]);
      });
    });

    describe("when there is a bad request", () => {
      before(() => {
        this.handlerMetadata = {name: "name", expression: "expression"};
        this.handlerBuilder = new HandlerBuilder(this.handlerMetadata);
        this.handlerBuilder.filters = [Sinon.stub().throwsException(new BadRequest("BadRequest"))];
        this.handlerBuilder.filters[0].param = this.handlerMetadata;

        try {
          this.handlerBuilder.runFilters("request", "response", "next", "err");
        } catch (er) {
          this.error = er;
        }
      });

      it("should call the filters", () => {
        this.handlerBuilder.filters[0].should.have.been.calledWithExactly({
          request: "request",
          response: "response",
          next: "next",
          err: "err"
        });
      });
      it("should throw error", () => {
        expect(this.error.name).to.eq("BAD_REQUEST");
      });
    });

    describe("when an unknow error", () => {
      before(() => {
        this.handlerMetadata = {name: "name", expression: "expression"};
        this.handlerBuilder = new HandlerBuilder(this.handlerMetadata);
        this.handlerBuilder.filters = [Sinon.stub().throwsException(new Error("BadRequest"))];
        this.handlerBuilder.filters[0].param = this.handlerMetadata;

        try {
          this.handlerBuilder.runFilters("request", "response", "next", "err");
        } catch (er) {
          this.error = er;
        }
      });

      it("should call the filters", () => {
        this.handlerBuilder.filters[0].should.have.been.calledWithExactly({
          request: "request",
          response: "response",
          next: "next",
          err: "err"
        });
      });
      it("should throw error", () => {
        expect(this.error.name).to.deep.eq(new Error("BadRequest").name);
      });
    });
  });
});

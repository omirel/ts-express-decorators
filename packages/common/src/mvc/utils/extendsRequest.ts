import {Container} from "@tsed/di";

const express = require("express");

/**
 *
 * @param {string | any} obj
 * @param {Function} value
 */
export function extendsRequest(obj: string | any, value?: Function | any) {
  if (typeof obj === "object") {
    Object.keys(obj).forEach(key => {
      extendsRequest(key, obj[key]);
    });
  } else {
    Object.defineProperty(express.request, obj, typeof value === "function" ? {value} : value);
  }
}

if (!express.request.setEndpoint) {
  extendsRequest({
    /**
     *
     */
    createContainer() {
      this._container = new Container();
    },
    /**
     *
     */
    getContainer() {
      return this._container;
    },
    /**
     *
     */
    async destroyContainer() {
      await (this._container as Container<any>).destroy();
      delete this._container;
    },
    /**
     *
     * @param endpoint
     */
    setEndpoint(endpoint: any) {
      this._endpoint = endpoint;
    },
    /**
     *
     * @returns {any}
     */
    getEndpoint() {
      return this._endpoint;
    },
    /**
     *
     */
    destroyEndpoint() {
      delete this._endpoint;
    },
    /**
     *
     * @param data
     * @returns {storeData}
     */
    storeData(data: any) {
      this._responseData = data;

      return this;
    },
    /**
     *
     * @returns {any}
     */
    getStoredData() {
      return this._responseData;
    }
  });
}

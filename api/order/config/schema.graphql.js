"use strict";

const _ = require("lodash");

/**
 * Throws an ApolloError if context body contains a bad request
 * @param contextBody - body of the context object given to the resolver
 * @throws ApolloError if the body is a bad request
 */
function checkBadRequest(contextBody) {
  if (_.get(contextBody, "statusCode", 200) !== 200) {
    const message = _.get(contextBody, "error", "Bad Request");
    const exception = new Error(message);
    exception.code = _.get(contextBody, "statusCode", 400);
    exception.data = contextBody;
    throw exception;
  }
}

module.exports = {
  definition: /* GraphQL */ `
    input _OrderLineInput {
      index: Int!
      productVariant: ID!
      quantity: Int!
    }

    input _OrderInput {
      shop: ID!
      note: String = ""
      orderLines: [_OrderLineInput]
    }

    input _createOrderInput {
      data: _OrderInput
    }

    input _PlaceOrderData {
      note: String
    }

    input _placeOrderInput {
      where: InputID
      data: _PlaceOrderData
    }
  `,
  query: "",
  mutation: `
    _placeOrder(input: _placeOrderInput): updateOrderPayload
    _createOrder(input: _createOrderInput): createOrderPayload
  `,
  resolver: {
    Query: {},
    Mutation: {
      _placeOrder: {
        resolverOf: "api::order.order._place",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input);

          await strapi.controllers.order._place(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
      _createOrder: {
        resolverOf: "api::order.order._create",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input);

          await strapi.controllers.order._create(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
    },
  },
};

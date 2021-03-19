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
      order: ID!
      productVariant: ID!
      quantity: Int!
    }

    input _createOrderLineInput {
      data: _OrderLineInput
    }
  `,
  query: "",
  mutation: `
    _createOrderLine(input: _createOrderLineInput): createOrderLinePayload
  `,
  resolver: {
    Query: {},
    Mutation: {
      _createOrderLine: {
        resolverOf: "api::order.order._create",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input.data);

          await strapi.controllers["order-line"]._create(context);
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

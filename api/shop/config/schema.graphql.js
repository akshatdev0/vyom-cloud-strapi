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
    input _addShopShippingAddressInput {
      where: InputID
      data: AddressInput
    }

    input _addShopHolidayInput {
      where: InputID
      data: CalendarEventInput
    }

    type CartItem {
      id: ID!
      index: Int
      productTitle: String
      productVariantTitle: String
      unitPrice: Float
      productPrice: Float
      quantity: Int
    }

    type Cart {
      id: ID!
      note: String
      items: [CartItem]
    }
  `,
  query: `
    _getShoppingCartOfShop(id: ID!): Cart
  `,
  mutation: `
    _addShopShippingAddress(input: _addShopShippingAddressInput): updateShopPayload
    _addShopHoliday(input: _addShopHolidayInput): updateShopPayload
  `,
  resolver: {
    Query: {
      _getShoppingCartOfShop: {
        resolverOf: "api::shop.shop._getShoppingCart",
        resolver: async (obj, options, { context }) => {
          context.params = { ...context.params, ...options.input };

          await strapi.controllers.shop._getShoppingCart(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
    },
    Mutation: {
      _addShopShippingAddress: {
        resolverOf: "api::shop.shop._addShippingAddress",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input);

          await strapi.controllers.shop._addShippingAddress(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
      _addShopHoliday: {
        resolverOf: "api::shop.shop._addHoliday",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options.input);

          await strapi.controllers.shop._addHoliday(context);
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

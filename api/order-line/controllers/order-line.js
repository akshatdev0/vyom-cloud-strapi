"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const CREATE_ORDER_LINE_PROPERTIES = ["order", "productVariant", "quantity"];
const UPDATE_ORDER_LINE_PROPERTIES = ["id", "quantity"];

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */
  async create(ctx) {
    // [TODO]
    // * Put checks
    //   - For Shopkeeper:
    //     - To restrict the action for his own shop
    //   - For Salesman:
    //     - To be within this shop's range
    //     - To have been verified by this shop's shopkeeper using OTP

    // Populate Order Line
    // - Query product & product-variant and set
    //   - productTitle
    //   - productVariantTitle
    //   - [TODO] productVariantAttributes
    //   - unitPrice
    //   - productPrice
    //   - [TBD] appliedPriceRules

    const orderLineValues = _.pick(
      ctx.request.body,
      CREATE_ORDER_LINE_PROPERTIES
    );

    const order = await strapi.services.order.findOne(
      {
        id: orderLineValues.order,
      },
      ["orderLines"]
    );

    if (!order) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.order-not-found",
          message: `No Order found with ID=${orderLineValues.order}.`,
        })
      );
    }

    const productVariant = await strapi.services["product-variant"].findOne({
      id: orderLineValues.productVariant,
    });

    if (!productVariant) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.product-variant-not-found",
          message: `No Product Variant found with ID=${orderLineValues.productVariant}.`,
        })
      );
    }

    if (orderLineValues.quantity < productVariant.minSellingQuantity) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.quantity-less-than-min-selling-quantity",
          message: `This product quantity should be at least ${productVariant.minSellingQuantity}.`,
        })
      );
    }

    if (orderLineValues.quantity > productVariant.maxSellingQuantity) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.quantity-more-than-max-selling-quantity",
          message: `This product quantity should be more than ${productVariant.maxSellingQuantity}.`,
        })
      );
    }

    if (orderLineValues.quantity > productVariant.availableStock) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.quantity-more-than-max-selling-quantity",
          message: `Only ${productVariant.availableStock} product quantity is currently available.`,
        })
      );
    }

    const product = await strapi.services.product.findOne({
      id: productVariant.product,
    });

    if (!product) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.create.error.product-not-found",
          message: `No Product found with ID=${productVariant.product}.`,
        })
      );
    }

    const orderLineData = {
      ...orderLineValues,
      index: order.orderLines ? order.orderLines.length : 0,
      productTitle: product.title,
      productVariantTitle: productVariant.title,
      productVariantAttributes: {},
      unitPrice: productVariant.price,
      productPrice: product.price,
      appliedPriceRules: [],
    };

    // - [TODO] Calculate and update total order price

    const entity = await strapi.services["order-line"].create(orderLineData);
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models["order-line"],
    });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */
  async update(ctx) {
    // [TODO]
    // * Put checks
    //   - For Shopkeeper:
    //     - To restrict the action for his own shop
    //   - For Salesman:
    //     - To be within this shop's range
    //     - To have been verified by this shop's shopkeeper using OTP

    const orderLineValues = _.pick(
      ctx.request.body,
      UPDATE_ORDER_LINE_PROPERTIES
    );

    if (orderLineValues.quantity < productVariant.minSellingQuantity) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.update.error.quantity-less-than-min-selling-quantity",
          message: `This product quantity should be at least ${productVariant.minSellingQuantity}.`,
        })
      );
    }

    if (orderLineValues.quantity > productVariant.maxSellingQuantity) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.update.error.quantity-more-than-max-selling-quantity",
          message: `This product quantity should be more than ${productVariant.maxSellingQuantity}.`,
        })
      );
    }

    if (orderLineValues.quantity > productVariant.availableStock) {
      return ctx.badRequest(
        null,
        formatError({
          id: "order-line.update.error.quantity-more-than-max-selling-quantity",
          message: `Only ${productVariant.availableStock} product quantity is currently available.`,
        })
      );
    }

    // - [TODO] Calculate and update total order price

    const entity = await strapi.services["order-line"].update(
      { id: ctx.params.id },
      orderLineValues
    );
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models["order-line"],
    });
  },
};

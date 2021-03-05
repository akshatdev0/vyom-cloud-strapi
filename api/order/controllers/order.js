"use strict";

const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  /**
   * Create a new order with order lines.
   *
   * @return {Object}
   */
  async _create(ctx) {
    const {
      data: { shop, note, orderLines },
    } = ctx.request.body;

    // [TODO]
    // * Put checks
    //   - Check shop exists
    //   - For Shopkeeper:
    //     - To restrict the action for his own shop
    //   - For Salesman:
    //     - To be within this shop's range
    //     - To have been verified by this shop's shopkeeper using OTP

    // Populate Order Lines
    // - Query product & product-variant and set
    //   - productTitle
    //   - productVariantTitle
    //   - [TODO] productVariantAttributes
    //   - unitPrice
    //   - productPrice
    //   - [TBD] appliedPriceRules
    const populatedOrderLines = [];
    for (let i = 0; i < orderLines.length; i++) {
      const orderLine = orderLines[i];

      const productVariant = await strapi.services["product-variant"].findOne({
        id: orderLine.productVariant,
      });

      if (!productVariant) {
        return ctx.badRequest(
          null,
          formatError({
            id: "order._create.error.product-variant.not.found",
            message: `No Product Variant found with ID=${orderLine.productVariant}.`,
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
            id: "order._create.error.product.not.found",
            message: `No Product found with ID=${productVariant.product}.`,
          })
        );
      }

      populatedOrderLines.push({
        index: orderLine.index,
        quantity: orderLine.quantity,
        productTitle: product.title,
        productVariantTitle: productVariant.title,
        productVariantAttributes: {},
        unitPrice: productVariant.price,
        productPrice: product.price,
        productVariant: orderLine.productVariant,
        appliedPriceRules: [],
      });
    }

    // Populate Order
    // - Generate Order Number
    // - [TODO] Make Order Number Unique
    // - Set initial statuses
    // - Set shopID
    const orderNumber =
      "OD" + (Math.floor(Math.random() * (999999 - 1000 + 1)) + 1000);
    const populatedOrder = {
      number: orderNumber,
      note: note,
      currentStatus: "PLACED",
      paymentStatus: "PENDING",
      shop: shop,
    };

    // Create Order
    const createdOrder = await strapi.services.order.create(populatedOrder);

    // Create Order Lines
    // - Set orderID
    for (let j = 0; j < populatedOrderLines.length; j++) {
      const orderLine = populatedOrderLines[j];
      await strapi.services["order-line"].create({
        ...orderLine,
        order: createdOrder.id,
      });
    }

    // Return final Order
    // - [TODO] Calculate total order price
    const entity = await strapi.services.order.findOne({
      id: createdOrder.id,
    });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.order,
    });
  },
};

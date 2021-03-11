"use strict";

/**
 * shop.js controller
 *
 * @description: A set of functions called "actions" for managing `Shop`.
 */

/* eslint-disable no-useless-escape */
const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");
const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const SHOP_PROPERTIES = [
  "name",
  "type",
  "gstNumber",
  "gstRegistrationType",
  "openingYear",
  "websiteURL",
];

const ADDRESS_PROPERTIES = [
  "addressLine1",
  "addressLine2",
  "landmark",
  "postalCode",
  "plusCode",
  "areaID",
];

const checkShopkeeper = (ctx) => {
  const ctxUser = ctx.state.user;
  if (!ctxUser) {
    return false;
  }

  if (!ctxUser.role) {
    return false;
  }

  if (ctxUser.role.type === "shopkeeper" && ctxUser.shopkeeper) {
    return true;
  }

  return false;
};

const checkOwnShop = (ctx, shopkeeper) => {
  const shopId = ctx.params.id;

  if (!shopkeeper.shops && shopkeeper.shops.length == 0) {
    return false;
  }

  if (shopkeeper.shops.some((s) => s.id == shopId)) {
    return true;
  }

  return false;
};

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */
  async create(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.create.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    if (!checkShopkeeper(ctx)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.create.error.shopkeeper.only",
          message: "Only a shopkeeper can create a shop.",
        })
      );
    }

    const shopValues = _.pick(ctx.request.body, SHOP_PROPERTIES);
    shopValues.rating = 0;
    shopValues.currentSatus = false;
    shopValues.shopkeepers = [ctx.state.user.shopkeeper];

    const entity = await strapi.services.shop.create(shopValues);
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shop,
    });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */
  async update(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.update.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    if (!checkShopkeeper(ctx)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.update.error.shopkeeper.only",
          message: "Only a shopkeeper can update a shop.",
        })
      );
    }

    const shopkeeper = await strapi.services.shopkeeper.findOne({
      id: ctx.state.user.shopkeeper,
    });

    if (!shopkeeper) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.update.error.shopkeeper.not.found",
          message: `No shopkeeper found with ID=${ctx.state.user.shopkeeper}.`,
        })
      );
    }

    if (!checkOwnShop(ctx, shopkeeper)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.update.error.own.shop.only",
          message: "A shopkeeper can only update his own shop.",
        })
      );
    }

    const shopValues = _.pick(ctx.request.body, SHOP_PROPERTIES);
    const entity = await strapi.services.shop.update(
      { id: ctx.params.id },
      shopValues
    );
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shop,
    });
  },

  /**
   * Add shipping address.
   *
   * @return {Object}
   */
  async _addShippingAddress(ctx) {
    if (!ctx.state.user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.addShippingAddress.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    if (!checkShopkeeper(ctx)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.addShippingAddress.error.shopkeeper.only",
          message: "Only a shopkeeper can add a shipping address to a shop.",
        })
      );
    }

    const shopkeeper = await strapi.services.shopkeeper.findOne({
      id: ctx.state.user.shopkeeper,
    });

    if (!shopkeeper) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.addShippingAddress.error.shopkeeper.not.found",
          message: `No shopkeeper found with ID=${ctx.state.user.shopkeeper}.`,
        })
      );
    }

    if (!checkOwnShop(ctx, shopkeeper)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.addShippingAddress.error.own.shop.only",
          message:
            "A shopkeeper can only add shipping address to his own shop.",
        })
      );
    }

    const addressValues = _.pick(ctx.request.body, ADDRESS_PROPERTIES);
    const createdAddress = await strapi.services.address.create(addressValues);

    const shop = await strapi.services.shop.findOne({ id: ctx.params.id });
    if (!shop) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shop.addShippingAddress.error.shop.not.found",
          message: `No shop found with ID=${ctx.params.id}.`,
        })
      );
    }

    const shippingAddressIDs = shop.shippingAddresses.map(
      (address) => address.id
    );

    const entity = await strapi.services.shop.update(
      { id: ctx.params.id },
      {
        shippingAddresses: [...shippingAddressIDs, createdAddress.id],
      }
    );
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shop,
    });
  },
};

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
  "addressLine1",
  "addressLine2",
  "area",
  "pincode",
  "gstNumber",
  "gstRegistrationType",
  "openingYear",
  "websiteURL",
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
          id: "shopkeeper.update.error.not.found",
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
};

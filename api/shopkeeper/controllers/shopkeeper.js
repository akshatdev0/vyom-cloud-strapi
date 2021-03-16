"use strict";

/**
 * shopkeeper.js controller
 *
 * @description: A set of functions called "actions" for managing `Shopkeeper`.
 */

/* eslint-disable no-useless-escape */
const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const checkSelf = (ctx) => {
  const ctxUser = ctx.state.user;
  if (!ctxUser) {
    return false;
  }

  if (
    ctxUser.id &&
    ctx.request.body.user &&
    ctxUser.id == ctx.request.body.user
  ) {
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
    const ctxUser = ctx.state.user;

    if (!ctxUser) {
      strapi.log.error("No authorization header was found.", {
        id: "shopkeeper.create.error.auth.header.missing",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.create.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    // Check that a user can create only himself as a shopkeeper
    if (!checkSelf(ctx)) {
      strapi.log.error("A user can create only himself as a shopkeeper.", {
        id: "shopkeeper.create.error.invalid.action",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.create.error.invalid.action",
          message: "A user can create only himself as a shopkeeper.",
        })
      );
    }

    const role = await strapi
      .query("role", "users-permissions")
      .findOne({ type: "shopkeeper" });

    if (!role) {
      strapi.log.error("Not able to find the Shopkeeper role.", {
        id: "shopkeeper.create.error.role.notFound",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.create.error.role.notFound",
          message: "Not able to find the Shopkeeper role.",
        })
      );
    }

    await strapi
      .query("user", "users-permissions")
      .update({ id: ctxUser.id }, { role: role.id, blocked: false });
    const entity = await strapi.services.shopkeeper.create({
      user: ctxUser.id,
    });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shopkeeper,
    });
  },
};

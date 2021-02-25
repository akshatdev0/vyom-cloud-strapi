"use strict";

/**
 * shopkeeper.js controller
 *
 * @description: A set of functions called "actions" for managing `Shopkeeper`.
 */

/* eslint-disable no-useless-escape */
const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");
const phoneNumberUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PhoneNumberType = require("google-libphonenumber").PhoneNumberType;

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const USER_PROPERTIES = [
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "email",
  "alternateMobileNumber",
];

const checkSelf = (ctx) => {
  const ctxUser = ctx.state.user;
  if (!ctxUser) {
    return false;
  }

  if (!ctxUser.role) {
    return false;
  }

  if (ctxUser.role.type !== "shopkeeper") {
    return false;
  }

  if (ctxUser.shopkeeper && ctxUser.shopkeeper == ctx.params.id) {
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
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.create.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    const role = await strapi
      .query("role", "users-permissions")
      .findOne({ type: "shopkeeper" }, []);

    if (!role) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.create.error.role.notFound",
          message: "Not able to find the Shopkeeper role.",
        })
      );
    }

    const userValues = _.pick(ctx.request.body, USER_PROPERTIES);

    if (userValues.email) {
      if (emailRegExp.test(userValues.email)) {
        userValues.email = userValues.email.toLowerCase();
      } else {
        return ctx.badRequest(
          null,
          formatError({
            id: "shopkeeper.create.error.email.format",
            message: "Please provide valid email address.",
          })
        );
      }
    }

    if (userValues.alternateMobileNumber) {
      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
        userValues.alternateMobileNumber,
        "IN"
      );
      if (
        !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
        phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
      ) {
        return ctx.badRequest(
          null,
          formatError({
            id: "shopkeeper.create.error.alternateMobileNumber.invalid",
            message: "Please provide a valid alternate mobile number.",
          })
        );
      }
    }

    await strapi
      .query("user", "users-permissions")
      .update(
        { id: ctxUser.id },
        { role: role.id, blocked: false, ...userValues }
      );
    const entity = await strapi.services.shopkeeper.create({
      user: ctxUser.id,
    });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shopkeeper,
    });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */
  async update(ctx) {
    const ctxUser = ctx.state.user;

    if (!ctxUser) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.update.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    // Check that a shopkeeper can update his profile only
    if (!checkSelf(ctx)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.update.error.invalid.action",
          message: "A shopkeeper can update only himself.",
        })
      );
    }

    const userValues = _.pick(ctx.request.body, USER_PROPERTIES);

    if (userValues.email) {
      if (emailRegExp.test(userValues.email)) {
        userValues.email = userValues.email.toLowerCase();
      } else {
        return ctx.badRequest(
          null,
          formatError({
            id: "shopkeeper.update.error.email.format",
            message: "Please provide valid email address.",
          })
        );
      }
    }

    if (userValues.alternateMobileNumber) {
      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
        userValues.alternateMobileNumber,
        "IN"
      );
      if (
        !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
        phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
      ) {
        return ctx.badRequest(
          null,
          formatError({
            id: "shopkeeper.update.error.alternateMobileNumber.invalid",
            message: "Please provide a valid alternate mobile number.",
          })
        );
      }
    }

    const shopkeeper = await strapi.services.shopkeeper.findOne({
      id: ctx.params.id,
    });

    if (!shopkeeper) {
      return ctx.badRequest(
        null,
        formatError({
          id: "shopkeeper.update.error.not.found",
          message: `No shopkeeper found with ID=${ctx.params.id}.`,
        })
      );
    }

    await strapi
      .query("user", "users-permissions")
      .update({ id: shopkeeper.user.id }, userValues);

    const entity = await strapi.services.shopkeeper.update(
      { id: ctx.params.id },
      {}
    );
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.shopkeeper,
    });
  },
};

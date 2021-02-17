'use strict';

/**
 * shopkeeper.js controller
 *
 * @description: A set of functions called "actions" for managing `Shopkeeper`.
 */

 /* eslint-disable no-useless-escape */
const _ = require("lodash");
const { sanitizeEntity } = require('strapi-utils');
const phoneNumberUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PhoneNumberType = require("google-libphonenumber").PhoneNumberType;

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const USER_PROPERTIES = [
    'firstName',
    'lastName',
    'gender',
    'dateOfBirth',
    'email',
    'alternateMobileNumber'
];

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
      .query('role', 'users-permissions')
      .findOne({ type: 'shopkeeper' }, []);

    if (!role) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'shopkeeper.create.error.role.notFound',
          message: "Not able to find the 'Shopkeeper' role.",
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
            id: 'shopkeeper.create.error.email.format',
            message: 'Please provide valid email address.',
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

    await strapi.query('user', 'users-permissions').update({ id: ctxUser.id }, { role: role.id, blocked: false, ...userValues });
    const entity = await strapi.services.shopkeeper.create({ user: ctxUser.id });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, { model: strapi.models.shopkeeper });
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

    const userValues = _.pick(ctx.request.body, USER_PROPERTIES);
    
    if (userValues.email) {
      if (emailRegExp.test(userValues.email)) {
        userValues.email = userValues.email.toLowerCase();
      } else {
        return ctx.badRequest(
            null,
            formatError({
            id: 'shopkeeper.update.error.email.format',
            message: 'Please provide valid email address.',
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

    await strapi.query('user', 'users-permissions').update({ id: ctxUser.id }, userValues);

    const { id } = ctx.params;
    const entity = await strapi.services.shopkeeper.update({ id }, {});
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, { model: strapi.models.shopkeeper });
  }
};

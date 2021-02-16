"use strict";

/**
 * Auth.js controller extension
 *
 * @description: A set of functions called "actions" for managing `Auth`.
 */

/* eslint-disable no-useless-escape */
const crypto = require("crypto");
const _ = require("lodash");
const grant = require("grant-koa");
const { sanitizeEntity } = require("strapi-utils");
const phoneNumberUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PhoneNumberType = require("google-libphonenumber").PhoneNumberType;

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async register(ctx) {
    const pluginStore = await strapi.store({
      environment: "",
      type: "plugin",
      name: "users-permissions",
    });

    const settings = await pluginStore.get({
      key: "advanced",
    });

    if (!settings.allow_register) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.advanced.allow_register",
          message: "Register action is currently disabled.",
        })
      );
    }

    const params = {
      ..._.omit(ctx.request.body, [
        "confirmed",
        "confirmationToken",
        "resetPasswordToken",
      ]),
      provider: "local",
    };

    // Mobile Number is required.
    if (!params.mobileNumber) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.register.error.mobileNumber.provide",
          message: "Please provide your mobile number.",
        })
      );
    }

    const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
      params.mobileNumber,
      "IN"
    );
    if (
      !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
      phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.register.error.mobileNumber.invalid",
          message: "Please provide a valid mobile number.",
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      mobileNumber: params.mobileNumber,
    });

    if (user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.register.error.mobileNumber.taken",
          message: "Mobile number is already taken.",
        })
      );
    }

    try {
      params.username = params.mobileNumber;
      const user = await strapi
        .query("user", "users-permissions")
        .create(params);

      const sanitizedUser = sanitizeEntity(user, {
        model: strapi.query("user", "users-permissions").model,
      });

      return ctx.send({
        user: sanitizedUser,
      });
    } catch (err) {
      ctx.badRequest(
        null,
        formatError({
          id: "Auth.register.error",
          message: err.message,
        })
      );
    }
  },

  async smsConfirmation(ctx) {
    const { confirmation: confirmationToken } = ctx.query;

    const { user: userService, jwt: jwtService } = strapi.plugins[
      "users-permissions"
    ].services;

    if (_.isEmpty(confirmationToken)) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.smsConfirmation.error.token.invalid",
          message: "Token is invalid.",
        })
      );
    }

    const user = await userService.fetch({ confirmationToken }, []);

    if (!user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.smsConfirmation.error.token.invalid",
          message: "Token is invalid.",
        })
      );
    }

    await userService.edit(
      { id: user.id },
      { confirmed: true, confirmationToken: null }
    );

    ctx.send({
      jwt: jwtService.issue({ id: user.id }),
      user: sanitizeEntity(user, {
        model: strapi.query("user", "users-permissions").model,
      }),
    });
  },

  async sendSmsConfirmation(ctx) {
    const params = _.assign(ctx.request.body);

    if (!params.mobileNumber) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.sendSmsConfirmation.error.mobileNumber.provide",
          message: "Please provide your mobile number.",
        })
      );
    }

    const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
      params.mobileNumber,
      "IN"
    );
    if (
      !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
      phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.sendSmsConfirmation.error.mobileNumber.invalid",
          message: "Please provide a valid mobile number.",
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      mobileNumber: params.mobileNumber,
    });

    if (user.confirmed) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.sendSmsConfirmation.error.mobileNumber.already.confirmed",
          message: "Mobile number is already confirmed.",
        })
      );
    }

    if (user.blocked) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.sendSmsConfirmation.error.user.blocked",
          message: "User has been blocked.",
        })
      );
    }

    try {
      const confirmationToken = await strapi.plugins[
        "users-permissions"
      ].services.user.sendConfirmationSms(user);

      ctx.send({
        mobileNumber: user.mobileNumber,
        token: confirmationToken,
        sent: true,
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }
  },
};

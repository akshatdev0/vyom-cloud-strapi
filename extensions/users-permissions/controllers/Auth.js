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

    // Mobile Number (username) is required.
    if (!params.username) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.mobileNumber.provide",
          message: "Please provide your mobile number.",
        })
      );
    }

    const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
      params.username,
      "IN"
    );
    if (
      !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
      phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.mobileNumber.invalid",
          message: "Please provide a valid mobile number.",
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      username: params.username,
    });

    if (user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.mobileNumber.taken",
          message: "Mobile number is already taken.",
        })
      );
    }

    try {
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
      const adminError = _.includes(err.message, "username")
        ? {
            id: "Auth.form.error.mobileNumber.taken",
            message: "Mobile number is already taken.",
          }
        : { id: "Auth.form.error.email.taken", message: "Email already taken" };

      ctx.badRequest(null, formatError(adminError));
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
          id: "Auth.error.token.invalid",
          message: "Token is invalid.",
        })
      );
    }

    const user = await userService.fetch({ confirmationToken }, []);

    if (!user) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.error.token.invalid",
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

    if (!params.username) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.error.mobileNumber.provide",
          message: "Please provide your mobile number.",
        })
      );
    }

    const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
      params.username,
      "IN"
    );
    if (
      !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
      phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.error.mobileNumber.invalid",
          message: "Please provide a valid mobile number.",
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      username: params.username,
    });

    if (user.confirmed) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.error.mobileNumber.already.confirmed",
          message: "Mobile number is already confirmed.",
        })
      );
    }

    if (user.blocked) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.error.user.blocked",
          message: "User has been blocked.",
        })
      );
    }

    try {
      const confirmationToken = await strapi.plugins[
        "users-permissions"
      ].services.user.sendConfirmationSms(user);

      const user1 = await strapi.query("user", "users-permissions").findOne({
        username: params.username,
      });

      ctx.send({
        mobileNumber: user.username,
        token: confirmationToken,
        sent: true,
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }
  },
};

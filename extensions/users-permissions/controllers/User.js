"use strict";

const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");
const phoneNumberUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const PhoneNumberType = require("google-libphonenumber").PhoneNumberType;

const emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const sanitizeUser = (user) =>
  sanitizeEntity(user, {
    model: strapi.query("user", "users-permissions").model,
  });

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const CREATE_USER_PROPERTIES = [
  "mobileNumber",
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "email",
  "alternateMobileNumber",
];

const UPDATE_USER_PROPERTIES = [
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "email",
  "alternateMobileNumber",
];

const checkAdminUser = (ctx) => {
  return (
    ctx.state.isAuthenticatedAdmin && ctx.state.isAuthenticatedAdmin === true
  );
};

const checkSelf = (ctx) => {
  const ctxUser = ctx.state.user;
  if (!ctxUser) {
    return false;
  }

  if (ctxUser.id && ctxUser.id == ctx.params.id) {
    return true;
  }

  return false;
};

module.exports = {
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    if (checkAdminUser(ctx)) {
      strapi.log.error("Cannot create an Admin User.", {
        id: "user.create.error.invalid.action",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "user.create.error.invalid.action",
          message: "Cannot create an Admin User.",
        })
      );
    }

    const userValues = _.pick(ctx.request.body, CREATE_USER_PROPERTIES);

    const advancedConfigs = await strapi
      .store({
        environment: "",
        type: "plugin",
        name: "users-permissions",
        key: "advanced",
      })
      .get();

    const { mobileNumber, email, alternateMobileNumber } = userValues;

    // Mobile Number is required.
    if (!mobileNumber) {
      return ctx.badRequest(
        null,
        formatError({
          id: "user.create.error.mobileNumber.provide",
          message: "Please provide Mobile Number.",
        })
      );
    }

    const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
      mobileNumber,
      "IN"
    );
    if (
      !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
      phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.signup.error.mobileNumber.invalid",
          message: "Please provide a valid Mobile Number.",
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      mobileNumber: mobileNumber,
    });
    if (user) {
      if (user.confirmed && user.password) {
        return ctx.badRequest(
          null,
          formatError({
            id: "Auth.signup.error.mobileNumber.taken",
            message: "Mobile number is already taken.",
          })
        );
      }
    }

    if (_.has(userValues, "email")) {
      if (!email) {
        return ctx.badRequest("email.notNull");
      }

      if (!emailRegExp.test(email)) {
        strapi.log.error("Please provide valid email address.", {
          id: "user.create.error.email.format",
        });
        return ctx.badRequest(
          null,
          formatError({
            id: "user.create.error.email.format",
            message: "Please provide valid email address.",
          })
        );
      }

      userValues.email = userValues.email.toLowerCase();

      if (advancedConfigs.unique_email) {
        const userWithSameEmail = await strapi
          .query("user", "users-permissions")
          .findOne({ email: email.toLowerCase() });

        if (userWithSameEmail && userWithSameEmail.id != id) {
          strapi.log.error("Email already taken", {
            id: "user.create.error.email.taken",
          });
          return ctx.badRequest(
            null,
            formatError({
              id: "user.create.error.email.taken",
              message: "Email already taken",
              field: ["email"],
            })
          );
        }
      }
    }

    if (_.has(userValues, "alternateMobileNumber")) {
      if (!alternateMobileNumber) {
        return ctx.badRequest("alternateMobileNumber.notNull");
      }

      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
        userValues.alternateMobileNumber,
        "IN"
      );
      if (
        !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
        phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
      ) {
        strapi.log.error("Please provide a valid alternate mobile number.", {
          id: "user.create.error.alternateMobileNumber.invalid",
        });
        return ctx.badRequest(
          null,
          formatError({
            id: "user.create.error.alternateMobileNumber.invalid",
            message: "Please provide a valid alternate mobile number.",
          })
        );
      }
    }

    let createData = {
      ...userValues,
      username: mobileNumber,
    };

    try {
      const data = await strapi
        .query("user", "users-permissions")
        .create(createData);

      return ctx.send(sanitizeUser(data));
    } catch (err) {
      ctx.badRequest(
        null,
        formatError({
          id: "Auth.signup.error",
          message: err.message,
        })
      );
    }
  },

  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx) {
    if (checkAdminUser(ctx)) {
      strapi.log.error("Cannot update an Admin User.", {
        id: "user.update.error.invalid.action",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "user.update.error.invalid.action",
          message: "Cannot update an Admin User.",
        })
      );
    }

    const ctxUser = ctx.state.user;

    if (!ctxUser) {
      strapi.log.error("No authorization header was found.", {
        id: "user.update.error.auth.header.missing",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "user.update.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    // Check that a user can update own profile only
    if (!checkSelf(ctx)) {
      strapi.log.error("A user can update only self.", {
        id: "user.update.error.invalid.action",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "user.update.error.invalid.action",
          message: "A user can update only self.",
        })
      );
    }

    const userValues = _.pick(ctx.request.body, UPDATE_USER_PROPERTIES);

    const advancedConfigs = await strapi
      .store({
        environment: "",
        type: "plugin",
        name: "users-permissions",
        key: "advanced",
      })
      .get();

    const { id } = ctx.params;
    const { email, alternateMobileNumber } = userValues;

    if (_.has(userValues, "email")) {
      if (!email) {
        return ctx.badRequest("email.notNull");
      }

      if (!emailRegExp.test(email)) {
        strapi.log.error("Please provide valid email address.", {
          id: "user.update.error.email.format",
        });
        return ctx.badRequest(
          null,
          formatError({
            id: "user.update.error.email.format",
            message: "Please provide valid email address.",
          })
        );
      }

      userValues.email = userValues.email.toLowerCase();

      if (advancedConfigs.unique_email) {
        const userWithSameEmail = await strapi
          .query("user", "users-permissions")
          .findOne({ email: email.toLowerCase() });

        if (userWithSameEmail && userWithSameEmail.id != id) {
          strapi.log.error("Email already taken", {
            id: "user.update.error.email.taken",
          });
          return ctx.badRequest(
            null,
            formatError({
              id: "user.update.error.email.taken",
              message: "Email already taken",
              field: ["email"],
            })
          );
        }
      }
    }

    if (_.has(userValues, "alternateMobileNumber")) {
      if (!alternateMobileNumber) {
        return ctx.badRequest("alternateMobileNumber.notNull");
      }

      const phoneNumber = phoneNumberUtil.parseAndKeepRawInput(
        userValues.alternateMobileNumber,
        "IN"
      );
      if (
        !phoneNumberUtil.isValidNumberForRegion(phoneNumber, "IN") ||
        phoneNumberUtil.getNumberType(phoneNumber) !== PhoneNumberType.MOBILE
      ) {
        strapi.log.error("Please provide a valid alternate mobile number.", {
          id: "user.update.error.alternateMobileNumber.invalid",
        });
        return ctx.badRequest(
          null,
          formatError({
            id: "user.update.error.alternateMobileNumber.invalid",
            message: "Please provide a valid alternate mobile number.",
          })
        );
      }
    }

    let updateData = {
      ...userValues,
    };

    const data = await strapi.plugins["users-permissions"].services.user.edit(
      { id },
      updateData
    );

    ctx.send(sanitizeUser(data));
  },
};

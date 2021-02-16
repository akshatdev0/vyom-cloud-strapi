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
  async callback(ctx) {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    if (provider === 'local') {
      if (!_.get(await store.get({ key: 'grant' }), 'email.enabled')) {
        return ctx.badRequest(null, 'This provider is disabled.');
      }

      // The identifier is required.
      if (!params.identifier) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.identifier.provide',
            message: 'Please provide your identifier.',
          })
        );
      }

      // The password is required.
      if (!params.password) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.password.provide',
            message: 'Please provide your password.',
          })
        );
      }

      const query = { provider };
      query.mobileNumber = params.identifier;

      // Check if the user exists.
      const user = await strapi.query('user', 'users-permissions').findOne(query);

      if (!user) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.invalid',
            message: 'Identifier or password invalid.',
          })
        );
      }

      if (user.confirmed !== true) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.mobileNumber.not.confirmed',
            message: 'Your mobile number is not confirmed',
          })
        );
      }

      if (user.blocked === true) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.user.blocked',
            message: 'Your account has been blocked by an administrator',
          })
        );
      }

      // The user never authenticated with the `local` provider.
      if (!user.password) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.password.local',
            message:
              'This user never created a local password.',
          })
        );
      }

      const validPassword = await strapi.plugins[
        'users-permissions'
      ].services.user.validatePassword(params.password, user.password);

      if (!validPassword) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.invalid',
            message: 'Identifier or password invalid.',
          })
        );
      } else {
        ctx.send({
          jwt: strapi.plugins['users-permissions'].services.jwt.issue({
            id: user.id,
          }),
          user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
            model: strapi.query('user', 'users-permissions').model,
          }),
        });
      }
    } else {
      if (!_.get(await store.get({ key: 'grant' }), [provider, 'enabled'])) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.callback.error.provider.disabled',
            message: 'This provider is disabled.',
          })
        );
      }

      // Connect the user with the third-party provider.
      let user, error;
      try {
        [user, error] = await strapi.plugins['users-permissions'].services.providers.connect(
          provider,
          ctx.query
        );
      } catch ([user, error]) {
        return ctx.badRequest(null, error === 'array' ? error[0] : error);
      }

      if (!user) {
        return ctx.badRequest(null, error === 'array' ? error[0] : error);
      }

      ctx.send({
        jwt: strapi.plugins['users-permissions'].services.jwt.issue({
          id: user.id,
        }),
        user: sanitizeEntity(user.toJSON ? user.toJSON() : user, {
          model: strapi.query('user', 'users-permissions').model,
        }),
      });
    }
  },

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
      mobileNumber: ctx.request.body.mobileNumber,
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

      // Todo - Remove sending token here
      ctx.send({
        mobileNumber: user.mobileNumber,
        sent: true,
        token: confirmationToken,
      });
    } catch (err) {
      return ctx.badRequest(null, err);
    }
  },

  async smsConfirmation(ctx) {
    const pluginStore = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    const settings = await pluginStore.get({
      key: 'advanced',
    });

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

    const role = await strapi
      .query('role', 'users-permissions')
      .findOne({ type: settings.default_role }, []);

    if (!role) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.role.notFound',
          message: 'Impossible to find the default role.',
        })
      );
    }

    const confirmedUser = await userService.edit(
      { id: user.id },
      { role: role.id, confirmed: true, confirmationToken: null }
    );

    ctx.send({
      jwt: jwtService.issue({ id: confirmedUser.id }),
      user: sanitizeEntity(confirmedUser, {
        model: strapi.query("user", "users-permissions").model,
      }),
    });
  },

  async createPassword(ctx) {
    const ctxUser = ctx.state.user;

    if (!ctxUser) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.createPassword.error.auth.header.missing",
          message: "No authorization header was found.",
        })
      );
    }

    const params = {
      password: ctx.request.body.password,
    };

    // Password is required.
    if (!params.password) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.createPassword.error.password.provide',
          message: 'Please provide your password.',
        })
      );
    }

    // Throw an error if the password selected by the user
    // contains more than three times the symbol '$'.
    if (strapi.plugins['users-permissions'].services.user.isHashed(params.password)) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.createPassword.error.password.format',
          message: 'Your password cannot contain more than three times the symbol `$`.',
        })
      );
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      id: ctxUser.id
    });
    if (user.password) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.createPassword.error.password.already.created',
          message:
            'Password for this user has already been created.',
        })
      );
    }

    const { user: userService } = strapi.plugins["users-permissions"].services;
    const updatedUser = await userService.edit(
      { id: ctxUser.id },
      { password: params.password }
    );

    ctx.send({
      user: sanitizeEntity(updatedUser, {
        model: strapi.query("user", "users-permissions").model,
      }),
    });
  }
};

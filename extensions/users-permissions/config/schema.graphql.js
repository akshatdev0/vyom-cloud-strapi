"use strict";

const _ = require("lodash");

/**
 * Throws an ApolloError if context body contains a bad request
 * @param contextBody - body of the context object given to the resolver
 * @throws ApolloError if the body is a bad request
 */
function checkBadRequest(contextBody) {
  if (_.get(contextBody, "statusCode", 200) !== 200) {
    const message = _.get(contextBody, "error", "Bad Request");
    const exception = new Error(message);
    exception.code = _.get(contextBody, "statusCode", 400);
    exception.data = contextBody;
    throw exception;
  }
}

module.exports = {
  type: {
    UsersPermissionsPermission: false, // Make this type NOT queriable.
  },
  definition: /* GraphQL */ `
    type UsersPermissionsAuthUser {
      id: ID!
      mobileNumber: String!
      confirmed: Boolean
      blocked: Boolean
      role: UsersPermissionsMeRole
    }

    type UsersPermissionsAuthUserTokenPayload {
      jwt: String
      user: UsersPermissionsAuthUser!
    }

    type UserPermissionsOkPayload {
      ok: Boolean
    }

    type UserPermissionsSendSmsConfirmationPayload {
      mobileNumber: String
      sent: Boolean
      token: String
    }
  `,
  query: "",
  mutation: `
    signIn(input: UsersPermissionsLoginInput!): UsersPermissionsAuthUserTokenPayload!
    signUp(mobileNumber: String!): UserPermissionsOkPayload
    sendSmsConfirmation(mobileNumber: String!): UserPermissionsSendSmsConfirmationPayload
    smsConfirmation(confirmation: String!): UsersPermissionsAuthUserTokenPayload
    createPassword(password: String!): UsersPermissionsAuthUserTokenPayload
  `,
  resolver: {
    Mutation: {
      signIn: {
        resolverOf: "plugins::users-permissions.auth.callback",
        resolver: async (obj, options, { context }) => {
          context.params = {
            ...context.params,
            provider: options.input.provider,
          };
          context.request.body = _.toPlainObject(options.input);

          await strapi.plugins["users-permissions"].controllers.auth.callback(
            context
          );
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      },
      signUp: {
        description:
          "Signup a new user with given mobile number and with the default role",
        resolverOf: "plugins::users-permissions.auth.signup",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options);

          await strapi.plugins["users-permissions"].controllers.auth.signup(
            context
          );
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
      sendSmsConfirmation: {
        description: "Send SMS OTP for mobile number confirmation",
        resolverOf: "plugins::users-permissions.auth.sendSmsConfirmation",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options);

          await strapi.plugins[
            "users-permissions"
          ].controllers.auth.sendSmsConfirmation(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);
          return output;
        },
      },
      smsConfirmation: {
        description: "Confirm mobile number with received SMS OTP",
        resolverOf: "plugins::users-permissions.auth.smsConfirmation",
        resolver: async (obj, options, { context }) => {
          context.query = _.toPlainObject(options);

          await strapi.plugins[
            "users-permissions"
          ].controllers.auth.smsConfirmation(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);

          return {
            user: output.user || output,
            jwt: output.jwt,
          };
        },
      },
      createPassword: {
        description: "Create a new password for current authenticated user",
        resolverOf: "plugins::users-permissions.auth.createPassword",
        resolver: async (obj, options, { context }) => {
          context.request.body = _.toPlainObject(options);

          await strapi.plugins[
            "users-permissions"
          ].controllers.auth.createPassword(context);
          let output = context.body.toJSON
            ? context.body.toJSON()
            : context.body;

          checkBadRequest(output);

          return {
            user: output.user || output,
          };
        },
      },
    },
  },
};

"use strict";

/**
 * salesman.js controller
 *
 * @description: A set of functions called "actions" for managing `Salesman`.
 */

/* eslint-disable no-useless-escape */
const { sanitizeEntity } = require("strapi-utils");

const formatError = (error) => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */
  async create(ctx) {
    const role = await strapi
      .query("role", "users-permissions")
      .findOne({ type: "salesman" });

    if (!role) {
      strapi.log.error("Not able to find the Salesman role.", {
        id: "salesman.create.error.role.notFound",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "salesman.create.error.role.notFound",
          message: "Not able to find the Salesman role.",
        })
      );
    }

    const companyEmployeeID = ctx.request.body.companyEmployee;
    const companyEmployee = await strapi.services["company-employee"].findOne(
      {
        id: companyEmployeeID,
      },
      ["user", "user.id"]
    );

    if (!companyEmployee) {
      strapi.log.error(
        `Not able to find the Company Employee with ID=${companyEmployeeID}.`,
        {
          id: "salesman.create.error.companyEmployeeNotFound",
        }
      );
      return ctx.badRequest(
        null,
        formatError({
          id: "salesman.create.error.companyEmployeeNotFound",
          message: `Not able to find the Company Employee with ID=${companyEmployeeID}.`,
        })
      );
    }

    await strapi
      .query("user", "users-permissions")
      .update(
        { id: companyEmployee.user.id },
        { role: role.id, blocked: false }
      );
    const entity = await strapi.services.salesman.create({
      companyEmployee: companyEmployeeID,
    });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.salesman,
    });
  },
};

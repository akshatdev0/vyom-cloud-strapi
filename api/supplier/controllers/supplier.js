"use strict";

/**
 * supplier.js controller
 *
 * @description: A set of functions called "actions" for managing `Supplier`.
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
      .findOne({ type: "supplier" });

    if (!role) {
      strapi.log.error("Not able to find the Supplier role.", {
        id: "supplier.create.error.role.notFound",
      });
      return ctx.badRequest(
        null,
        formatError({
          id: "supplier.create.error.role.notFound",
          message: "Not able to find the Supplier role.",
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
          id: "supplier.create.error.companyEmployeeNotFound",
        }
      );
      return ctx.badRequest(
        null,
        formatError({
          id: "supplier.create.error.companyEmployeeNotFound",
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
    const entity = await strapi.services.supplier.create({
      companyEmployee: companyEmployeeID,
    });
    return sanitizeEntity(entity.toJSON ? entity.toJSON() : entity, {
      model: strapi.models.supplier,
    });
  },
};

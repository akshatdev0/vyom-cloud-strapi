"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  async find(ctx) {
    let e1;
    if (ctx.query._q) {
      e1 = await strapi.services["product-category"].search(ctx.query);
    } else {
      e1 = await strapi.services["product-category"].find(ctx.query);
    }

    const e2 = [];
    for (let i = 0; i < e1.length; i++) {
      const count = await strapi.services["product-category"].count({
        parentCategory: e1[i].id,
      });
      e2.push({
        ...e1[i],
        hasSubCategories: count > 0,
      });
    }

    return e2.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models["product-category"] })
    );
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    console.log("one");
    const entity = await strapi.services["product-category"].findOne({ id });
    const count = await strapi.services["product-category"].count({
      parentCategory: entity.id,
    });
    entity.hasSubCategories = count > 0;
    return sanitizeEntity(entity, { model: strapi.models["product-category"] });
  },
};

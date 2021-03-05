"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Create a new order with order lines.
   *
   * @return {Object}
   */
  async _create(ctx) {
    // Todo
    // * Put checks
    //   - To restrict the action for shopkeeper's own shop
    //   - To restrict the action for salesman
    //     - to be within this shop's range
    //     - to have been verified by this shop's shopkeeper using OTP

    console.log("params");
    console.log("-----------------");
    console.log(JSON.stringify(ctx.params));
    console.log("xxxxxxxxxxxxxxxxx");
    console.log("body");
    console.log("-----------------");
    console.log(JSON.stringify(ctx.request.body));
    console.log("xxxxxxxxxxxxxxxxx");

    ctx.send({ message: "Hello Order" });
  },
};

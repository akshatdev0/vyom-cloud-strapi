module.exports = {
    query: `
      countProducts(where: JSON): Int!
    `,
    resolver: {
      Query: {
        countProducts: {
          description: 'Return the count of products',
          resolverOf: 'application::product.product.count',
          resolver: async (obj, options, ctx) => {
            return await strapi.api.product.services.product.count(options.where || {});
          },
        },
      },
    },
  };
            
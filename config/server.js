module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'https://api.exilien.cloud'),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '526100d0d704f048b111bda012e12cf2'),
    },
  },
});

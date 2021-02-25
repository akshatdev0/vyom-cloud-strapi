"use strict";

const _ = require("lodash");

/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const DEFAULT_PERMISSIONS = [
  /* Enabled for all roles */
  {
    action: "init",
    controller: "userspermissions",
    type: null,
    roleType: null,
  },
  {
    action: "me",
    controller: "user",
    type: "users-permissions",
    roleType: null,
  },
  { action: "autoreload", controller: null, type: null, roleType: null },

  /* Enabled only for 'public' role */
  {
    action: "callback",
    controller: "auth",
    type: "users-permissions",
    roleType: "public",
  },
  {
    action: "signup",
    controller: "auth",
    type: "users-permissions",
    roleType: "public",
  },
  {
    action: "sendsmsconfirmation",
    controller: "auth",
    type: "users-permissions",
    roleType: "public",
  },
  {
    action: "smsconfirmation",
    controller: "auth",
    type: "users-permissions",
    roleType: "public",
  },

  /* Enabled only for 'authenticated' role */
  {
    action: "createpassword",
    controller: "auth",
    type: "users-permissions",
    roleType: "authenticated",
  },
  {
    action: "create",
    controller: "shopkeeper",
    type: "application",
    roleType: "authenticated",
  },

  /* Enabled only for 'shopkeeper' role */
  // - self
  {
    action: "update",
    controller: "shopkeeper",
    type: "application",
    roleType: "shopkeeper",
  },

  // - shop
  {
    action: "create",
    controller: "shop",
    type: "application",
    roleType: "shopkeeper",
  },
  {
    action: "update",
    controller: "shop",
    type: "application",
    roleType: "shopkeeper",
  },

  // - product
  {
    action: "find",
    controller: "product",
    type: "application",
    roleType: "shopkeeper",
  },

  // - order
  {
    action: "find",
    controller: "order",
    type: "application",
    roleType: "shopkeeper",
  },
];

const isPermissionEnabled = (permission, role) =>
  DEFAULT_PERMISSIONS.some(
    (defaultPerm) =>
      (defaultPerm.action === null ||
        permission.action === defaultPerm.action) &&
      (defaultPerm.controller === null ||
        permission.controller === defaultPerm.controller) &&
      (defaultPerm.type === null || permission.type === defaultPerm.type) &&
      (defaultPerm.roleType === null || role.type === defaultPerm.roleType)
  );

module.exports = {
  async updatePermissions() {
    const { primaryKey } = strapi.query("permission", "users-permissions");
    const roles = await strapi.query("role", "users-permissions").find({}, []);
    const rolesMap = roles.reduce(
      (map, role) => ({ ...map, [role[primaryKey]]: role }),
      {}
    );

    const dbPermissions = await strapi
      .query("permission", "users-permissions")
      .find({ _limit: -1 });
    let permissionsFoundInDB = dbPermissions.map(
      (p) => `${p.type}.${p.controller}.${p.action}.${p.role[primaryKey]}`
    );
    permissionsFoundInDB = _.uniq(permissionsFoundInDB);

    // Aggregate first level actions.
    const appActions = Object.keys(strapi.api || {}).reduce((acc, api) => {
      Object.keys(_.get(strapi.api[api], "controllers", {})).forEach(
        (controller) => {
          const actions = Object.keys(strapi.api[api].controllers[controller])
            .filter((action) =>
              _.isFunction(strapi.api[api].controllers[controller][action])
            )
            .map(
              (action) => `application.${controller}.${action.toLowerCase()}`
            );

          acc = acc.concat(actions);
        }
      );

      return acc;
    }, []);

    // Aggregate plugins' actions.
    const pluginsActions = Object.keys(strapi.plugins).reduce((acc, plugin) => {
      Object.keys(strapi.plugins[plugin].controllers).forEach((controller) => {
        const actions = Object.keys(
          strapi.plugins[plugin].controllers[controller]
        )
          .filter((action) =>
            _.isFunction(strapi.plugins[plugin].controllers[controller][action])
          )
          .map((action) => `${plugin}.${controller}.${action.toLowerCase()}`);

        acc = acc.concat(actions);
      });

      return acc;
    }, []);

    const actionsFoundInFiles = appActions.concat(pluginsActions);

    // create permissions for each role
    let permissionsFoundInFiles = actionsFoundInFiles.reduce(
      (acc, action) => [
        ...acc,
        ...roles.map((role) => `${action}.${role[primaryKey]}`),
      ],
      []
    );
    permissionsFoundInFiles = _.uniq(permissionsFoundInFiles);

    // Compare to know if actions have been added or removed from controllers.
    if (
      !_.isEqual(permissionsFoundInDB.sort(), permissionsFoundInFiles.sort())
    ) {
      const splitted = (str) => {
        const [type, controller, action, roleId] = str.split(".");

        return { type, controller, action, roleId };
      };

      // We have to know the difference to add or remove the permissions entries in the database.
      const toRemove = _.difference(
        permissionsFoundInDB,
        permissionsFoundInFiles
      ).map(splitted);
      const toAdd = _.difference(
        permissionsFoundInFiles,
        permissionsFoundInDB
      ).map(splitted);

      const query = strapi.query("permission", "users-permissions");

      // Execute request to update entries in database for each role.
      await Promise.all(
        toAdd.map((permission) =>
          query.create({
            type: permission.type,
            controller: permission.controller,
            action: permission.action,
            enabled: isPermissionEnabled(
              permission,
              rolesMap[permission.roleId]
            ),
            policy: "",
            role: permission.roleId,
          })
        )
      );

      await Promise.all(
        toRemove.map((permission) => {
          const { type, controller, action, roleId: role } = permission;
          return query.delete({ type, controller, action, role });
        })
      );
    }
  },

  async initialize() {
    const roleCount = await strapi.query("role", "users-permissions").count();

    if (roleCount === 0) {
      await strapi.query("role", "users-permissions").create({
        name: "EDM Admin",
        description: "EDM Master Admin role.",
        type: "edm_admin",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Company Owner",
        description: "Company owner role.",
        type: "company_owner",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Shopkeeper",
        description: "Shopkeeper role.",
        type: "shopkeeper",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Salesman",
        description: "Salesman role.",
        type: "salesman",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Supplier",
        description: "Supplier role.",
        type: "supplier",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Authenticated",
        description: "Default role given to authenticated user.",
        type: "authenticated",
      });

      await strapi.query("role", "users-permissions").create({
        name: "Public",
        description: "Default role given to unauthenticated user.",
        type: "public",
      });
    }

    return this.updatePermissions();
  },
};
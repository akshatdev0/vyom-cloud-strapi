"use strict";

/**
 * User.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  async sendConfirmationSms(user) {
    const confirmationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await this.edit({ id: user.id }, { confirmationToken });

    // Send an sms to the user.
    // await smsService.send();

    return confirmationToken;
  },
};

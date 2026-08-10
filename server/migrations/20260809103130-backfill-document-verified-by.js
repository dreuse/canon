"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE "documents" SET "verifiedById" = "createdById" WHERE "verifiedAt" IS NOT NULL AND "verifiedById" IS NULL`
    );
  },

  async down() {
    return Promise.resolve();
  },
};

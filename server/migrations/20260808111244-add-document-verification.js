"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "documents",
        "verifiedAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "documents",
        "verifiedById",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
          },
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "collections",
        "reviewIntervalDays",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE "documents" SET "verifiedAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL`,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("collections", "reviewIntervalDays", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "verifiedById", {
        transaction,
      });
      await queryInterface.removeColumn("documents", "verifiedAt", {
        transaction,
      });
    });
  },
};

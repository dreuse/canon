"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("collections", "iconStyle", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "pictogram",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("collections", "iconStyle");
  },
};

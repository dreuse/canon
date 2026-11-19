import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { Column, DataType, Table } from "sequelize-typescript";
import IdModel from "./base/IdModel";
import Encrypted from "./decorators/Encrypted";

@Table({ tableName: "github_apps", modelName: "github_app" })
class GitHubApp extends IdModel<
  InferAttributes<GitHubApp>,
  Partial<InferCreationAttributes<GitHubApp>>
> {
  @Column(DataType.INTEGER)
  appId: number;

  @Column(DataType.STRING)
  slug: string;

  @Column(DataType.STRING)
  clientId: string;

  @Column(DataType.BLOB)
  @Encrypted
  clientSecret: string;

  @Column(DataType.BLOB)
  @Encrypted
  webhookSecret: string | null;

  @Column(DataType.BLOB)
  @Encrypted
  privateKey: string;
}

export default GitHubApp;

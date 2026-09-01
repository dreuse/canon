import type { AuthenticationType } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Relation from "./decorators/Relation";

class Event<T extends Model> extends Model {
  static modelName = "Event";

  name: string;

  modelId: string | undefined;

  actorIpAddress: string | null | undefined;

  @Relation(() => Document)
  document: Document;

  documentId: string | undefined;

  @Relation(() => Collection)
  collection: Collection;

  collectionId: string | undefined;

  @Relation(() => User)
  user: User;

  userId: string;

  @Relation(() => User)
  actor: User;

  actorId: string;

  authType: AuthenticationType | null;

  data: Partial<T> | null;

  /** The title of the document this event refers to, denormalized at read time. */
  documentTitle: string | undefined;

  /** The path of the document this event refers to, absent once it is deleted. */
  documentUrl: string | undefined;

  changes: {
    attributes: Partial<T>;
    previous: Partial<T>;
  } | null;
}

export default Event;

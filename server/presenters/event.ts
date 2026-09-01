import type { Event } from "@server/models";
import presentUser from "./user";

export default function presentEvent(event: Event, isAdmin = false) {
  const data = {
    id: event.id,
    name: event.name,
    modelId: event.modelId,
    userId: event.userId,
    actorId: event.actorId,
    authType: event.authType,
    actorIpAddress: event.ip || undefined,
    collectionId: event.collectionId,
    documentId: event.documentId,
    createdAt: event.createdAt,
    data: event.data,
    changes: event.changes || undefined,
    actor: presentUser(event.actor),
    documentTitle: event.document?.titleWithDefault,
    documentUrl: event.document?.deletedAt ? undefined : event.document?.path,
  };

  if (!isAdmin) {
    delete data.changes;
    delete data.actorIpAddress;
  }

  return data;
}

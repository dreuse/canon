import Event from "~/models/Event";
import type RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

// oxlint-disable no-explicit-any -- Event generic must be `any` because the store holds events for all model types
export default class EventsStore extends Store<Event<any>> {
  actions = [RPCAction.List];

  constructor(rootStore: RootStore) {
    super(rootStore, Event);
  }

  /**
   * Retrieves all events for a given document ID
   *
   * @param documentId - The ID of the document to retrieve events for
   * @returns An array of events for the specified document ID
   */
  getByDocumentId = (documentId: string): Event<any>[] =>
    this.orderedData.filter((event) => event.documentId === documentId);

  /**
   * Retrieves all events performed by a given actor, most recent first.
   *
   * @param actorId - The ID of the user who performed the actions
   * @returns An array of events performed by the specified actor
   */
  getByActorId = (actorId: string): Event<any>[] =>
    this.orderedData.filter((event) => event.actorId === actorId);
}

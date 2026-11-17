export function signin(service = "slack"): string {
  return `/auth/${service}`;
}

export function settingsPath(section?: string): string {
  return "/settings" + (section ? `/${section}` : "");
}

export function integrationSettingsPath(id: string): string {
  return `/settings/integrations/${id}`;
}

/**
 * Returns the path to a user's profile screen.
 *
 * @param userId The identifier of the user.
 * @returns The path to the user's profile.
 */
export function userPath(userId: string): string {
  return `/users/${userId}`;
}

/**
 * Returns the public path for a shared model.
 *
 * @param shareId the identifier of the share.
 * @param modelPath an optional path to the model within the share.
 * @param rootShareId the workspace root share id, if the share is served from "/".
 * @returns the path to the shared model.
 */
export function sharedModelPath(
  shareId: string,
  modelPath?: string,
  rootShareId?: string
): string {
  if (shareId === rootShareId) {
    return modelPath ? modelPath : "/";
  }

  return modelPath ? `/s/${shareId}${modelPath}` : `/s/${shareId}`;
}

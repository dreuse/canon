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

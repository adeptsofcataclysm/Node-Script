/** Returns true when the current user arrived via the login page (spectator role). */
export function useRole() {
  const isSpectator = localStorage.getItem("player_role") === "spectator";
  return { isSpectator };
}

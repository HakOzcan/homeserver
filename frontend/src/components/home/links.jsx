export const REPO_URL = "https://github.com/HakOzcan/homeserver";

// Kept in two parts, so bots that scan the page's code for an
// address don't find one. The parts are joined only on a click.
const EMAIL_PARTS = ["hakan.ozcan6217", "gmail.com"];

export function emailAddress() {
    return EMAIL_PARTS.join("@");
}
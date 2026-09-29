// Tint families are declared literally in globals.css (`@layer components`),
// not generated on demand, so building the class name dynamically is safe here
// — Tailwind's content scanner does not need to see the full string.
const AVATAR_TINTS = ['blue', 'green', 'amber', 'red', 'cyan', 'indigo', 'purple'];

/** Stable tint per name, so a given user always gets the same colour. */
function tintFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 99991;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

function initialsFor(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Locally rendered avatar.
 *
 * Replaces the previous `ui-avatars.com` image, which sent the signed-in user's
 * name to a third party on every page load and blocked on a network request.
 */
export default function InitialsAvatar({ name, size = 32, className = '' }) {
  const safeName = name || 'User';

  return (
    <span
      aria-hidden="true"
      className={`tint-${tintFor(safeName)} inline-flex shrink-0 items-center justify-center rounded-full border font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        lineHeight: 1,
      }}
    >
      {initialsFor(safeName)}
    </span>
  );
}

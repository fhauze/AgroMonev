// export function isOnline() {
//   return navigator.onLine;
// }
export async function isOnline() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);

    await fetch("https://www.google.com/favicon.ico", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });

    return true;
  } catch {
    return false;
  }
}

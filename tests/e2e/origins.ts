export const demoPort = Number(process.env.E2E_DEMO_PORT || 3000);
export const publicationPort = Number(process.env.E2E_PUBLIC_PORT || 3001);
export const demoOrigin = `http://127.0.0.1:${demoPort}`;
export const publicationOrigin = `http://127.0.0.1:${publicationPort}`;

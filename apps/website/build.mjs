import { cp, mkdir } from "node:fs/promises";

const here = new URL("./", import.meta.url);
const dist = new URL("dist/", here);
const financeAssets = new URL("../desktop/src/assets/finance/", here);
const samples = new URL("../desktop/src/finance/fixtures/", here);
const assets = new URL("assets/", dist);

await mkdir(assets, { recursive: true });
await Promise.all([
  cp(new URL("src/", here), dist, { recursive: true }),
  ...["wordmark.svg", "mark.svg", "geist.woff2", "dm-sans.ttf", "geist-OFL.txt", "dm-sans-OFL.txt"].map((name) =>
    cp(new URL(name, financeAssets), new URL(name, assets))),
  ...["synthetic-bank-inr.csv", "synthetic-card-inr.csv"].map((name) =>
    cp(new URL(name, samples), new URL(name, assets))),
]);
console.log(`Coinbox website built at ${dist.pathname}`);

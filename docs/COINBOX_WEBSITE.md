# Preview and publish the Coinbox website

The public site explains statement import, includes a worked repayment example, and links to Help. Visitors can download the two synthetic statements. The site can run on any static host and requires no secrets or database.

## Preview locally

From the repository root, with Node.js and the pinned pnpm installed:

```sh
pnpm site:build
python3 -m http.server 4178 --bind 127.0.0.1 --directory apps/website/dist
```

Open [http://127.0.0.1:4178](http://127.0.0.1:4178). Expand the first step in **One purchase. One repayment.** Both sample files should download. Follow **Try this in Coinbox** to the matching section of Help. Stop the preview with Ctrl+C.

## Publish the static build

1. Select the reviewed commit on the default branch.
2. Set the static host's project root to the repository root, build command to `pnpm site:build`, and output directory to `apps/website/dist`. Use Node.js 22 and pnpm 9.15.0.
3. Check the preview URL for the landing page, `/help.html`, and the two sample downloads. Check the Help navigation and download links on a phone and with the keyboard.
4. Connect the public domain and enable HTTPS. Repeat the link checks against the public URL.

Use a static hosting project separate from the private finance server. Publish only the contents of `apps/website/dist`. If the site is hosted below a subpath, configure the host to serve `index.html` there and test the Help and asset URLs under that prefix.

## Update the guide

Edit `apps/website/src/index.html` or `apps/website/src/help.html` and rebuild. The site build copies the shared wordmark, typefaces and license notices, and the same synthetic statement CSVs used by the app. If you change the fixtures, update the worked example and the [desktop walkthrough](PRIVATE_FINANCE.md#try-the-statement-workflow) together. Keep setup commands in the technical guides and task instructions in Help.

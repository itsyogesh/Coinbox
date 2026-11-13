# Prepare Coinbox for release

| Release | Who can use it | What must be ready |
| --- | --- | --- |
| Public site and source preview | Visitors can explore a sample and follow setup from source | Static hosting and HTTPS, reviewed project license and notices, working Help and support links |
| Desktop beta | Testers can install a signed standalone build | Packaged desktop app, signed releases, clean-machine checks, tested restore and documented update or rollback |
| Private mobile web | Invited users can open a workspace in a phone browser | Private host and HTTPS, per-book access, physical iPhone and Android checks |
| Public hosted finance or native mobile | Users sign up for hosting or install a mobile app | Separate product and release work for each surface |

The public site uses synthetic examples and does not accept statement uploads. The first installable beta can be scoped to standalone finance. If the beta also exposes wallet signing, treat wallet recovery and transaction checks as release gates.

## Public site and source

- [ ] Confirm the license text and copyright notices for the source. Review redistributed dependencies and assets.
- [ ] Publish the [static website](COINBOX_WEBSITE.md#publish-the-static-build). Verify the sample downloads, Help, accessibility at phone and desktop widths, and the support route.
- [ ] Name a support owner and a private channel for reporting security issues. Document what data Coinbox stores and when wallet providers, Gmail, and optional local question help are used. Make the privacy notice and support route easy to find.
- [ ] Keep download links off the site until the matching artifacts pass release checks.

## Installable desktop beta

- [ ] Enable Tauri bundling and configure identifiers, icons, and versioning. Review the production content security policy and Tauri capabilities against the screens and commands that ship.
- [ ] Add a version-tag build workflow and verify that it publishes signed artifacts and checksums. For direct macOS distribution, use Developer ID signing and notarization. Add Windows or Linux downloads when their install and upgrade paths pass platform checks.
- [ ] On a clean machine, install the exact artifact, use the two sample statements, match the repayment, check the three ledger entries, export both financial-year CSVs, then back up and restore on a fresh profile.
- [ ] Rehearse an upgrade from the prior version using a populated test workspace. Verify that old data is readable and that the documented recovery path works. If there is an in-app updater, test signed updates and rejected invalid signatures.
- [ ] If wallet signing ships, test recovery and transaction confirmation with disposable wallets and test funds. A finance backup covers finance books, not wallet recovery.
- [ ] Validate supported statement layouts using synthetic or sanitized fixtures. Document tested issuer and statement types. Keep CSV and Excel as the fallback for PDFs that Coinbox cannot read.

[Tauri release pipelines](https://v2.tauri.app/distribute/pipelines/github/) · [macOS signing and notarization](https://v2.tauri.app/distribute/sign/macos/) · [Updater signatures](https://v2.tauri.app/plugin/updater/)

## Private host and phone browsers

- [ ] Follow the [private rollout checks](COINBOX_STATUS.md#private-rollout-checks) on the intended host. Verify Compose startup, HTTPS, persistence after restart, grant removal, and restore to a fresh volume.
- [ ] Test current Safari on a physical iPhone and current Chrome on a physical Android phone. Check access codes, file picking, statement review, exports, and sign-in after reload.
- [ ] Confirm ownership of backups, updates, and incident handling. Keep the private workspace off the public marketing domain.

## Email and later releases

- [ ] Test downloaded email imports with synthetic CSV, Excel, and PDF attachments. Verify the workflow on each platform included in the beta.
- [ ] Before offering live Gmail broadly, test consent, label and sender search, attachment selection, disconnection, and reconnection with a dedicated test mailbox. Review Google's restricted `gmail.readonly` scope requirements for the proposed OAuth client and distribution. Keep downloaded statements and email files as the fallback.
- [ ] Scope native mobile capture, offline drafts, and sync before committing to mobile app store releases.
- [ ] Scope a hosted edition separately, including account isolation, deletion and recovery, incident response, and privacy and operational ownership before accepting anyone’s financial data.

[Google Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) · [Feature and rollout status](COINBOX_STATUS.md)

# README

This project provides a browser extension to generate TOTP´s with.
This extension is currently only developed for Firefox Desktop, but more Browser will be supported soon.

This extension is local first. All the secrets are stored local and all the calculation of the codes is local as well.
Scanning and processing QR-Codes happens all local on your machine.
No data leaves your machine unless you opt-in to syncing it with your firefox-account. (Syncing with firefox account comming soon)
No telemetry data is collect as well. All the magic happens right where you want it to happen.

## Installation

Firefox: The extention can be installed via addons.mozilla.org (https://addons.mozilla.org/de/firefox/addon/2fa-authenticator/)

Chrome / Edge:  The Extension can be installed via chrome web store (https://chromewebstore.google.com/detail/totp-authenticator/aipfbkoohmnbdpbmnpikfohkgmmpmghk)

Opera: Comming Q2-2026

## Usage

The extension provides the ability to generate TOTP´s within Firefox. No need for an extra app on your smartphone or your pc. All the magic happens right where you want it.

## Development

To run the extension during development, make shure to first clone the repository. Ten, in Firefox, go to: about:debugging - This Firefox - load temporary add-on - select `Extension/manifest.json`

## License

The name "TOTP Authenticator" and the project logo are property of the original author.

You may use, modify, and distribute the source code of this project under the MIT License.

However:

- You may not distribute modified versions using the original project name.
- You may not use the official logo without permission.
- Any redistribution must include attribution to the original project and author.
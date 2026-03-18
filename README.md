# README

This project provides a browser extension to generate TOTP´s with.

This extension is local first. All the secrets are stored local and all the calculation of the codes is local as well.
Scanning and processing QR-Codes happens all local on your machine.
No data leaves your machine unless you opt-in to syncing it with your firefox-account. (Syncing with firefox account comming soon)
No telemetry data is collect as well. All the magic happens right where you want it to happen.

## Installation

| Browser   | Install from ... | Notes |
| :-------: | ---------------- | ------ |
| <img src="https://github.com/user-attachments/assets/b0136512-56a5-4856-8c50-4971c957a24f" alt="Get for Firefox"> | <a href="https://addons.mozilla.org/de/firefox/addon/2fa-authenticator/">Firefox Add-ons</a> | Currently only available for Firefox Desktop |
| <img src="https://github.com/user-attachments/assets/5463ef88-873b-4516-8514-5277664cfde7" alt="Get for Chrome"> | <a href="https://chromewebstore.google.com/detail/totp-authenticator/aipfbkoohmnbdpbmnpikfohkgmmpmghk">Chrome Web Store</a> | Should work for all Chromium based browser |
| <img src="https://github.com/user-attachments/assets/3a7569f8-688b-4eb1-a643-8d0fe173aefe" alt="Get for Microsoft Edge"> | <a href="https://chromewebstore.google.com/detail/totp-authenticator/aipfbkoohmnbdpbmnpikfohkgmmpmghk">Chrome Web Store</a> | Available through Chrome Web Store |
| <img src="https://github.com/user-attachments/assets/938f080c-fe64-4e48-8b89-4bfceabb56e6" alt="Get for Opera"> | <a href="https://chromewebstore.google.com/detail/totp-authenticator/aipfbkoohmnbdpbmnpikfohkgmmpmghk">Chrome Web Store</a> | Available through Chrome Web Store |

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

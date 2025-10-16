# Cleaner Clock-In System

A simple clock-in/clock-out web app designed for cleaners with minimal IT experience. The interface is iPad friendly with large buttons for each cleaner and optional barcode scanning using the device camera.

## Features

- Tap a large tile with your name to clock in or out.
- Automatic status detection (no need to choose in/out).
- Optional barcode scanning via the iPad camera.
- Recent activity log for supervisors.
- Data stored locally in JSON files (`data/`).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   npm start
   ```

3. Open a browser (e.g. the iPad Safari) and visit `http://<server-ip>:3000`.

## Managing cleaners

- Edit `data/cleaners.json` to add or remove cleaners.
- Each cleaner needs a unique `id`, a display `name`, and (optionally) a `barcode` value.
- Barcode values should match the numbers encoded in the printed barcode cards.

## Viewing clock-in history

Clock-in/out events are appended to `data/logs.json`. You can copy this file for record keeping or import it into a spreadsheet.

## Notes

- The barcode scanner uses the rear (environment) camera by default.
- If the camera permission is denied, cleaners can still tap their tile to clock in/out.
- For a kiosk setup, add the page to the iPad home screen in "web app" mode so it opens full-screen.

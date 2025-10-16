# Cleaner Clock-In System

A simple clock-in/clock-out web app designed for cleaners with minimal IT experience. The interface is iPad friendly with large buttons for each cleaner. The backend now uses lightweight PHP scripts so it can run on shared hosting providers such as SiteGround.

## Features

- Tap a large tile with your name to clock in or out.
- Automatic status detection (no need to choose in/out).
- Recent activity log for supervisors.
- Passcode protection (default 1562) before the interface can be used.
- Data stored locally in JSON files (`data/`).

## Getting started

1. Serve the `public/` folder with PHP. During development you can use the built-in PHP server:

   ```bash
   php -S localhost:8000 -t public
   ```

2. Open a browser (e.g. the iPad Safari) and visit `http://localhost:8000`.

## Managing cleaners

- Edit `data/cleaners.json` to add or remove cleaners.
- Each cleaner needs a unique `id` and a display `name`.

## Viewing clock-in history

Clock-in/out events are appended to `data/logs.json`. You can copy this file for record keeping or import it into a spreadsheet.

## Manager overview

- Visit `manager.html` to see a manager dashboard that highlights who is clocked in and the time of their last action.
- The list refreshes automatically every minute and can be refreshed manually.

## Deploying to SiteGround shared hosting

1. Upload the contents of the `public/` directory to your SiteGround `public_html` folder.
2. Upload the `data/` directory alongside it and ensure it is writable (`755` or `775` permissions usually work).
3. Access the site via your domain (for example `https://example.com/`) to use the cleaner clock-in screen or `https://example.com/manager.html` for the manager overview.

## Notes

- For a kiosk setup, add the page to the iPad home screen in "web app" mode so it opens full-screen.
- The default passcode is `1562`. Update `public/auth.js` if you need to change it.

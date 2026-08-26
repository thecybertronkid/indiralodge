# 🏨 Indira Lodge PMS - Portable Installation & Setup Guide

This guide explains how to copy, test, and run **Indira Lodge Property Management System** on any computer without needing to run terminal commands manually every time.

---

## 🚀 Option A: 1-Click Automated Setup for a New PC

If you are copying the project folder to a new computer:

1. **Copy the Entire Folder**: Copy the `Indira Lodge` folder to any drive (e.g. `C:\Indira Lodge` or `E:\Indira Lodge`).
2. **Make Sure Node.js is Installed**: Ensure Node.js (LTS version) is installed on the target PC ([download from nodejs.org](https://nodejs.org)).
3. **Run 1-Click Setup**:
   - Double-click **`SETUP_INDIRA_LODGE.bat`**.
   - The setup script will automatically install dependencies, initialize the database, seed default data, create a desktop shortcut, and launch the portal in your browser!

---

## ⚡ Option B: Daily 1-Click Launching (No Terminal Required)

Instead of opening a command prompt and typing `npm run dev` every time:

1. Simply double-click the **`Indira Lodge PMS`** icon created on your **Desktop**.
2. *OR* double-click **`START_INDIRA_LODGE.bat`** inside the project folder.
3. The server will start in the background and automatically open your default browser directly to:
   👉 **`http://localhost:3000`**

---

## 🔄 Option C: Always-On Automatic Boot (Runs Automatically When PC Turns On)

If you want Indira Lodge to **ALWAYS** be running so you can visit `http://localhost:3000` anytime without clicking anything:

1. Double-click **`AUTOSTART_WITH_WINDOWS.bat`**.
2. That's it! Every time the PC powers on, Indira Lodge runs silently in the background. You can bookmark `http://localhost:3000` in your browser and visit it anytime.

---

## 🔑 Default Login Credentials

- **URL**: `http://localhost:3000`
- **Username / Email**: `admin@indiralodge` (or `admin@indiralodge.com`)
- **Password**: `12345678`

---

## 📁 Included Setup Files Summary

| File Name | Purpose |
| :--- | :--- |
| **`SETUP_INDIRA_LODGE.bat`** | **Master Setup Script**: Run this first on any new PC to install dependencies, initialize database, and create shortcuts. |
| **`START_INDIRA_LODGE.bat`** | **1-Click Launcher**: Starts the server in the background and opens `http://localhost:3000` in your browser. |
| **`AUTOSTART_WITH_WINDOWS.bat`** | **Autostart Configurator**: Sets the portal to run automatically on Windows boot. |
| **`CreateDesktopShortcut.vbs`** | Helper script that generates the **Indira Lodge PMS** desktop shortcut icon. |

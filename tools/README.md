# HRMS Portable SDKs Hub

This directory is used to store Portable SDKs (Flutter, JDK, Android Tools) used for building the HRMS mobile application.

## ⚠️ Important: Git Tracking

To keep the repository lightweight and efficient, **most files in this directory are ignored by Git.** 

Large binary files like the Flutter engine, Android build tools, and JDK runtimes should NOT be committed. If you see these files listed as "Untracked" or "Modified" in your Git client, please ensure they are correctly ignored.

## 🚀 Automated Setup

If you are setting up this project for the first time or on a new machine, you can automatically download and configure all required SDKs by running the setup script:

### Windows (PowerShell)
```powershell
.\scripts\setup_envs.ps1
```

This script will:
1. Download the stable versions of **Flutter**, **OpenJDK 17**, and **Android Cmdline Tools**.
2. Extract them into their respective subfolders in this directory.
3. Handle the specific directory nesting required for Android build tools.

## 📁 Directory Structure

After running the setup script, the structure should look like this:

- `flutter/` - Flutter SDK path.
- `jdk17/` - Java Development Kit 17 (used by Gradle).
- `android-sdk/cmdline-tools/latest/` - Android build tools (bin, lib, etc.).

## 🔧 Post-Setup Configuration

Once the tools are downloaded, ensure your `mobile/android/local.properties` or system environment variables point to these paths:

- `sdk.dir=D:/hr/hrms/tools/android-sdk`
- `flutter.sdk=D:/hr/hrms/tools/flutter`

*(Replace the paths above with the absolute path on your machine)*

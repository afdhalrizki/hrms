# Mobile App Release Guide (Flutter)

This document explains the procedures for compiling (building) and distributing the **harikerja ESS** mobile application for various environments, specifically for the Quality Assurance (QA) phase.

Unlike the *Backend* and *Frontend* web systems which are deployed to VPS servers (IDCloudHost/Hostinger/AWS), the mobile application is compiled into an installation package (`.apk` / `.aab` / `.ipa`) that is then distributed directly to testers' devices or uploaded to the *App Store* / *Play Store*.

---

## 🏗 Environment Management via Dart Defines

This application uses Flutter's `--dart-define` feature to detect which URL the application should communicate with during compilation. The API Endpoint and *tenant domain suffix* will automatically change depending on the `APP_ENV` variable value.

| APP_ENV | API Domain (*Backend*) | Purpose |
| :--- | :--- | :--- |
| `dev` | `http://10.0.2.2:8000/api` | Local development on an Android emulator. |
| `qa` | `https://qa.harikerja.com/api` | UAT & Internal Testing environment. |
| `staging` | `https://staging.harikerja.web.id/api` | RC (Release Candidate) version for stress/stability testing. |
| `prod` | `https://harikerja.com/api` | Public release to end-users on App Store / Play Store. |

---

## 📱 Release Guide for the QA Phase

### 1. APK Build Process (Compilation)
The following steps are executed on the developer's local machine (with Flutter SDK v3.19+ configured):

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Fetch *dependencies*:
   ```bash
   flutter pub get
   ```
3. Build the release version with the QA environment parameter (`APP_ENV=qa`):
   ```bash
   # Option 1: Build .apk file (Easy to distribute & share manually)
   flutter build apk --release --dart-define=APP_ENV=qa

   # Option 2: Build App Bundle (If using Google Play Console Internal Testing)
   flutter build appbundle --release --dart-define=APP_ENV=qa
   ```
4. If successful, your installation file will appear in the directory:
   `mobile/build/app/outputs/flutter-apk/app-release.apk`

---

## 📤 Distribution to QA Testers (UAT)

Once you have the `app-release.apk` file, there are three main ways to distribute the app for the QA process.

### Method 1: Manual Installation (Simple & Fast)
You can distribute the APK file manually via:
- **Email** or **WhatsApp**
- **Slack** / **Discord**
- Google Drive link

*Note: Testers must allow installation from 'Unknown Sources' in their Android security settings.*

### Method 2: Firebase App Distribution (Recommended)
This is the industry standard framework for QA distribution.
1. Register your project in the [Firebase Console](https://console.firebase.google.com).
2. Upload the `.apk` file to the **App Distribution** menu.
3. Register the Google accounts/emails of your *tester* team (e.g., `qa@company.com`).
4. Testers will receive a secure link via email to download the app, and they can report *crashes* directly to your Firebase dashboard.

### Method 3: Play Store Internal Testing
If the company requires the application to be tested directly within the Store ecosystem.
1. Upload the App Bundle (`.aab`) format built earlier into the **Google Play Console**.
2. Enter the testers' emails into the *Internal Testers* list, so only they have access to download this specific QA version.

---

## ✅ UAT & QA Validation Process

After a tester successfully installs the `APP_ENV=qa` version, the application will **automatically send all data flows** (Authentication, Face ID/GPS Attendance Records, and Profiles) securely to your QA server (`qa.harikerja.com`).

During this phase:
1. Monitor Server Logs: You can SSH into your QA VPS and run `docker compose logs -f backend` to see the data traffic coming from the testers' mobile devices in *real-time*.
2. Once the *App Version* is final and passes 100% of the tests, you simply repeat the steps above with `APP_ENV=prod` to distribute it to the real environment for end consumers.


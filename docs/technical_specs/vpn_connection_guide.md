# VPN Connection Guide

This guide explains how to connect your device to the HariKerja Private VPN network to securely access the Admin Portal.

---

## 1. Ubuntu Client (Linux)

Ubuntu supports native VPN connections via both GNOME Graphical Interface (GUI) and Terminal (CLI).

### Option A: Via GUI (Ubuntu Settings) - *Recommended*
1. **Install GNOME Plugin (One-time Setup):**
   Open your terminal (`Ctrl + Alt + T`) and execute:
   ```bash
   sudo apt update
   sudo apt install network-manager-openvpn-gnome -y
   sudo systemctl restart NetworkManager
   ```
2. **Import VPN Profile:**
   * Click the connection status menu at the top-right corner of your screen, then click **Settings** (gear icon).
   * Select the **Network** menu from the left panel.
   * Under the **VPN** section, click the **`+` (Add)** button.
   * Click **Import from file...** at the bottom of the dialog.
   * Choose the `.ovpn` configuration file provided by your DevOps team.
3. **Connect:**
   * Click the status menu at the top-right corner again.
   * Select your newly created VPN profile and click **Connect**.

### Option B: Via CLI/Terminal
* **Using OpenVPN (`.ovpn`):**
  ```bash
  sudo apt update && sudo apt install openvpn -y
  sudo openvpn --config /path/to/your_profile.ovpn
  ```
  *(Keep this terminal open while using the VPN. Press `Ctrl + C` to disconnect).*
* **Using WireGuard (`.conf`):**
  ```bash
  sudo apt update && sudo apt install wireguard -y
  sudo cp /path/to/profile.conf /etc/wireguard/wg0.conf
  sudo wg-quick up wg0
  ```
  *(Execute `sudo wg-quick down wg0` to disconnect).*

---

## 2. Windows Client

### Connection Steps (OpenVPN):
1. **Download Client:** Download and install the official [OpenVPN Connect for Windows](https://openvpn.net/client-connect-vpn-for-windows/).
2. **Import Profile:**
   * Launch *OpenVPN Connect*.
   * Select the **File** tab.
   * Drag and drop your `.ovpn` file into the window, or click **Browse** to choose it manually.
3. **Establish Connection:**
   * Click the **Connect** toggle switch (turning from gray to green).
   * Once the icon turns green and the traffic metrics appear, you are connected.

---

## 3. macOS Client

### Connection Steps (OpenVPN):
1. **Download Client:** Download and install the official [OpenVPN Connect for macOS](https://openvpn.net/client-connect-vpn-for-mac-os/).
2. **Import Profile:**
   * Open the *OpenVPN Connect* application from your Launchpad.
   * Import your `.ovpn` file by dragging it into the **File** tab.
3. **Establish Connection:**
   * Click the **Connect** slider button.
   * If a system prompt appears asking for network configuration permissions, click **Allow**. A green status indicates successful connection.

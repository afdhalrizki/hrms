# Downgrade & Transition Guide for QA Server

This document contains step-by-step instructions to downgrade the QA server specifications of the HariKerja HRMS application from the current **8 Cores / 8 GB RAM** (Biznet GIO NEO Lite MM 8.8) to the optimized **2 Cores / 4 GB RAM** (Biznet GIO NEO Lite MM 4.2).

---

## 📌 Why Are We Downgrading?
1. **Reduce Hosting Waste:** Reduces monthly VPS costs by **50% to 75%**.
2. **Workload Alignment:** The QA server is only used for internal manual testing (UAT). The 8 Cores / 8 GB RAM setup is extremely overkill, considering the **Production 1K** server only requires 4 Cores / 8 GB RAM to handle 1,000 active users.
3. **Memory Optimization via Swap:** We use a **4 GB Swap File** to handle temporary memory spikes during Next.js Docker builds, keeping the 4 GB RAM server stable and secure without crashing.

---

## ⚡ Scenario A: Direct In-Place Resize (Same VPS)
*Use this method if your Biznet GIO portal allows direct downgrades on the same instance. Since the storage size remains identical (60 GB SSD), this is usually supported.*

### Step 1: Backup Current QA Database
Before altering any VM configuration, create a database backup and download a copy to your local machine:
```bash
# SSH into the QA server, navigate to the project root
cd /opt/hrms

# Run the automatic backup script
./deploy/qa/backup_qa.sh
```
*Note:* Download the `.sql.gz` backup file from the `/opt/hrms/backups/` folder using SFTP (e.g., FileZilla) or `scp` to your local machine for safety.

### Step 2: Stop the VM Instance
1. Log into your **Biznet GIO** portal.
2. Open the control panel for the `harikerja-qa` VM.
3. Select **Stop** / **Power Off** and wait until the instance status changes to *Stopped*.

### Step 3: Resize the Instance
1. In the instance details panel, select **Resize** or **Change Package**.
2. Choose the **NEO Lite MM 4.2** package (2 Cores, 4 GB RAM, 60 GB SSD).
3. Confirm the package specification changes.

### Step 4: Restart the Server
1. Start the VM again (**Start** / **Power On**).
2. Connect back to the VPS via SSH once it is running.

### Step 5: Configure 4 GB Swap Memory (Mandatory)
It is absolutely critical to set up a 4 GB swap file to prevent the server from running out of memory (OOM) during Next.js builds:
```bash
# Allocate 4 Gigabytes for the swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make the swap permanent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 6: Redeploy the Application
Pull the latest code updates (which contain the optimized container resource limits suited for a 4 GB host) and deploy:
```bash
cd /opt/hrms
git pull
./deploy/qa/deploy_qa.sh
```
Verify that all containers are running successfully using `docker ps`.

---

## 💾 Scenario B: Full Migration to a New VPS
*Use this method if the Biznet GIO billing rules do not allow direct downgrade on an active contract, or if you wish to achieve zero downtime during the transition process.*

### Step 1: Backup and Download Database
Run the backup script on the old QA VPS, and download the backup file to your computer:
```bash
cd /opt/hrms
./deploy/qa/backup_qa.sh
```

### Step 2: Provision the New VPS
1. Create a new VPS instance in the Biznet GIO portal using the **NEO Lite MM 4.2** package (2 Cores, 4 GB RAM, 60 GB SSD).
2. Record the **New Public IP Address** of this server.

### Step 3: Setup the New Server
Prepare the new server by following the primary deployment guide in [deploy/qa/qa.md](file:///home/afdhal/data/hr/hrms/deploy/qa/qa.md):
* **Mandatory:** Configure the 4 GB Swap file (see Step 5 in Scenario A).
* Install basic utilities, Docker, Docker Compose, Nginx, and Certbot.
* Create the `/opt/hrms` directory and clone your code repository.

### Step 4: Transfer Backups & Media to the New VPS
Send the database backup `.sql.gz` file from the old VPS to the `/opt/hrms/backups/` folder on the new VPS using `scp`:
```bash
# Run this from your old VPS:
scp /opt/hrms/backups/qa_backup_xxxx.sql.gz user@<NEW_VPS_IP>:/opt/hrms/backups/
```
*Tip:* If you want to keep existing user uploads from testing, transfer the `/opt/hrms/backend/media/` directory to the new server as well.

### Step 5: Restore the Database on the New VPS
1. SSH into the new VPS.
2. Prepare the environment file `.env.local` inside the `environments/` directory.
3. Start the database container only:
   ```bash
   cd /opt/hrms
   docker compose -f deploy/qa/docker-compose.qa.yml --env-file deploy/environments/.env.qa up -d db
   ```
4. Wait a few seconds for the database to initiate, then restore the backup:
   ```bash
   gunzip -c /opt/hrms/backups/qa_backup_xxxx.sql.gz | docker exec -i hrms-db-qa psql -U hrms_qa_user -d hrms_qa
   ```

### Step 6: Complete the Initial Deployment
Run the safe deployment script to compile the frontend, backend, and background workers:
```bash
./deploy/qa/deploy_qa.sh
```
Ensure the smoke test returns HTTP 200 at the end of the script execution.

### Step 7: Update DNS & SSL Certificates
1. Log into your **NEO DNS Manager** in the Biznet GIO portal.
2. Select the `harikerja.web.id` domain.
3. Update the IP addresses in the **A Records** (`@` and `*`) to point to your **New VPS IP**.
4. Generate the new Wildcard SSL certificate using Certbot:
   ```bash
   sudo certbot certonly --manual --preferred-challenges=dns --email admin@harikerja.web.id --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d harikerja.web.id -d *.harikerja.web.id
   ```
   Add the new TXT challenge record to the DNS manager, wait a minute, and press enter.

### Step 8: Terminate the Old VPS
Verify the application by visiting `https://harikerja.web.id` and testing various tenant subdomains. Once everything is verified and confirmed working, you can safely delete/terminate the old `NEO Lite MM 8.8` VPS inside the Biznet portal to stop billing.

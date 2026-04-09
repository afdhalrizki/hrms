from locust import HttpUser, task, between

class HRMSUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def access_dashboard(self):
        # Emulate 1 million users checking their dashboard
        self.client.get("/api/attendance/my-summary/", headers={"X-Tenant": "company1"})

    @task
    def check_in(self):
        # Emulate heavy morning clock-in spike
        self.client.post("/api/attendance/check-in/", json={
            "latitude": -6.200000,
            "longitude": 106.816666
        }, headers={"X-Tenant": "company1"})

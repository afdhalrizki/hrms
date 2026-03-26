$env:DB_HOST='localhost'
$env:DB_PORT='5432'
$env:DB_USER='hrms_user'
$env:DB_PASSWORD='hrms_password'
$env:DB_NAME='hrms'
$env:REDIS_URL='redis://localhost:6379/1'
d:\hr\hrms\backend\venv\Scripts\python.exe -m pytest users/tests/test_users.py

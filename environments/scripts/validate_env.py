import os

def validate_env(example_path, env_path):
    """
    Checks if all keys in the example file are present in the actual .env file.
    """
    if not os.path.exists(env_path):
        print(f"Error: .env file not found at {env_path}")
        return False

    with open(example_path, 'r') as f:
        required_keys = [line.split('=')[0].strip() for line in f if '=' in line and not line.startswith('#')]

    with open(env_path, 'r') as f:
        existing_keys = [line.split('=')[0].strip() for line in f if '=' in line and not line.startswith('#')]

    missing = [key for key in required_keys if key not in existing_keys]
    
    if missing:
        print(f"Validation Failed! Missing keys in .env:")
        for key in missing:
            print(f" - {key}")
        return False
    
    print("Validation Successful: All required keys are present.")
    return True

if __name__ == "__main__":
    # Logic to find path and validate
    pass

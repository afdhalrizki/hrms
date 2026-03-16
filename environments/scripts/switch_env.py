import sys
import os
import shutil

def switch_env(env_name):
    """
    Switches the current .env file to the specified environment.
    Example: python switch_env.py development
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    root_dir = os.path.dirname(base_dir)
    env_dir = os.path.join(base_dir)
    
    source = os.path.join(env_dir, f".env.{env_name}.example")
    target = os.path.join(root_dir, ".env")
    
    if not os.path.exists(source):
        print(f"Error: Environment template '{source}' not found.")
        print(f"Available: development, staging, production")
        return

    try:
        shutil.copy2(source, target)
        print(f"Successfully switched to '{env_name}' environment.")
        print(f"Created: {target}")
    except Exception as e:
        print(f"Error copying file: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python switch_env.py [development|staging|production]")
    else:
        switch_env(sys.argv[1])
